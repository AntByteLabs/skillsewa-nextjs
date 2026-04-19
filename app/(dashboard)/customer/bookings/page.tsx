"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Star, Plus, Clock, X, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { toast } from "@/hooks/useToast";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "info" | "pending" | "default"> = {
  COMPLETED: "success",
  CONFIRMED: "info",
  PENDING: "pending",
  IN_PROGRESS: "warning",
  CANCELLED: "destructive",
};

interface Booking {
  id: string;
  status: string;
  scheduledAt: string | null;
  addressLine: string | null;
  finalPrice: number | null;
  quotedPrice: number | null;
  service: { name: string; category: { name: string } };
  professional: { user: { name: string; phone: string } } | null;
  review: unknown | null;
}

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancel modal state
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelledBy, setCancelledBy] = useState<"CUSTOMER" | "PROFESSIONAL_FAULT">("CUSTOMER");
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = useCallback(async () => {
    const res = await fetch("/api/bookings", { credentials: "include" });
    const data = await res.json();
    setBookings(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${cancelId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", cancelReason, cancelledBy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cancel failed");
      toast({ variant: "success", title: "Booking cancelled" });
      setCancelId(null);
      setCancelReason("");
      setCancelledBy("CUSTOMER");
      fetchBookings();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setCancelling(false);
    }
  };

  const active = bookings.filter((b) => ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(b.status));
  const past = bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status));

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <span className="text-brand-600 text-lg">🔧</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{booking.service.name}</p>
                <p className="text-sm text-muted-foreground">{booking.service.category.name}</p>
              </div>
              <Badge variant={STATUS_VARIANTS[booking.status] ?? "default"} className="shrink-0">
                {booking.status.replace("_", " ")}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {booking.scheduledAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDateTime(new Date(booking.scheduledAt))}</span>
                </div>
              )}
              {booking.addressLine && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{booking.addressLine}</span>
                </div>
              )}
            </div>

            {booking.professional && (
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">Professional: </span>
                <span className="font-medium">{booking.professional.user.name}</span>
                <span className="text-muted-foreground ml-2">{booking.professional.user.phone}</span>
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div>
                {booking.finalPrice ? (
                  <span className="font-semibold">{formatCurrency(Number(booking.finalPrice))}</span>
                ) : booking.quotedPrice ? (
                  <span className="text-muted-foreground">{formatCurrency(Number(booking.quotedPrice))} quoted</span>
                ) : (
                  <span className="text-muted-foreground text-sm">Price TBD</span>
                )}
              </div>
              <div className="flex gap-2">
                {booking.status === "COMPLETED" && !booking.review && (
                  <Link href={`/booking/${booking.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      <Star className="h-3 w-3 mr-1" /> Review
                    </Button>
                  </Link>
                )}
                {["PENDING", "CONFIRMED"].includes(booking.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { setCancelId(booking.id); setCancelReason(""); setCancelledBy("CUSTOMER"); }}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                )}
                {["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(booking.status) && (
                  <Link href={`/booking/${booking.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">Track</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-gray-200 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
          <p className="text-muted-foreground">{bookings.length} total bookings</p>
        </div>
        <Link href="/">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Book Service
          </Button>
        </Link>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" /> Active Bookings ({active.length})
          </h2>
          <div className="grid gap-4">
            {active.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 text-muted-foreground">Past Bookings ({past.length})</h2>
          <div className="grid gap-4">
            {past.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
        </section>
      )}

      {bookings.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-6">Book your first home service in under 2 minutes</p>
            <Link href="/"><Button>Browse Services</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Cancel Modal */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Cancel Booking</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Who is responsible for the cancellation?</p>
                <div className="space-y-2">
                  {[
                    { value: "CUSTOMER", label: "My decision", desc: "I changed my mind or circumstances changed" },
                    { value: "PROFESSIONAL_FAULT", label: "Professional issue", desc: "Professional didn't show up or was unsatisfactory" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCancelledBy(opt.value as "CUSTOMER" | "PROFESSIONAL_FAULT")}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        cancelledBy === opt.value ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us more about why you're cancelling..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                />
              </div>

              {cancelledBy === "PROFESSIONAL_FAULT" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Selecting "Professional issue" will deduct 0.2 stars from the professional's rating and flag this cancellation for admin review.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCancelId(null)}
                disabled={cancelling}
              >
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancel}
                loading={cancelling}
              >
                Cancel Booking
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
