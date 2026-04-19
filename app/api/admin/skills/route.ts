export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiError, apiPaginated, getPaginationParams } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);
  const status = req.nextUrl.searchParams.get("status") ?? "PENDING";

  const where = status === "ALL" ? {} : { status: status as "PENDING" | "APPROVED" | "REJECTED" };

  const [requests, total] = await Promise.all([
    prisma.skillRequest.findMany({
      where,
      include: {
        professional: { include: { user: { select: { name: true, phone: true } } } },
        category: true,
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.skillRequest.count({ where }),
  ]);

  return apiPaginated(requests, total, page, limit);
}
