export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const RequestSchema = z.object({
  categoryId: z.string(),
  yearsExp: z.number().int().min(0).max(50),
  documentUrl: z.string().min(1, "Document is required"),
});

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "PROFESSIONAL") return apiError("Unauthorized", 401);

  const professional = await prisma.professional.findUnique({ where: { userId: token.userId } });
  if (!professional) return apiError("Not found", 404);

  const requests = await prisma.skillRequest.findMany({
    where: { professionalId: professional.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
  return apiSuccess(requests);
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "PROFESSIONAL") return apiError("Unauthorized", 401);

  const professional = await prisma.professional.findUnique({ where: { userId: token.userId } });
  if (!professional) return apiError("Not found", 404);

  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const { categoryId, yearsExp, documentUrl } = parsed.data;

  // Check for existing PENDING or APPROVED request
  const existing = await prisma.skillRequest.findFirst({
    where: { professionalId: professional.id, categoryId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) return apiError(
    existing.status === "APPROVED"
      ? "This skill is already approved for you"
      : "You already have a pending request for this skill",
    409
  );

  const request = await prisma.skillRequest.create({
    data: { professionalId: professional.id, categoryId, yearsExp, documentUrl },
    include: { category: true },
  });
  return apiSuccess(request, 201);
}
