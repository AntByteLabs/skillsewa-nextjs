export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { ShoppingBag, Package, TrendingUp, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "info" | "pending" | "default"> = {
  DELIVERED: "success", SHIPPED: "info", PROCESSING: "warning",
  CONFIRMED: "info", PENDING: "pending", CANCELLED: "destructive",
};

export default async function SupplierOrdersPage() {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";

  const supplier = await prisma.supplier.findUnique({ where: { userId } });
  if (!supplier) return <div className="text-center py-20 text-muted-foreground">Supplier profile not found</div>;

  const orders = await prisma.order.findMany({
    where: { items: { some: { product: { supplierId: supplier.id } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      customer: { select: { name: true, phone: true } },
      items: {
        where: { product: { supplierId: supplier.id } },
        include: { product: { select: { name: true } } },
      },
    },
  });

  const pending = orders.filter(o => o.status === "PENDING").length;
  const shipped = orders.filter(o => o.status === "SHIPPED").length;
  const revenue = orders.filter(o => o.status === "DELIVERED").reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">{orders.length} total orders</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pending Orders" value={pending} icon={Clock} iconColor="text-orange-600" />
        <StatCard title="Shipped Orders" value={shipped} icon={Package} iconColor="text-blue-600" />
        <StatCard title="Delivered Revenue" value={formatCurrency(revenue)} icon={TrendingUp} iconColor="text-green-600" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Order History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {orders.map((order) => (
              <div key={order.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                      <Badge variant={STATUS_VARIANTS[order.status] ?? "default"}>{order.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Customer: {order.customer.name} · {order.customer.phone}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.items.map(i => `${i.product.name} ×${i.quantity}`).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(Number(order.total))}</p>
                    {order.shippingAddress && (
                      <p className="text-xs text-muted-foreground max-w-[150px] truncate">{order.shippingAddress}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="px-6 py-8 text-sm text-muted-foreground text-center">No orders yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
