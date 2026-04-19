import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// Generate a unique 8-char alphanumeric referral code
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /api/professional/referral — return referral stats + code
export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const professional = await prisma.professional.findUnique({
    where: { userId: token.userId },
    select: {
      id: true,
      referralCode: true,
      referralEarnings: true,
      referrals: {
        select: {
          id: true,
          grade: true,
          jobsCompleted: true,
          referralSource: { select: { amount: true, createdAt: true } },
          user: { select: { name: true, createdAt: true } },
        },
      },
      referralsMade: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          bookingId: true,
          referred: {
            select: {
              id: true,
              jobsCompleted: true,
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!professional) return apiError("Professional not found", 404);

  // Auto-generate code on first fetch if not set
  if (!professional.referralCode) {
    let code = generateCode();
    // Ensure uniqueness
    while (await prisma.professional.findUnique({ where: { referralCode: code } })) {
      code = generateCode();
    }
    await prisma.professional.update({
      where: { userId: token.userId },
      data: { referralCode: code },
    });
    professional.referralCode = code;
  }

  return apiSuccess({
    referralCode: professional.referralCode,
    totalEarnings: Number(professional.referralEarnings),
    referredCount: professional.referrals.length,
    referrals: professional.referrals.map((r) => ({
      id: r.id,
      name: r.user.name,
      grade: r.grade,
      jobsCompleted: r.jobsCompleted,
      joinedAt: r.user.createdAt,
      earningsFromThis: Number(r.referralSource?.amount ?? 0),
    })),
    recentPayouts: professional.referralsMade.map((rm) => ({
      id: rm.id,
      amount: Number(rm.amount),
      createdAt: rm.createdAt,
      bookingId: rm.bookingId,
      referredName: rm.referred.user.name,
    })),
  });
}

// POST /api/professional/referral — regenerate referral code
export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const professional = await prisma.professional.findUnique({
    where: { userId: token.userId },
    select: { id: true },
  });
  if (!professional) return apiError("Professional not found", 404);

  let code = generateCode();
  while (await prisma.professional.findUnique({ where: { referralCode: code } })) {
    code = generateCode();
  }

  await prisma.professional.update({
    where: { id: professional.id },
    data: { referralCode: code },
  });

  return apiSuccess({ referralCode: code });
}
