export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  comparePrice: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { supplier: true },
  });
  if (!product) return apiError("Not found", 404);

  // Only the supplier who owns it or admin can edit
  if (token.role !== "ADMIN" && product.supplier.userId !== token.userId) {
    return apiError("Forbidden", 403);
  }

  const body = await req.json();
  const parsed = UpdateProductSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return apiSuccess(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { supplier: true },
  });
  if (!product) return apiError("Not found", 404);

  if (token.role !== "ADMIN" && product.supplier.userId !== token.userId) {
    return apiError("Forbidden", 403);
  }

  await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return apiSuccess({ deleted: true });
}
