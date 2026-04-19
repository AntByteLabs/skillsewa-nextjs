export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingBag, TrendingUp, Star, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function SupplierAnalyticsPage() {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";

  const supplier = await prisma.supplier.findUnique({ where: { userId } });
  if (!supplier) return <div className="text-center py-20 text-muted-foreground">Supplier profile not found</div>;

  const [products, orderStats, topProducts, recentOrders] = await Promise.all([
    prisma.product.count({ where: { supplierId: supplier.id, isActive: true } }),
    prisma.orderItem.aggregate({
      where: { product: { supplierId: supplier.id } },
      _sum: { total: true, quantity: true },
      _count: true,
    }),
    prisma.product.findMany({
      where: { supplierId: supplier.id },
      orderBy: { totalSold: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      where: { items: { some: { product: { supplierId: supplier.id } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { items: { include: { product: { select: { name: true } } } } },
    }),
  ]);

  const totalRevenue = Number(orderStats._sum.total ?? 0);
  const supplierShare = totalRevenue * (1 - 0.01); // 1% platform share

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">{supplier.businessName}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Products" value={products} icon={Package} iconColor="text-brand-600" />
        <StatCard title="Total Orders" value={orderStats._count} icon={ShoppingBag} iconColor="text-blue-600" />
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} iconColor="text-green-600" />
        <StatCard title="Your Earnings" value={formatCurrency(supplierShare)} description="After 1% platform fee" icon={TrendingUp} iconColor="text-purple-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Products by Sales</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 px-6 py-3.5">
                  <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(Number(p.price))}/{p.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{p.totalSold} sold</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs">{Number(p.rating).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-6 py-3.5">
                  <div>
                    <p className="text-sm font-medium">Order #{order.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{order.items.map(i => i.product.name).join(", ").slice(0, 40)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(Number(order.total))}</p>
                    <Badge variant={
                      order.status === "DELIVERED" ? "success" :
                      order.status === "SHIPPED" ? "info" :
                      order.status === "CANCELLED" ? "destructive" : "pending"
                    }>{order.status}</Badge>
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && <p className="px-6 py-8 text-sm text-muted-foreground text-center">No orders yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
