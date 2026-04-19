export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Wrench, Zap, Droplets, Paintbrush, Leaf, Home, Truck, Wind,
  Tv, Scissors, Package, Search, ArrowRight
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  plumbing: Droplets, electrical: Zap, cleaning: Wrench, painting: Paintbrush,
  carpentry: Home, gardening: Leaf, moving: Truck, ac_service: Wind,
  tv_repair: Tv, salon: Scissors, other: Package,
};

async function getData() {
  const [categories, services] = await Promise.all([
    prisma.serviceCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]).catch(() => [[], []]);
  return { categories, services };
}

export default async function ServicesPage() {
  const { categories, services } = await getData();

  const grouped = categories.map((cat) => ({
    ...cat,
    services: services.filter((s) => s.categoryId === cat.id),
  })).filter((g) => g.services.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-brand-600">Home</Link>
            <span>/</span>
            <span className="text-gray-900">Services</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">All Services</h1>
          <p className="text-gray-500 max-w-xl">
            Browse all home services offered on SkillSewa. Select a service to book a verified professional.
          </p>
          <div className="mt-6 flex gap-2 bg-white border rounded-xl shadow-sm p-2 max-w-lg">
            <Search className="h-5 w-5 text-gray-400 ml-2 self-center shrink-0" />
            <input
              type="text"
              placeholder='Search services…'
              className="flex-1 px-2 py-1.5 text-sm outline-none"
            />
            <Link href="/book">
              <button className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                Book Now
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {grouped.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No services available yet</h3>
            <p className="text-muted-foreground">Services will appear here once added by the admin.</p>
          </div>
        ) : (
          grouped.map((group) => {
            const Icon = CATEGORY_ICONS[group.code] ?? Package;
            return (
              <section key={group.id}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{group.name}</h2>
                    <p className="text-sm text-muted-foreground">{group.services.length} service{group.services.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.services.map((service) => (
                    <Link key={service.id} href={`/book?serviceId=${service.id}`}>
                      <div className="bg-white rounded-2xl border hover:shadow-md hover:border-brand-300 transition-all p-5 h-full flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                            <Icon className="h-5 w-5 text-brand-600" />
                          </div>
                          {service.isFeatured && (
                            <Badge variant="info" className="text-xs">Popular</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 leading-tight mb-1">{service.name}</h3>
                        {service.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{service.description}</p>
                        )}
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-brand-700">
                              {service.minPrice
                                ? `From ${formatCurrency(Number(service.minPrice))}`
                                : formatCurrency(Number(service.basePrice))}
                            </span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-brand-600" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
