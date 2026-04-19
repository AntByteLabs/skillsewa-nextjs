"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, MapPin, Phone, Star, XCircle, AlertTriangle, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  status: string;
  cancelReason: string | null;
  cancelledBy: string | null;
  scheduledAt: string | null;
  addressLine: string | null;
  estimatedPrice: number | null;
  quotedPrice: number | null;
  finalPrice: number | null;
  createdAt: string;
  service: { name: string; category: { name: string } };
  professional: { user: { name: string; phone: string } } | null;
  issues: Array<{ serviceIssue: { name: string }; priceAtBooking: number }>;
}

const STATUSES = [
  { key: "PENDING", label: "Searching for professional", icon: "🔍" },
  { key: "CONFIRMED", label: "Professional assigned", icon: "✅" },
  { key: "IN_PROGRESS", label: "Job in progress", icon: "🔧" },
  { key: "COMPLETED", label: "Job completed", icon: "🎉" },
];

export default function BookingStatusPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelledBy, setCancelledBy] = useState<"CUSTOMER" | "PROFESSIONAL_FAULT">("CUSTOMER");
  const [cancelling, setCancelling] = useState(false);
  const [noProFound, setNoProFound] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${params.id}`, { credentials: "include" });
      if (!res.ok) { router.push("/customer/bookings"); return; }
      const json = await res.json();
      const b: Booking = json.data;
      setBooking(b);

      // Check if pending for too long (5 minutes) and no professional found
      if (b.status === "PENDING") {
        const age = Date.now() - new Date(b.createdAt).getTime();
        if (age > 5 * 60 * 1000) setNoProFound(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  // Poll every 4 seconds when pending/confirmed
  useEffect(() => {
    fetchBooking();
    const interval = setInterval(() => {
      if (booking && ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
        fetchBooking();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchBooking, booking?.status]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast({ variant: "destructive", title: "Please provide a reason for cancellation" });
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${params.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancelReason: cancelReason.trim(),
          cancelledBy,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBooking(json.data);
      setShowCancelModal(false);
      toast({ variant: "success", title: "Booking cancelled" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to cancel", description: (err as Error).message });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
    </div>
  );

  if (!booking) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-muted-foreground">Booking not found</p>
    </div>
  );

  const currentStepIndex = STATUSES.findIndex(s => s.key === booking.status);
  const isCancelled = booking.status === "CANCELLED";
  const isCompleted = booking.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/customer/bookings")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Booking #{booking.id.slice(-6).toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground">{booking.service.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Status card */}
        {isCancelled ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <XCircle className="h-14 w-14 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-red-700">Booking Cancelled</h2>
            {booking.cancelReason && <p className="text-sm text-red-600 mt-2">Reason: {booking.cancelReason}</p>}
            <Button className="mt-4" variant="outline" onClick={() => router.push("/book")}>Book Again</Button>
          </div>
        ) : noProFound && booking.status === "PENDING" ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
            <AlertTriangle className="h-14 w-14 text-orange-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-orange-700">No Professional Found Nearby</h2>
            <p className="text-sm text-orange-600 mt-2">We couldn't find an available professional in your area. Please try again later or choose a different time.</p>
            <div className="flex gap-3 justify-center mt-4">
              <Button variant="outline" onClick={() => { setShowCancelModal(true); setCancelledBy("CUSTOMER"); }}>Cancel Booking</Button>
              <Button onClick={() => router.push("/book")}>Try Again</Button>
            </div>
          </div>
        ) : isCompleted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-700">Service Completed!</h2>
            {booking.finalPrice && (
              <p className="text-2xl font-bold mt-2">{formatCurrency(booking.finalPrice)}</p>
            )}
            <div className="flex gap-3 justify-center mt-4">
              <Button variant="outline" onClick={() => router.push("/customer/bookings")}>View Bookings</Button>
              <Button onClick={() => router.push(`/booking/${booking.id}/review`)}>
                <Star className="h-4 w-4 mr-1" /> Leave Review
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white border rounded-2xl p-6">
            {/* Animated status */}
            <div className="text-center mb-6">
              {booking.status === "PENDING" && (
                <div className="flex flex-col items-center">
                  <div className="relative h-20 w-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-brand-100 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-4 border-brand-200 animate-ping" style={{ animationDelay: "0.5s" }} />
                    <div className="absolute inset-4 rounded-full bg-brand-600 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Finding nearest professional...</h2>
                  <p className="text-sm text-muted-foreground mt-1">We're matching you with a verified expert nearby</p>
                </div>
              )}
              {booking.status === "CONFIRMED" && booking.professional && (
                <div>
                  <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-3" />
                  <h2 className="text-xl font-bold">Professional Assigned!</h2>
                  <p className="text-sm text-muted-foreground">They'll arrive at your scheduled time</p>
                </div>
              )}
              {booking.status === "IN_PROGRESS" && (
                <div>
                  <div className="text-5xl mb-3">🔧</div>
                  <h2 className="text-xl font-bold">Service In Progress</h2>
                  <p className="text-sm text-muted-foreground">Your professional is working on the job</p>
                </div>
              )}
            </div>

            {/* Progress steps */}
            <div className="flex items-center justify-between mb-6">
              {STATUSES.slice(0, 3).map((s, i) => (
                <div key={s.key} className="flex items-center flex-1">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    i < currentStepIndex ? "bg-brand-600 text-white" :
                    i === currentStepIndex ? "bg-brand-600 text-white ring-4 ring-brand-100" :
                    "bg-gray-200 text-gray-400"
                  )}>
                    {i < currentStepIndex ? "✓" : i + 1}
                  </div>
                  {i < 2 && <div className={cn("flex-1 h-1 mx-1", i < currentStepIndex ? "bg-brand-600" : "bg-gray-200")} />}
                </div>
              ))}
            </div>

            {/* Professional card */}
            {booking.professional && (
              <div className="border rounded-xl p-4 bg-brand-50">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Your Professional</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold">
                      {booking.professional.user.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{booking.professional.user.name}</p>
                      <p className="text-xs text-muted-foreground">{booking.professional.user.phone}</p>
                    </div>
                  </div>
                  <a href={`tel:${booking.professional.user.phone}`}>
                    <Button size="sm" variant="outline"><Phone className="h-4 w-4 mr-1" /> Call</Button>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Booking details */}
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold">Booking Details</h3>
          <div className="divide-y text-sm">
            <div className="py-2 flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{booking.service.name}</span></div>
            {booking.scheduledAt && <div className="py-2 flex justify-between"><span className="text-muted-foreground">Scheduled</span><span className="font-medium">{formatDateTime(booking.scheduledAt)}</span></div>}
            {booking.addressLine && <div className="py-2 flex items-center justify-between"><span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Address</span><span className="font-medium text-right max-w-[60%]">{booking.addressLine}</span></div>}
            {booking.estimatedPrice && <div className="py-2 flex justify-between"><span className="text-muted-foreground">Estimated</span><span className="font-medium">{formatCurrency(booking.estimatedPrice)}</span></div>}
            {booking.finalPrice && <div className="py-2 flex justify-between"><span className="text-muted-foreground">Final Price</span><span className="font-bold text-brand-700">{formatCurrency(booking.finalPrice)}</span></div>}
          </div>
        </div>

        {/* Cancel button (only for active bookings) */}
        {!isCancelled && !isCompleted && (
          <Button variant="outline" className="w-full text-red-500 border-red-200 hover:bg-red-50" onClick={() => setShowCancelModal(true)}>
            Cancel Booking
          </Button>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">Cancel Booking</h3>
            <p className="text-sm text-muted-foreground">Please tell us why you're cancelling.</p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Who is responsible?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCancelledBy("CUSTOMER")}
                  className={cn("rounded-xl border p-3 text-sm text-left transition-all",
                    cancelledBy === "CUSTOMER" ? "border-brand-600 bg-brand-50" : "border-gray-200")}
                >
                  <p className="font-medium">My decision</p>
                  <p className="text-xs text-muted-foreground">No fault on professional</p>
                </button>
                <button
                  onClick={() => setCancelledBy("PROFESSIONAL_FAULT")}
                  className={cn("rounded-xl border p-3 text-sm text-left transition-all",
                    cancelledBy === "PROFESSIONAL_FAULT" ? "border-red-500 bg-red-50" : "border-gray-200")}
                >
                  <p className="font-medium">Professional issue</p>
                  <p className="text-xs text-red-500">Their rating will be affected</p>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Reason *</label>
              <textarea
                rows={3}
                placeholder="Describe the reason..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)}>Back</Button>
              <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
