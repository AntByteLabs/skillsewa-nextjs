export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const ReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422);

  const { status, adminNote } = parsed.data;

  const request = await prisma.skillRequest.findUnique({
    where: { id },
    include: { professional: true, category: true },
  });
  if (!request) return apiError("Request not found", 404);
  if (request.status !== "PENDING") return apiError("Already reviewed", 409);

  const updated = await prisma.$transaction(async (tx) => {
    const req = await tx.skillRequest.update({
      where: { id },
      data: {
        status,
        adminNote,
        reviewedAt: new Date(),
        reviewedBy: token.userId,
      },
      include: { category: true, professional: { include: { user: { select: { name: true } } } } },
    });

    if (status === "APPROVED") {
      // Add to professional's approved skill categories (upsert to avoid duplicates)
      await tx.professionalSkillCategory.upsert({
        where: {
          professionalId_categoryId: {
            professionalId: request.professionalId,
            categoryId: request.categoryId,
          },
        },
        create: {
          professionalId: request.professionalId,
          categoryId: request.categoryId,
          yearsExp: request.yearsExp,
        },
        update: { yearsExp: request.yearsExp },
      });
    }

    return req;
  });

  return apiSuccess(updated);
}
