export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Phone, Mail, Star, Package, TrendingUp } from "lucide-react";
import { getInitials, formatDate, formatCurrency } from "@/lib/utils";

export default async function SupplierProfilePage() {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      supplier: true,
    },
  });

  if (!user || !user.supplier) return <div className="text-center py-20 text-muted-foreground">Supplier profile not found</div>;

  const sup = user.supplier;

  const [productCount, orderStats] = await Promise.all([
    prisma.product.count({ where: { supplierId: sup.id, isActive: true } }),
    prisma.orderItem.aggregate({
      where: { product: { supplierId: sup.id } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Business Profile</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl">{getInitials(sup.businessName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-xl font-bold">{sup.businessName}</h2>
                {sup.isVerified && (
                  <Badge variant="success">✓ Verified</Badge>
                )}
              </div>
              {sup.description && <p className="text-sm text-muted-foreground mb-3">{sup.description}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{user.phone}</span>
                {user.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</span>}
                {sup.locationAddress && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{sup.locationAddress}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Products", value: productCount, icon: Package },
          { label: "Total Sales", value: orderStats._count, icon: TrendingUp },
          { label: "Revenue", value: formatCurrency(Number(orderStats._sum.total ?? 0)), icon: TrendingUp },
          { label: "Rating", value: `${Number(sup.rating).toFixed(1)} ★`, icon: Star },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-brand-700">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline">Edit Profile</Button>
        <Button variant="outline">Upload Documents</Button>
      </div>
    </div>
  );
}
