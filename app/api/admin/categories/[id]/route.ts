export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  nameNp: z.string().optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const category = await prisma.serviceCategory.findUnique({ where: { id: params.id } });
  if (!category) return apiError("Category not found", 404);

  const updated = await prisma.serviceCategory.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return apiSuccess(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const category = await prisma.serviceCategory.findUnique({
    where: { id: params.id },
    include: { _count: { select: { services: true, professionals: true } } },
  });
  if (!category) return apiError("Category not found", 404);

  if (category._count.services > 0 || category._count.professionals > 0) {
    // Soft-delete instead
    await prisma.serviceCategory.update({ where: { id: params.id }, data: { isActive: false } });
    return apiSuccess({ message: "Category deactivated (has linked services/professionals)" });
  }

  await prisma.serviceCategory.delete({ where: { id: params.id } });
  return apiSuccess({ message: "Category deleted" });
}
