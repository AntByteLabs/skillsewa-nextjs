export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const EstimateSchema = z.object({
  serviceId: z.string(),
  issueIds: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = EstimateSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid request", 422);

  const { serviceId, issueIds } = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return apiError("Service not found", 404);

  if (issueIds.length === 0) {
    return apiSuccess({
      estimatedPrice: Number(service.basePrice),
      minPrice: Number(service.minPrice ?? service.basePrice),
      maxPrice: Number(service.maxPrice ?? service.basePrice),
      breakdown: [],
    });
  }

  const issues = await prisma.serviceIssue.findMany({
    where: { id: { in: issueIds }, serviceId, isActive: true },
  });

  const estimatedPrice = issues.reduce((s, i) => s + Number(i.basePrice), 0);
  const minPrice = issues.reduce((s, i) => s + Number(i.minPrice), 0);
  const maxPrice = issues.reduce((s, i) => s + Number(i.maxPrice), 0);

  return apiSuccess({
    estimatedPrice,
    minPrice,
    maxPrice,
    breakdown: issues.map((i) => ({
      issueId: i.id,
      name: i.name,
      basePrice: Number(i.basePrice),
      minPrice: Number(i.minPrice),
      maxPrice: Number(i.maxPrice),
    })),
  });
}
