export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Plus, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";

export default async function SupplierProductsPage() {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";

  const supplier = await prisma.supplier.findUnique({ where: { userId } });
  if (!supplier) {
    return <div className="text-center py-20 text-muted-foreground">Supplier profile not found.</div>;
  }

  const [products, orderStats] = await Promise.all([
    prisma.product.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.orderItem.aggregate({
      where: { product: { supplierId: supplier.id } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">{supplier.businessName}</p>
        </div>
        <Link href="/supplier/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Products" value={products.length} icon={Package} iconColor="text-brand-600" />
        <StatCard title="Total Sales" value={orderStats._count} icon={TrendingUp} iconColor="text-green-600" />
        <StatCard title="Total Revenue" value={formatCurrency(Number(orderStats._sum.total ?? 0))} icon={TrendingUp} iconColor="text-purple-600" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="aspect-video rounded-lg bg-muted mb-4 flex items-center justify-center">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-tight">{product.name}</p>
                  <Badge variant={product.isActive ? "success" : "secondary"}>
                    {product.isActive ? "Active" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{product.category.toLowerCase().replace("_", " ")}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg">{formatCurrency(Number(product.price))}</span>
                    {product.comparePrice && (
                      <span className="text-sm text-muted-foreground line-through ml-2">
                        {formatCurrency(Number(product.comparePrice))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm">{Number(product.rating).toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>Stock: {product.stock} {product.unit}s</span>
                  <span>{product.totalSold} sold</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="py-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-6">Add your first product to start selling</p>
                <Link href="/supplier/products/new">
                  <Button><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
