export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Star, List, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function AdminServicesPage() {
  const [categories, services] = await Promise.all([
    prisma.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany({
      include: {
        category: true,
        _count: { select: { bookings: true, issues: true } },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
  ]);

  const byCategory = categories.map((cat) => ({
    ...cat,
    services: services.filter((s) => s.categoryId === cat.id),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services Management</h1>
          <p className="text-muted-foreground">
            {services.length} services across {categories.length} categories
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/services/new">
            <Button><Plus className="h-4 w-4 mr-2" /> Add Service</Button>
          </Link>
        </div>
      </div>

      {byCategory.map((cat) => (
        <section key={cat.id}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-2 w-2 rounded-full bg-brand-500" />
            <h2 className="text-base font-semibold">{cat.name}</h2>
            <Badge variant="secondary">{cat.services.length} services</Badge>
            <Badge variant={cat.isActive ? "success" : "destructive"}>{cat.isActive ? "Active" : "Inactive"}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cat.services.map((service) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{service.description}</p>
                      )}
                    </div>
                    <Badge variant={service.isActive ? "success" : "secondary"}>
                      {service.isActive ? "On" : "Off"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>Base: {formatCurrency(Number(service.basePrice))}</span>
                    </div>
                    {service.minPrice && service.maxPrice && (
                      <div className="col-span-2 text-brand-600 font-medium">
                        Range: {formatCurrency(Number(service.minPrice))} — {formatCurrency(Number(service.maxPrice))}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <List className="h-3 w-3" />
                      <span>{service._count.issues} issues defined</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      <span>{service._count.bookings} bookings</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Link href={`/admin/services/${service.id}/issues`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <List className="h-3 w-3 mr-1" /> Issues & Pricing
                      </Button>
                    </Link>
                    <Link href={`/admin/services/${service.id}/edit`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
            {cat.services.length === 0 && (
              <div className="col-span-full">
                <Link href={`/admin/services/new?category=${cat.id}`}>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-brand-300 transition-colors cursor-pointer">
                    <Plus className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Add first service for {cat.name}</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
