export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const UpdateServiceSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  basePrice: z.number().positive().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  priceUnit: z.string().optional(),
  durationMin: z.number().int().positive().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  categoryId: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const service = await prisma.service.findUnique({
    where: { id },
    include: { category: true, issues: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!service) return apiError("Not found", 404);
  return apiSuccess(service);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = UpdateServiceSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422);

  const service = await prisma.service.update({ where: { id }, data: parsed.data, include: { category: true } });
  return apiSuccess(service);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  await prisma.service.update({ where: { id }, data: { isActive: false } });
  return apiSuccess({ message: "Service deactivated" });
}
