"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  status: string;
  service: { name: string; category: { name: string } };
  professional: { user: { name: string } } | null;
  review: unknown | null;
}

export default function ReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${params.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setBooking(d.data);
        if (d.data?.review) setSubmitted(true);
      })
      .catch(() => router.push("/customer/bookings"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ variant: "destructive", title: "Please select a rating" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: params.id, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit review");
      setSubmitted(true);
      toast({ variant: "success", title: "Review submitted! Thank you." });
    } catch (err) {
      toast({ variant: "destructive", title: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

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

  if (booking.status !== "COMPLETED") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Reviews can only be submitted for completed bookings.</p>
        <Button variant="outline" onClick={() => router.push(`/booking/${params.id}`)}>Go Back</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push(`/booking/${params.id}`)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Leave a Review</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {submitted ? (
          <div className="bg-white rounded-2xl border p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">Your review helps other customers and motivates professionals to do great work.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/customer/bookings")}>My Bookings</Button>
              <Button onClick={() => router.push("/book")}>Book Again</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Booking summary */}
            <div className="bg-white rounded-2xl border p-5">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Service</p>
              <p className="font-semibold text-lg">{booking.service.name}</p>
              <p className="text-sm text-muted-foreground">{booking.service.category.name}</p>
              {booking.professional && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Professional</p>
                  <p className="font-medium">{booking.professional.user.name}</p>
                </div>
              )}
            </div>

            {/* Star rating */}
            <div className="bg-white rounded-2xl border p-6 text-center">
              <p className="font-semibold text-gray-900 mb-4">How was your experience?</p>

              <div className="flex items-center justify-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={cn(
                        "h-10 w-10 transition-colors",
                        (hovered || rating) >= star
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-200 fill-gray-200"
                      )}
                    />
                  </button>
                ))}
              </div>

              {(hovered || rating) > 0 && (
                <p className="text-sm font-medium text-gray-700 mb-2">{LABELS[hovered || rating]}</p>
              )}
            </div>

            {/* Comment */}
            <div className="bg-white rounded-2xl border p-5">
              <label className="text-sm font-semibold text-gray-900 block mb-2">
                Write a review <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell others about your experience — quality of work, punctuality, professionalism..."
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-brand-300 resize-none"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/1000</p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              loading={submitting}
              disabled={rating === 0}
            >
              Submit Review
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
