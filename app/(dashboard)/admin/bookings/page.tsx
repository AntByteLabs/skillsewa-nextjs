export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Calendar, MapPin, User } from "lucide-react";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "info" | "pending" | "default"> = {
  COMPLETED: "success", CONFIRMED: "info", PENDING: "pending", IN_PROGRESS: "warning", CANCELLED: "destructive",
};

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      customer: { select: { name: true, phone: true } },
      professional: { include: { user: { select: { name: true } } } },
      service: { include: { category: true } },
      payment: { select: { status: true, method: true } },
    },
  });

  const counts = {
    PENDING: bookings.filter((b) => b.status === "PENDING").length,
    CONFIRMED: bookings.filter((b) => b.status === "CONFIRMED").length,
    IN_PROGRESS: bookings.filter((b) => b.status === "IN_PROGRESS").length,
    COMPLETED: bookings.filter((b) => b.status === "COMPLETED").length,
    CANCELLED: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground">{bookings.length} total bookings</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(counts).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <Badge variant={STATUS_VARIANTS[status] ?? "default"} className="mt-1">{status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Bookings</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {bookings.map((booking) => (
              <div key={booking.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{booking.service.name}</p>
                      <Badge variant={STATUS_VARIANTS[booking.status] ?? "default"}>{booking.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{booking.customer.name}</span>
                      <span>→ {booking.professional?.user.name ?? "Unassigned"}</span>
                      {booking.scheduledAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateTime(booking.scheduledAt)}</span>}
                      {booking.addressLine && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{booking.addressLine}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {booking.finalPrice && <p className="font-semibold">{formatCurrency(Number(booking.finalPrice))}</p>}
                    {booking.payment && <Badge variant={booking.payment.status === "COMPLETED" ? "success" : "pending"} className="text-xs">{booking.payment.method}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
