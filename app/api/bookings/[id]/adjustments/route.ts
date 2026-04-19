export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const AddAdjustmentSchema = z.object({
  description: z.string().min(3).max(200),
  amount: z.number().positive(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const adjustments = await prisma.priceAdjustment.findMany({
    where: { bookingId: id },
    orderBy: { createdAt: "asc" },
  });

  return apiSuccess(adjustments.map((a) => ({ ...a, amount: Number(a.amount) })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  // Only the assigned professional can add adjustments
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { professional: true },
  });
  if (!booking) return apiError("Booking not found", 404);

  const isPro = booking.professional?.userId === token.userId;
  const isAdmin = token.role === "ADMIN";
  if (!isPro && !isAdmin) return apiError("Forbidden", 403);

  if (!["CONFIRMED", "IN_PROGRESS"].includes(booking.status)) {
    return apiError("Can only add adjustments to active bookings", 400);
  }

  const body = await req.json();
  const parsed = AddAdjustmentSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const adjustment = await prisma.priceAdjustment.create({
    data: {
      bookingId: id,
      description: parsed.data.description,
      amount: parsed.data.amount,
    },
  });

  return apiSuccess({ ...adjustment, amount: Number(adjustment.amount) }, 201);
}
