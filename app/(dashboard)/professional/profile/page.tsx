"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { Upload, Plus, CheckCircle, Clock, XCircle, Briefcase, Phone, Mail, MapPin, Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/useToast";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";

interface Category { id: string; name: string; code: string; }
interface SkillReq { id: string; status: string; yearsExp: number; documentUrl: string | null; category: Category; adminNote: string | null; }
interface ProProfile {
  id: string; name: string; phone: string; email: string | null; city: string | null;
  createdAt: string; isVerified: boolean;
  professional: {
    id: string; grade: string; ratingAvg: number; ratingCount: number;
    jobsCompleted: number; responseRate: number; loyaltyMonths: number;
    isVerified: boolean; bio: string | null;
    skillCategories: { id: string; yearsExp: number; category: Category }[];
  };
  wallet: { availableBalance: number; lockedBalance: number; lifetimeEarned: number } | null;
}

const GRADE_COLORS: Record<string, string> = {
  BRONZE: "text-amber-700 bg-amber-50", SILVER: "text-gray-600 bg-gray-100",
  GOLD: "text-yellow-700 bg-yellow-50", PLATINUM: "text-cyan-700 bg-cyan-50", ELITE: "text-purple-700 bg-purple-50",
};

export default function ProfessionalProfilePage() {
  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skillRequests, setSkillRequests] = useState<SkillReq[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoryId: "", yearsExp: 1 });
  const [docUrl, setDocUrl] = useState("");
  const [docName, setDocName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [p, c, s] = await Promise.all([
      fetch("/api/professional/profile", { credentials: "include" }).then(r => r.json()),
      fetch("/api/services/categories").then(r => r.json()),
      fetch("/api/professional/skills", { credentials: "include" }).then(r => r.json()),
    ]);
    if (p.success) setProfile(p.data);
    setCategories(c.data ?? []);
    if (s.success) setSkillRequests(s.data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDocUrl(json.data.url);
      setDocName(file.name);
      toast({ variant: "success", title: "Document uploaded" });
    } catch (err) {
      toast({ variant: "destructive", title: "Upload failed", description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.categoryId) { toast({ variant: "destructive", title: "Select a skill category" }); return; }
    if (!docUrl) { toast({ variant: "destructive", title: "Upload a document first" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/professional/skills", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, documentUrl: docUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSkillRequests(prev => [json.data, ...prev]);
      setShowForm(false); setForm({ categoryId: "", yearsExp: 1 }); setDocUrl(""); setDocName("");
      toast({ variant: "success", title: "Request submitted", description: "Admin will review your document and approve the skill." });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: (err as Error).message });
    } finally { setSubmitting(false); }
  };

  if (!profile) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
    </div>
  );

  const pro = profile.professional;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>

      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarFallback className="text-2xl bg-brand-100 text-brand-700">{getInitials(profile.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-xl font-bold">{profile.name}</h2>
                {profile.isVerified && <span className="text-xs text-brand-600 bg-brand-50 rounded-full px-2.5 py-1 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Verified</span>}
                <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${GRADE_COLORS[pro.grade] ?? ""}`}>{pro.grade}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>
                {profile.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{profile.email}</span>}
                {profile.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.city}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined {formatDate(profile.createdAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Rating", value: `${pro.ratingAvg.toFixed(1)} ★`, sub: `${pro.ratingCount} reviews` },
          { label: "Jobs Done", value: pro.jobsCompleted, sub: "completed" },
          { label: "Response", value: `${pro.responseRate.toFixed(0)}%`, sub: "response rate" },
          { label: "Loyalty", value: `${pro.loyaltyMonths}mo`, sub: "on platform" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-brand-700">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Skills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Skills &amp; Expertise</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
              <Plus className="h-4 w-4 mr-1" /> Request Skill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Approved skills */}
          {pro.skillCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pro.skillCategories.map(sc => (
                <div key={sc.id} className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium">{sc.category.name}</span>
                  <span className="text-xs text-muted-foreground">{sc.yearsExp}yr exp</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No approved skills yet. Submit a request below.</p>
          )}

          {/* Pending / rejected requests */}
          {skillRequests.filter(r => r.status !== "APPROVED").length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Skill Requests</p>
              {skillRequests.filter(r => r.status !== "APPROVED").map(req => (
                <div key={req.id} className="flex items-center justify-between rounded-xl border px-4 py-3 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {req.status === "PENDING" && <Clock className="h-4 w-4 text-orange-500 shrink-0" />}
                    {req.status === "REJECTED" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                    <span className="text-sm font-medium truncate">{req.category.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{req.yearsExp}yr exp</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={req.status === "PENDING" ? "pending" : "destructive"}>{req.status}</Badge>
                    {req.documentUrl && (
                      <a href={req.documentUrl} target="_blank" className="text-xs text-brand-600 hover:underline">View Doc</a>
                    )}
                  </div>
                </div>
              ))}
              {skillRequests.find(r => r.status === "REJECTED" && r.adminNote) && (
                <p className="text-xs text-red-600 px-1">
                  Admin note: {skillRequests.find(r => r.status === "REJECTED")?.adminNote}
                </p>
              )}
            </div>
          )}

          {/* Request form */}
          {showForm && (
            <div className="border rounded-xl p-4 space-y-4 bg-gray-50 mt-2">
              <p className="font-semibold text-sm">Submit Skill Request</p>
              <div className="space-y-1">
                <label className="text-xs font-medium">Skill / Service Category *</label>
                <select
                  value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                >
                  <option value="">Select skill...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Years of Experience</label>
                <input
                  type="number" min={0} max={50} value={form.yearsExp}
                  onChange={e => setForm(f => ({ ...f, yearsExp: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Certificate / ID Document * (JPG, PNG, PDF — max 5MB)</label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-gray-100 transition-colors">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Choose File"}
                  </div>
                  {docName && <span className="text-xs text-green-600 font-medium truncate">&#10003; {docName}</span>}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmit} disabled={submitting || uploading}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setDocUrl(""); setDocName(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet */}
      {profile.wallet && (
        <Card>
          <CardHeader><CardTitle className="text-base">Wallet Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-lg font-bold text-green-600">{formatCurrency(profile.wallet.availableBalance)}</p><p className="text-xs text-muted-foreground">Available</p></div>
              <div><p className="text-lg font-bold text-orange-600">{formatCurrency(profile.wallet.lockedBalance)}</p><p className="text-xs text-muted-foreground">Locked Bonus</p></div>
              <div><p className="text-lg font-bold">{formatCurrency(profile.wallet.lifetimeEarned)}</p><p className="text-xs text-muted-foreground">Lifetime Earned</p></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
