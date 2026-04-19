export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Calendar, ShoppingBag, Star } from "lucide-react";
import { getInitials, formatDate, formatCurrency } from "@/lib/utils";

export default async function CustomerProfilePage() {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bookingsAsCustomer: { where: { status: "COMPLETED" } },
      ordersAsCustomer: { where: { status: "DELIVERED" } },
      reviewsGiven: true,
      wallet: true,
    },
  });

  if (!user) return <div className="text-center py-20 text-muted-foreground">Profile not found</div>;

  const totalSpent = user.bookingsAsCustomer.reduce((s, b) => s + Number(b.finalPrice ?? 0), 0)
    + user.ordersAsCustomer.reduce((s, o) => s + Number(o.total ?? 0), 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{user.name}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{user.phone}</div>
                {user.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</div>}
                {user.city && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{user.city}</div>}
                <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Member since {formatDate(user.createdAt)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Bookings", value: user.bookingsAsCustomer.length, icon: Calendar },
          { label: "Orders", value: user.ordersAsCustomer.length, icon: ShoppingBag },
          { label: "Reviews Given", value: user.reviewsGiven.length, icon: Star },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-brand-50 p-2.5">
                <stat.icon className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Spending Summary</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-brand-700">{formatCurrency(totalSpent)}</p>
          <p className="text-sm text-muted-foreground mt-1">Total spent on SkillSewa</p>
        </CardContent>
      </Card>

      <Button variant="outline">Edit Profile</Button>
    </div>
  );
}
