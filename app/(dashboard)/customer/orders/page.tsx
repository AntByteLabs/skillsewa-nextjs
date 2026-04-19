export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Plus, Package } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "info" | "pending" | "default"> = {
  DELIVERED: "success", SHIPPED: "info", PROCESSING: "warning",
  CONFIRMED: "info", PENDING: "pending", CANCELLED: "destructive", REFUNDED: "destructive",
};

export default async function CustomerOrdersPage() {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";

  const orders = await prisma.order.findMany({
    where: { customerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: { select: { name: true, imageUrl: true } } } },
      payment: { select: { status: true, method: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground">{orders.length} total orders</p>
        </div>
        <Link href="/products">
          <Button><Plus className="h-4 w-4 mr-2" /> Shop Products</Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6">Browse our product marketplace</p>
            <Link href="/products"><Button>Browse Products</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold">Order #{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[order.status] ?? "default"}>{order.status}</Badge>
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatCurrency(Number(item.unitPrice))}</p>
                      </div>
                      <p className="text-sm font-semibold shrink-0">{formatCurrency(Number(item.total))}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    {order.shippingAddress && <p className="truncate max-w-[200px]">{order.shippingAddress}</p>}
                    {order.payment && (
                      <p>{order.payment.method} · <Badge variant={order.payment.status === "COMPLETED" ? "success" : "pending"} className="text-xs">{order.payment.status}</Badge></p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(Number(order.total))}</p>
                    {Number(order.deliveryFee) > 0 && <p className="text-xs text-muted-foreground">incl. Rs {Number(order.deliveryFee)} delivery</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
