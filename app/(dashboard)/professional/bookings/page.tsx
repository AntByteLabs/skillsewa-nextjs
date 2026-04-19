"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, Clock, CheckCircle, Play } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "info" | "pending" | "default"> = {
  COMPLETED: "success", CONFIRMED: "info", PENDING: "pending", IN_PROGRESS: "warning", CANCELLED: "destructive",
};

interface Booking {
  id: string;
  status: string;
  scheduledAt: string | null;
  addressLine: string | null;
  notes: string | null;
  quotedPrice: number | null;
  finalPrice: number | null;
  estimatedPrice: number | null;
  customer: { name: string; phone: string };
  service: { name: string; category: { name: string } };
}

export default function ProfessionalBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [completePriceModal, setCompletePriceModal] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/bookings", { credentials: "include" });
    const json = await res.json();
    setBookings(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string, extra?: Record<string, unknown>) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...json.data } : b));
      toast({ variant: "success", title: status === "IN_PROGRESS" ? "Job started!" : "Job completed!" });
      setCompletePriceModal(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: (err as Error).message });
    } finally {
      setUpdating(null);
    }
  };

  const handleComplete = async (id: string) => {
    const price = parseFloat(finalPrice);
    if (!price || price <= 0) {
      toast({ variant: "destructive", title: "Enter the final job price" });
      return;
    }
    await updateStatus(id, "COMPLETED", { finalPrice: price });
    setFinalPrice("");
  };

  const upcoming = bookings.filter(b => ["PENDING", "CONFIRMED"].includes(b.status));
  const active = bookings.filter(b => b.status === "IN_PROGRESS");
  const past = bookings.filter(b => ["COMPLETED", "CANCELLED"].includes(b.status));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>;

  const BookingCard = ({ b }: { b: Booking }) => (
    <Card key={b.id}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{b.service.name}</span>
              <Badge variant={STATUS_VARIANTS[b.status] ?? "default"}>{b.status.replace("_", " ")}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><User className="h-3 w-3" />{b.customer.name} · {b.customer.phone}</span>
              {b.scheduledAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(b.scheduledAt)}</span>}
              {b.addressLine && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.addressLine}</span>}
            </div>
            {b.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{b.notes}"</p>}
          </div>
          <div className="shrink-0 flex flex-col gap-2 items-end">
            {(b.quotedPrice || b.estimatedPrice) && (
              <span className="text-sm font-semibold">
                {formatCurrency(Number(b.finalPrice ?? b.quotedPrice ?? b.estimatedPrice))}
              </span>
            )}
            {b.status === "CONFIRMED" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                disabled={updating === b.id}
                onClick={() => updateStatus(b.id, "IN_PROGRESS")}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {updating === b.id ? "..." : "Start Job"}
              </Button>
            )}
            {b.status === "IN_PROGRESS" && (
              <Button
                size="sm"
                className="text-xs"
                disabled={updating === b.id}
                onClick={() => setCompletePriceModal(b.id)}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground">{bookings.length} total · {active.length} active</p>
      </div>

      {bookings.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No bookings yet</h3>
          <p className="text-muted-foreground">Complete your profile to start receiving jobs</p>
        </CardContent></Card>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                Active Jobs ({active.length})
              </h2>
              <div className="grid gap-3">{active.map(b => <BookingCard key={b.id} b={b} />)}</div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3">Upcoming ({upcoming.length})</h2>
              <div className="grid gap-3">{upcoming.map(b => <BookingCard key={b.id} b={b} />)}</div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-base font-semibold mb-3 text-muted-foreground">Past Bookings ({past.length})</h2>
              <div className="grid gap-3">{past.map(b => <BookingCard key={b.id} b={b} />)}</div>
            </section>
          )}
        </>
      )}

      {/* Complete job modal — enter final price */}
      {completePriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold">Complete Job</h3>
            <p className="text-sm text-muted-foreground">Enter the final price charged to the customer.</p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Final Price (Rs)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 1500"
                value={finalPrice}
                onChange={e => setFinalPrice(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setCompletePriceModal(null); setFinalPrice(""); }}>Cancel</Button>
              <Button className="flex-1" onClick={() => handleComplete(completePriceModal)} disabled={updating !== null}>
                {updating ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
