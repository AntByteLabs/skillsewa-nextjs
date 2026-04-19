"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, XCircle, Clock, FileText, Plus, Pencil,
  ToggleLeft, ToggleRight, Trash2, Grid3x3, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SkillRequest {
  id: string;
  status: string;
  yearsExp: number;
  documentUrl: string | null;
  adminNote: string | null;
  createdAt: string;
  category: { name: string; code: string };
  professional: { id: string; user: { name: string; phone: string } };
}

interface Category {
  id: string;
  code: string;
  name: string;
  nameNp: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { services: number; professionals: number; skillRequests: number };
}

const ICON_OPTIONS = [
  "🔧","⚡","🚿","🎨","🪚","🌿","🚛","❄️","📺","✂️","📦","🏠","🧹","💡","🔩","🛠️","🪣","🧱","🪟","🚪"
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminSkillsPage() {
  const [tab, setTab] = useState<"requests" | "categories">("requests");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skills & Categories</h1>
          <p className="text-muted-foreground">Manage skill categories and professional approvals</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("requests")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "requests" ? "bg-white shadow-sm text-brand-700" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Skill Requests
        </button>
        <button
          onClick={() => setTab("categories")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "categories" ? "bg-white shadow-sm text-brand-700" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Manage Categories
        </button>
      </div>

      {tab === "requests" ? <SkillRequestsTab /> : <CategoriesTab />}
    </div>
  );
}

// ── Tab 1: Skill Requests ─────────────────────────────────────────────────────
function SkillRequestsTab() {
  const [requests, setRequests] = useState<SkillRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; action: "APPROVED" | "REJECTED" } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/skills?status=${filter}`, { credentials: "include" });
    const json = await res.json();
    setRequests(json.data ?? []);
    setTotal(json.meta?.total ?? 0);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async () => {
    if (!modal) return;
    setReviewing(modal.id);
    try {
      const res = await fetch(`/api/admin/skills/${modal.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: modal.action, adminNote: adminNote || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRequests(prev => prev.filter(r => r.id !== modal.id));
      setModal(null); setAdminNote("");
      toast({ variant: "success", title: modal.action === "APPROVED" ? "Skill approved!" : "Skill rejected." });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: (err as Error).message });
    } finally { setReviewing(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["PENDING", "APPROVED", "REJECTED", "ALL"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s} {filter === s && total > 0 && `(${total})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : requests.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-muted-foreground">No {filter.toLowerCase()} skill requests</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold shrink-0">
                      {req.professional.user.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{req.professional.user.name}</p>
                      <p className="text-xs text-muted-foreground">{req.professional.user.phone}</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <p className="text-sm font-medium">{req.category.name}</p>
                    <p className="text-xs text-muted-foreground">{req.yearsExp} yrs experience · Submitted {formatDate(req.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <Badge variant={req.status === "APPROVED" ? "success" : req.status === "REJECTED" ? "destructive" : "pending"}>
                      {req.status}
                    </Badge>
                    {req.documentUrl && (
                      <a href={req.documentUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline border border-brand-200 rounded-lg px-2.5 py-1.5">
                        <FileText className="h-3.5 w-3.5" /> View Doc
                      </a>
                    )}
                    {req.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs"
                          onClick={() => { setModal({ id: req.id, action: "APPROVED" }); setAdminNote(""); }}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                          onClick={() => { setModal({ id: req.id, action: "REJECTED" }); setAdminNote(""); }}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {req.adminNote && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                    Admin note: <span className="text-gray-700">{req.adminNote}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">{modal.action === "APPROVED" ? "Approve Skill" : "Reject Skill"}</h3>
            <p className="text-sm text-muted-foreground">
              {modal.action === "APPROVED"
                ? "Professional will be auto-assigned matching jobs."
                : "Professional can re-apply with correct documents."}
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Note to professional (optional)</label>
              <textarea rows={3} value={adminNote} onChange={e => setAdminNote(e.target.value)}
                placeholder={modal.action === "APPROVED" ? "e.g. Certificate verified. Welcome aboard!" : "e.g. Please upload a clearer photo."}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button className={`flex-1 ${modal.action === "APPROVED" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                onClick={handleReview} disabled={reviewing !== null}>
                {reviewing ? "Saving..." : modal.action === "APPROVED" ? "Confirm Approve" : "Confirm Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Categories Management ──────────────────────────────────────────────
function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("🔧");

  const [form, setForm] = useState({
    code: "", name: "", nameNp: "", description: "", sortOrder: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/categories?includeInactive=true", { credentials: "include" });
    const json = await res.json();
    setCategories(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ code: "", name: "", nameNp: "", description: "", sortOrder: 0 });
    setSelectedIcon("🔧");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (cat: Category) => {
    setForm({
      code: cat.code,
      name: cat.name,
      nameNp: cat.nameNp ?? "",
      description: cat.description ?? "",
      sortOrder: cat.sortOrder,
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast({ variant: "destructive", title: "Code and name are required" });
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories";
      const method = editingId ? "PATCH" : "POST";
      const payload = editingId
        ? { name: form.name, nameNp: form.nameNp || undefined, description: form.description || undefined, sortOrder: form.sortOrder }
        : { ...form, nameNp: form.nameNp || undefined, description: form.description || undefined };

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast({ variant: "success", title: editingId ? "Category updated" : "Category created" });
      resetForm();
      load();
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat: Category) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isActive: !c.isActive } : c));
      toast({ variant: "success", title: cat.isActive ? "Category deactivated" : "Category activated" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update" });
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete "${cat.name}"? This will remove it if it has no linked services.`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast({ variant: "success", title: json.data?.message ?? "Deleted" });
      load();
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} categories total</p>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <Card className="border-brand-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{editingId ? "Edit Category" : "New Skill Category"}</h3>
              <button onClick={resetForm} className="text-muted-foreground hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                  disabled={!!editingId}
                  placeholder="e.g. plumbing, electrical"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-gray-50 disabled:text-muted-foreground font-mono"
                />
                <p className="text-xs text-muted-foreground">Unique slug, lowercase letters/underscores only</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Name (English) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Plumbing Services"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Name (Nepali) <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={form.nameNp}
                  onChange={e => setForm(f => ({ ...f, nameNp: e.target.value }))}
                  placeholder="e.g. प्लम्बिङ सेवा"
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of what this category covers..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 resize-none"
              />
            </div>

            {!editingId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`text-xl w-10 h-10 rounded-lg border-2 transition-all ${
                        selectedIcon === icon ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} loading={saving} className="flex-1">
                {editingId ? "Save Changes" : "Create Category"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories list */}
      {loading ? (
        <div className="grid gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Grid3x3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No categories yet</p>
          <p className="text-sm text-muted-foreground">Add your first skill category to get started</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {categories.map(cat => (
            <Card key={cat.id} className={`transition-shadow hover:shadow-sm ${!cat.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <span className="text-lg">🔧</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{cat.name}</p>
                      {cat.nameNp && <span className="text-sm text-muted-foreground">{cat.nameNp}</span>}
                      {!cat.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{cat.code}</p>
                    {cat.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cat.description}</p>}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex gap-4 text-center">
                      <div>
                        <p className="text-sm font-bold">{cat._count.services}</p>
                        <p className="text-xs text-muted-foreground">Services</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{cat._count.professionals}</p>
                        <p className="text-xs text-muted-foreground">Pros</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{cat._count.skillRequests}</p>
                        <p className="text-xs text-muted-foreground">Requests</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-2 text-muted-foreground hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(cat)}
                        className="p-2 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title={cat.isActive ? "Deactivate" : "Activate"}
                      >
                        {cat.isActive
                          ? <ToggleRight className="h-5 w-5 text-brand-600" />
                          : <ToggleLeft className="h-5 w-5 text-gray-400" />
                        }
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
