export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const [
    totalUsers,
    totalProfessionals,
    totalBookings,
    completedBookings,
    pendingBookings,
    totalOrders,
    revenueData,
    pendingVerifications,
    pendingWithdrawals,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.professional.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.order.count(),
    prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.professional.count({ where: { isVerified: false } }),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
  ]);

  const totalRevenue = Number(revenueData._sum.amount ?? 0);

  return apiSuccess({
    totalUsers,
    totalProfessionals,
    totalBookings,
    completedBookings,
    pendingBookings,
    totalOrders,
    totalRevenue,
    platformRevenue: totalRevenue * 0.05,
    lockedWalletBalance: totalRevenue * 0.05,
    pendingVerifications,
    pendingWithdrawals,
    completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
  });
}
