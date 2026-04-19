export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return apiError("Service not found", 404);

  const issues = await prisma.serviceIssue.findMany({
    where: { serviceId: id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return apiSuccess(
    issues.map((i) => ({
      ...i,
      basePrice: Number(i.basePrice),
      minPrice: Number(i.minPrice),
      maxPrice: Number(i.maxPrice),
    }))
  );
}
