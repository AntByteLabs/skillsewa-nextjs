import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { calculateCommission } from "@/lib/utils";
import { config } from "@/lib/config";

const UpdateBookingSchema = z.object({
  status: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  finalPrice: z.number().positive().optional(),
  cancelReason: z.string().optional(),
  cancelledBy: z.enum(["CUSTOMER", "PROFESSIONAL", "PROFESSIONAL_FAULT"]).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: { include: { category: true } },
      customer: { select: { name: true, phone: true } },
      professional: { include: { user: { select: { name: true, phone: true } } } },
      review: true,
      payment: true,
    },
  });

  if (!booking) return apiError("Booking not found", 404);
  return apiSuccess(booking);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const body = await req.json();
  const parsed = UpdateBookingSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { professional: true },
  });
  if (!booking) return apiError("Booking not found", 404);

  const { status, finalPrice, cancelReason, cancelledBy } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (status) {
    updateData.status = status;
    if (status === "IN_PROGRESS") updateData.startedAt = new Date();
    if (status === "CANCELLED") {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = cancelReason;
      updateData.cancelledBy = cancelledBy ?? "CUSTOMER";
    }
  }

  // Handle job completion: distribute earnings
  if (status === "COMPLETED" && finalPrice && booking.professionalId) {
    updateData.finalPrice = finalPrice;
    updateData.completedAt = new Date();

    const commission = calculateCommission(finalPrice);
    updateData.platformRevenue = commission.platformShare;
    updateData.walletCredit = commission.walletShare;

    const professional = await prisma.professional.findUnique({
      where: { id: booking.professionalId },
    });

    if (professional) {
      const proWallet = await prisma.wallet.findUnique({ where: { userId: professional.userId } });

      if (proWallet) {
        await prisma.$transaction([
          // Credit available earnings to professional
          prisma.wallet.update({
            where: { id: proWallet.id },
            data: {
              availableBalance: { increment: commission.professionalNet },
              lockedBalance: { increment: commission.walletShare },
              totalBalance: { increment: finalPrice - commission.platformShare },
              lifetimeEarned: { increment: finalPrice - commission.platformShare },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: proWallet.id,
              type: "CREDIT",
              status: "COMPLETED",
              amount: commission.professionalNet,
              balanceBefore: proWallet.availableBalance,
              balanceAfter: Number(proWallet.availableBalance) + commission.professionalNet,
              description: `Earnings from booking #${id.slice(-6)}`,
              referenceId: id,
              referenceType: "booking",
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: proWallet.id,
              type: "LOCK",
              status: "COMPLETED",
              amount: commission.walletShare,
              balanceBefore: proWallet.lockedBalance,
              balanceAfter: Number(proWallet.lockedBalance) + commission.walletShare,
              description: `Bonus fund (5%) from booking #${id.slice(-6)}`,
              referenceId: id,
              referenceType: "booking",
            },
          }),
          prisma.professional.update({
            where: { id: booking.professionalId },
            data: {
              jobsCompleted: { increment: 1 },
              jobsCount: { increment: 1 },
            },
          }),
          prisma.professionalEarning.create({
            data: {
              professionalId: booking.professionalId,
              bookingId: id,
              amount: finalPrice,
              commission: commission.total,
              netAmount: commission.professionalNet,
              bonusShare: commission.walletShare,
            },
          }),
        ]);

        // ── Referral payout ───────────────────────────────────────────────
        // If this professional was referred by someone, credit 30% of the
        // platform's 5% share (= 1.5% of finalPrice) to the referrer.
        if (professional.referredById) {
          const referralAmount = parseFloat(
            (commission.platformShare * config.business.professionalReferralRate).toFixed(2)
          );

          if (referralAmount > 0) {
            const referrer = await prisma.professional.findUnique({
              where: { id: professional.referredById },
            });

            if (referrer) {
              const referrerWallet = await prisma.wallet.findUnique({
                where: { userId: referrer.userId },
              });

              if (referrerWallet) {
                await prisma.$transaction([
                  prisma.wallet.update({
                    where: { id: referrerWallet.id },
                    data: {
                      availableBalance: { increment: referralAmount },
                      totalBalance: { increment: referralAmount },
                      lifetimeEarned: { increment: referralAmount },
                    },
                  }),
                  prisma.walletTransaction.create({
                    data: {
                      walletId: referrerWallet.id,
                      type: "REFERRAL_COMMISSION",
                      status: "COMPLETED",
                      amount: referralAmount,
                      balanceBefore: referrerWallet.availableBalance,
                      balanceAfter: Number(referrerWallet.availableBalance) + referralAmount,
                      description: `Referral commission from ${professional.id.slice(-6)} · booking #${id.slice(-6)}`,
                      referenceId: id,
                      referenceType: "referral",
                    },
                  }),
                  prisma.professional.update({
                    where: { id: referrer.id },
                    data: { referralEarnings: { increment: referralAmount } },
                  }),
                  prisma.professionalReferral.upsert({
                    where: { referredId: professional.id },
                    create: {
                      referrerId: referrer.id,
                      referredId: professional.id,
                      bookingId: id,
                      amount: referralAmount,
                    },
                    update: {
                      amount: { increment: referralAmount },
                      bookingId: id,
                    },
                  }),
                ]);
              }
            }
          }
        }
      }
    }
  }

  // Deduct professional rating if they are at fault
  if (status === "CANCELLED" && cancelledBy === "PROFESSIONAL_FAULT" && booking.professionalId) {
    await prisma.professional.update({
      where: { id: booking.professionalId },
      data: {
        ratingAvg: { decrement: 0.2 },
        ratingCount: { increment: 1 }, // counts as a bad review data point
      },
    });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: updateData,
    include: {
      service: { include: { category: true } },
      customer: { select: { name: true, phone: true } },
      professional: { include: { user: { select: { name: true } } } },
    },
  });

  return apiSuccess(updated);
}
