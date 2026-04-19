export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingBag, Package, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "info" | "pending" | "default"> = {
  DELIVERED: "success",
  SHIPPED: "info",
  PROCESSING: "warning",
  CONFIRMED: "info",
  PENDING: "pending",
  CANCELLED: "destructive",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { select: { name: true, phone: true, email: true } },
      items: {
        include: { product: { select: { name: true, imageUrl: true } } },
      },
      payment: { select: { status: true, method: true } },
    },
  });

  const counts = {
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
    PROCESSING: orders.filter((o) => o.status === "PROCESSING").length,
    SHIPPED: orders.filter((o) => o.status === "SHIPPED").length,
    DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  const totalRevenue = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">{orders.length} total orders</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Orders"
          value={orders.length}
          icon={ShoppingBag}
          iconColor="text-brand-600"
        />
        <StatCard
          title="Pending"
          value={counts.PENDING}
          icon={Clock}
          iconColor="text-yellow-600"
        />
        <StatCard
          title="Processing"
          value={counts.PROCESSING}
          icon={Package}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Delivered"
          value={counts.DELIVERED}
          icon={CheckCircle}
          iconColor="text-green-600"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          iconColor="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {Object.entries(counts).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <Badge variant={STATUS_VARIANTS[status] ?? "default"} className="mt-1 text-xs">
                {status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {orders.map((order) => {
              const itemsSummary = order.items
                .map((i) => `${i.product.name} ×${i.quantity}`)
                .join(", ");
              return (
                <div key={order.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-mono text-xs text-muted-foreground">
                          #{order.id.slice(-8).toUpperCase()}
                        </p>
                        <Badge variant={STATUS_VARIANTS[order.status] ?? "default"}>
                          {order.status}
                        </Badge>
                        {order.payment && (
                          <Badge
                            variant={order.payment.status === "COMPLETED" ? "success" : "pending"}
                            className="text-xs"
                          >
                            {order.payment.method}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium truncate">{order.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{order.customer.phone}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{itemsSummary}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">{formatCurrency(Number(order.total))}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && (
              <div className="px-6 py-16 text-center text-muted-foreground">
                <XCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No orders found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
