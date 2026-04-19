"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import Link from "next/link";

interface ServiceIssue {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  isActive: boolean;
  sortOrder: number;
}

interface Service {
  id: string;
  name: string;
  basePrice: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  category: { name: string };
}

const EMPTY_ISSUE = { name: "", description: "", basePrice: 0, minPrice: 0, maxPrice: 0 };

export default function ServiceIssuesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [issues, setIssues] = useState<ServiceIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIssue, setNewIssue] = useState(EMPTY_ISSUE);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/services/${id}`).then((r) => r.json()),
      fetch(`/api/services/${id}/issues`).then((r) => r.json()),
    ]).then(([svc, iss]) => {
      setService(svc.data);
      setIssues(iss.data ?? []);
      setLoading(false);
    });
  }, [id]);

  const handleAddIssue = async () => {
    if (!newIssue.name || !newIssue.basePrice) {
      toast({ variant: "destructive", title: "Fill in name and price" });
      return;
    }
    setSaving("new");
    try {
      const res = await fetch(`/api/admin/services/${id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIssue),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setIssues((prev) => [...prev, json.data]);
      setNewIssue(EMPTY_ISSUE);
      setShowAddForm(false);
      toast({ variant: "success", title: "Issue added!" });
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (issue: ServiceIssue) => {
    setSaving(issue.id);
    await fetch(`/api/admin/services/${id}/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !issue.isActive }),
    });
    setIssues((prev) => prev.map((i) => i.id === issue.id ? { ...i, isActive: !i.isActive } : i));
    setSaving(null);
  };

  const handleDelete = async (issueId: string) => {
    if (!confirm("Delete this issue?")) return;
    setSaving(issueId);
    await fetch(`/api/admin/services/${id}/issues/${issueId}`, { method: "DELETE" });
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
    setSaving(null);
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/services">
          <button className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{service?.name} — Issues & Pricing</h1>
          <p className="text-sm text-muted-foreground">{service?.category.name} · Base price: {formatCurrency(Number(service?.basePrice ?? 0))}</p>
        </div>
      </div>

      {/* Service pricing range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Service Price Range (shown to customers)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Base Price", value: service?.basePrice ?? 0 },
              { label: "Min Price", value: service?.minPrice ?? service?.basePrice ?? 0 },
              { label: "Max Price", value: service?.maxPrice ?? service?.basePrice ?? 0 },
            ].map((p) => (
              <div key={p.label} className="text-center">
                <p className="text-lg font-bold text-brand-700">{formatCurrency(Number(p.value))}</p>
                <p className="text-xs text-muted-foreground">{p.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Issues list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Issue Types ({issues.length})</h2>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Issue
          </Button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <Card className="mb-4 border-brand-200 bg-brand-50">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-medium text-sm">New Issue</h3>
              <input
                placeholder="Issue name (e.g. Leaking tap)"
                value={newIssue.name}
                onChange={(e) => setNewIssue((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                placeholder="Short description (optional)"
                value={newIssue.description}
                onChange={(e) => setNewIssue((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
              />
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Base Price (Rs)", key: "basePrice" as const },
                  { label: "Min Price (Rs)", key: "minPrice" as const },
                  { label: "Max Price (Rs)", key: "maxPrice" as const },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <input
                      type="number"
                      value={newIssue[f.key] || ""}
                      onChange={(e) => setNewIssue((prev) => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 mt-0.5"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddIssue} loading={saving === "new"}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Save Issue
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewIssue(EMPTY_ISSUE); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {issues.map((issue) => (
            <Card key={issue.id} className={!issue.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{issue.name}</p>
                      <Badge variant={issue.isActive ? "success" : "secondary"}>
                        {issue.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                    {issue.description && <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-700">{formatCurrency(issue.basePrice)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(issue.minPrice)}–{formatCurrency(issue.maxPrice)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleActive(issue)}
                      disabled={saving === issue.id}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      <CheckCircle className={`h-4 w-4 ${issue.isActive ? "text-brand-600" : "text-gray-400"}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(issue.id)}
                      disabled={saving === issue.id}
                      className="p-1.5 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {issues.length === 0 && !showAddForm && (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <DollarSign className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No issues defined yet</p>
              <p className="text-xs text-muted-foreground mb-4">Define issue types with pricing so customers can get instant estimates</p>
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add First Issue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
