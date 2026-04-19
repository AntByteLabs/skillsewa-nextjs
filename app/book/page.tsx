"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowLeft, ArrowRight, CheckCircle, MapPin, Calendar, Clock, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/useToast";

interface ServiceCategory { id: string; code: string; name: string; iconUrl?: string | null; }
interface Service { id: string; name: string; description?: string | null; basePrice: number; minPrice?: number | null; maxPrice?: number | null; isFeatured: boolean; category: ServiceCategory; }
interface ServiceIssue { id: string; name: string; description?: string | null; basePrice: number; minPrice: number; maxPrice: number; }

const EMOJI_MAP: Record<string, string> = {
  plumbing: "🔧", electrical: "⚡", cleaning: "🧹", painting: "🎨",
  carpentry: "🪚", gardening: "🌿", moving: "🚛", ac_service: "❄️",
};

function BookPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [issues, setIssues] = useState<ServiceIssue[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [estimate, setEstimate] = useState<number>(0);
  const [searchQ, setSearchQ] = useState(searchParams.get("q") ?? "");

  const [form, setForm] = useState({
    addressLine: user?.address ?? "",
    scheduledAt: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Load categories
  useEffect(() => {
    fetch("/api/services/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []));
  }, []);

  // Load services when category changes
  const loadServices = useCallback(async (categoryId: string) => {
    setLoading(true);
    const res = await fetch(`/api/services?categoryId=${categoryId}`);
    const data = await res.json();
    setServices(data.data ?? []);
    setLoading(false);
  }, []);

  // Load issues when service changes
  const loadIssues = useCallback(async (serviceId: string) => {
    setLoading(true);
    const res = await fetch(`/api/services/${serviceId}/issues`);
    const data = await res.json();
    setIssues(data.data ?? []);
    setLoading(false);
  }, []);

  // Calculate estimate
  useEffect(() => {
    const selected = issues.filter((i) => selectedIssues.has(i.id));
    const total = selected.reduce((s, i) => s + i.basePrice, 0);
    setEstimate(total > 0 ? total : Number(selectedService?.minPrice ?? selectedService?.basePrice ?? 0));
  }, [selectedIssues, issues, selectedService]);

  const handleSelectService = async (service: Service) => {
    setSelectedService(service);
    setSelectedIssues(new Set());
    await loadIssues(service.id);
    setStep(2);
  };

  const toggleIssue = (issueId: string) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      // Store the current state in sessionStorage so we can return after login
      router.push("/login?redirect=/book");
      return;
    }
    if (!selectedService) return;
    if (!form.addressLine) {
      toast({ variant: "destructive", title: "Address required", description: "Please enter your address" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        credentials: "include",        // ← ensure session cookie is sent
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          issueIds: Array.from(selectedIssues),
          estimatedPrice: estimate,
          addressLine: form.addressLine,
          scheduledAt: form.scheduledAt || undefined,
          notes: form.notes || undefined,
        }),
      });

      if (res.status === 401) {
        // Session expired — redirect to login
        router.push("/login?redirect=/book");
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Booking failed");
      toast({ variant: "success", title: "Booking confirmed!", description: "We're finding the nearest professional for you." });
      router.push(`/booking/${json.data.id}`);
    } catch (err) {
      toast({ variant: "destructive", title: "Booking failed", description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredServices = services.filter((s) =>
    !searchQ || s.name.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          {step > 1 ? (
            <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <button onClick={() => router.push("/")} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">
              {step === 1 ? "Choose a Service" : step === 2 ? "Select Issues" : "Confirm Booking"}
            </h1>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    s <= step ? "bg-brand-600" : "bg-gray-200"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* STEP 1: Pick service */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-sm outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {/* Categories */}
            {!selectedCategory && !searchQ && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Categories</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={async () => {
                        setSelectedCategory(cat);
                        await loadServices(cat.id);
                      }}
                      className="flex items-center gap-3 p-4 bg-white rounded-xl border hover:border-brand-400 hover:bg-brand-50 transition-all text-left"
                    >
                      <span className="text-2xl">{EMOJI_MAP[cat.code] ?? "🔨"}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Services list */}
            {(selectedCategory || searchQ) && (
              <div>
                {selectedCategory && (
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => { setSelectedCategory(null); setServices([]); }}
                      className="text-sm text-brand-600 hover:underline flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" /> All categories
                    </button>
                    <span className="text-gray-400">/</span>
                    <span className="text-sm font-medium">{selectedCategory.name}</span>
                  </div>
                )}
                {loading ? (
                  <div className="grid gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />
                    ))}
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No services found</div>
                ) : (
                  <div className="grid gap-3">
                    {filteredServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleSelectService(service)}
                        className="flex items-center gap-4 p-4 bg-white rounded-xl border hover:border-brand-400 hover:shadow-md transition-all text-left group"
                      >
                        <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl shrink-0">
                          {EMOJI_MAP[service.category?.code ?? ""] ?? "🔧"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{service.name}</p>
                          {service.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{service.description}</p>
                          )}
                          <p className="text-xs text-brand-600 font-medium mt-1">
                            From {formatCurrency(Number(service.minPrice ?? service.basePrice))}
                            {service.maxPrice && ` — ${formatCurrency(Number(service.maxPrice))}`}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-brand-500 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Select issues */}
        {step === 2 && selectedService && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center text-xl">
                {EMOJI_MAP[selectedService.category?.code ?? ""] ?? "🔧"}
              </div>
              <div>
                <p className="font-semibold">{selectedService.name}</p>
                <p className="text-xs text-muted-foreground">{selectedService.category?.name}</p>
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">What problems are you facing?</h2>
              <p className="text-sm text-muted-foreground mb-4">Select all that apply. We'll estimate the price based on your selection.</p>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />)}
                </div>
              ) : issues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No specific issues defined — we'll estimate on arrival
                </div>
              ) : (
                <div className="space-y-2">
                  {issues.map((issue) => {
                    const selected = selectedIssues.has(issue.id);
                    return (
                      <button
                        key={issue.id}
                        onClick={() => toggleIssue(issue.id)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                          selected ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                          selected ? "border-brand-600 bg-brand-600" : "border-gray-300"
                        )}>
                          {selected && <CheckCircle className="h-3.5 w-3.5 text-white fill-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{issue.name}</p>
                          {issue.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-brand-600">{formatCurrency(issue.basePrice)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(issue.minPrice)}–{formatCurrency(issue.maxPrice)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Estimate bar */}
            <div className="sticky bottom-4">
              <div className="bg-white rounded-xl border shadow-lg p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Estimated total</p>
                  <p className="text-xl font-bold text-brand-700">{formatCurrency(estimate)}</p>
                  {selectedIssues.size > 0 && (
                    <p className="text-xs text-muted-foreground">{selectedIssues.size} issue{selectedIssues.size > 1 ? "s" : ""} selected</p>
                  )}
                </div>
                <Button onClick={() => setStep(3)} disabled={selectedIssues.size === 0 && issues.length > 0}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === 3 && selectedService && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="bg-white rounded-xl border divide-y">
              <div className="p-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Booking Summary</h3>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center text-xl">
                    {EMOJI_MAP[selectedService.category?.code ?? ""] ?? "🔧"}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedService.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedService.category?.name}</p>
                  </div>
                </div>
              </div>

              {selectedIssues.size > 0 && (
                <div className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Selected Issues</p>
                  <div className="space-y-1">
                    {issues.filter((i) => selectedIssues.has(i.id)).map((i) => (
                      <div key={i.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{i.name}</span>
                        <span className="font-medium">{formatCurrency(i.basePrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-brand-50">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Estimated Total</p>
                  <p className="text-xl font-bold text-brand-700">{formatCurrency(estimate)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Final price may vary after professional inspection. You'll approve any additional charges.
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl border p-4 space-y-4">
              <h3 className="font-semibold">Booking Details</h3>
              <div className="space-y-1">
                <label className="text-sm font-medium">Service Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Enter your full address"
                    value={form.addressLine}
                    onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Preferred Date & Time</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Additional Notes</label>
                <textarea
                  placeholder="Describe the problem in more detail..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                />
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "Verified Pros" },
                { icon: Clock, label: "On-time Guarantee" },
                { icon: Star, label: "5-star Rated" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border text-center">
                  <Icon className="h-5 w-5 text-brand-600" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              loading={submitting}
            >
              Confirm Booking — {formatCurrency(estimate)}
            </Button>

            {!isAuthenticated && (
              <p className="text-center text-sm text-muted-foreground">
                You'll be asked to sign in before confirming
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>}>
      <BookPageInner />
    </Suspense>
  );
}
