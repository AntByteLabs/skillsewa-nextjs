"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/useToast";
import Link from "next/link";

interface Category { id: string; name: string; code: string; }

export default function NewServicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    categoryId: searchParams.get("category") ?? "",
    name: "",
    description: "",
    basePrice: "",
    minPrice: "",
    maxPrice: "",
    priceUnit: "per_visit",
    durationMin: "60",
    isFeatured: false,
    isActive: true,
  });

  useEffect(() => {
    fetch("/api/services/categories").then((r) => r.json()).then((d) => setCategories(d.data ?? []));
  }, []);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId || !form.name || !form.basePrice) {
      toast({ variant: "destructive", title: "Fill in all required fields" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basePrice: parseFloat(form.basePrice),
          minPrice: form.minPrice ? parseFloat(form.minPrice) : undefined,
          maxPrice: form.maxPrice ? parseFloat(form.maxPrice) : undefined,
          durationMin: parseInt(form.durationMin),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ variant: "success", title: "Service created!" });
      router.push(`/admin/services/${json.data.id}/issues`);
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/services">
          <button className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
        </Link>
        <h1 className="text-xl font-bold">Add New Service</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-sm">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Category *</label>
              <select
                value={form.categoryId}
                onChange={update("categoryId")}
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Service Name *</label>
              <input
                placeholder="e.g. Tap Repair"
                value={form.name}
                onChange={update("name")}
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Description</label>
              <textarea
                placeholder="Brief description of the service..."
                value={form.description}
                onChange={update("description")}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">Price Unit</label>
                <select value={form.priceUnit} onChange={update("priceUnit")} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="per_visit">Per Visit</option>
                  <option value="per_hour">Per Hour</option>
                  <option value="per_unit">Per Unit</option>
                  <option value="per_sqft">Per Sq. Ft.</option>
                  <option value="per_room">Per Room</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Duration (minutes)</label>
                <input
                  type="number"
                  placeholder="60"
                  value={form.durationMin}
                  onChange={update("durationMin")}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Pricing (Rs)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Base Price *", key: "basePrice", hint: "Default estimate" },
                { label: "Min Price", key: "minPrice", hint: "Lowest possible" },
                { label: "Max Price", key: "maxPrice", hint: "Highest possible" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-sm font-medium block mb-1">{f.label}</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form[f.key as keyof typeof form] as string}
                    onChange={update(f.key as keyof typeof form)}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{f.hint}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Active (visible to customers)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Featured on homepage</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          <Save className="h-4 w-4 mr-2" /> Create Service
        </Button>
      </form>
    </div>
  );
}
