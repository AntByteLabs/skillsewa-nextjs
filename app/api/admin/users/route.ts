export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiError, apiPaginated, getPaginationParams } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);
  const role = req.nextUrl.searchParams.get("role");
  const search = req.nextUrl.searchParams.get("q");

  const where: Record<string, unknown> = { deletedAt: null };
  if (role) where.role = role;
  if (search) where.OR = [
    { name: { contains: search } },
    { phone: { contains: search } },
    { email: { contains: search } },
  ];

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        city: true,
        createdAt: true,
        _count: {
          select: {
            bookingsAsCustomer: true,
            ordersAsCustomer: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return apiPaginated(users, total, page, limit);
}
