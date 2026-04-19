export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError, apiPaginated, getPaginationParams } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const CreateServiceSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  priceUnit: z.string().default("per_visit"),
  durationMin: z.number().int().positive().default(60),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);
  const [services, total] = await Promise.all([
    prisma.service.findMany({
      include: { category: true, _count: { select: { bookings: true, issues: true } } },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      skip,
      take: limit,
    }),
    prisma.service.count(),
  ]);
  return apiPaginated(services, total, page, limit);
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = CreateServiceSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const service = await prisma.service.create({ data: parsed.data, include: { category: true } });
  return apiSuccess(service, 201);
}
