export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; adjId: string }> }
) {
  const { id, adjId } = await params;
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return apiError("Booking not found", 404);
  if (booking.customerId !== token.userId && token.role !== "ADMIN") {
    return apiError("Forbidden", 403);
  }

  const adjustment = await prisma.priceAdjustment.update({
    where: { id: adjId, bookingId: id },
    data: { isApproved: true, approvedAt: new Date() },
  });

  // Recalculate quoted price
  const allAdjustments = await prisma.priceAdjustment.findMany({
    where: { bookingId: id, isApproved: true },
  });
  const adjustmentTotal = allAdjustments.reduce((s, a) => s + Number(a.amount), 0);
  const base = Number(booking.estimatedPrice ?? booking.quotedPrice ?? 0);

  await prisma.booking.update({
    where: { id },
    data: { quotedPrice: base + adjustmentTotal },
  });

  return apiSuccess({ ...adjustment, amount: Number(adjustment.amount) });
}
