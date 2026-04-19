export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError, apiPaginated, getPaginationParams } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const CreateProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  category: z.enum(["TOOLS", "EQUIPMENT", "CLEANING_SUPPLIES", "SAFETY_GEAR", "PARTS", "MATERIALS", "OTHER"]),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional(),
  stock: z.number().int().min(0),
  unit: z.string().default("piece"),
  imageUrl: z.string().url().optional(),
  sku: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);
  const category = req.nextUrl.searchParams.get("category");
  const search = req.nextUrl.searchParams.get("q");
  const featured = req.nextUrl.searchParams.get("featured") === "true";
  const supplierId = req.nextUrl.searchParams.get("supplierId");

  const where: Record<string, unknown> = { isActive: true };
  if (category) where.category = category;
  if (featured) where.isFeatured = true;
  if (supplierId) where.supplierId = supplierId;
  if (search) where.name = { contains: search };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { supplier: { select: { businessName: true, isVerified: true } } },
      orderBy: [{ isFeatured: "desc" }, { totalSold: "desc" }],
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return apiPaginated(
    products.map((p) => ({ ...p, price: Number(p.price), comparePrice: p.comparePrice ? Number(p.comparePrice) : null })),
    total,
    page,
    limit
  );
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || !["SUPPLIER", "ADMIN"].includes(token.role)) return apiError("Forbidden", 403);

  const supplier = await prisma.supplier.findUnique({ where: { userId: token.userId } });
  if (!supplier && token.role !== "ADMIN") return apiError("Supplier profile not found", 404);

  const body = await req.json();
  const parsed = CreateProductSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  let slug = slugify(parsed.data.name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      supplierId: supplier?.id ?? "",
      slug,
    },
  });

  return apiSuccess(product, 201);
}
