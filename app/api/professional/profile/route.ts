export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "PROFESSIONAL") return apiError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: token.userId },
    include: {
      professional: {
        include: {
          skillCategories: { include: { category: true } },
        },
      },
      wallet: true,
    },
  });

  if (!user || !user.professional) return apiError("Not found", 404);
  const pro = user.professional;

  return apiSuccess({
    id: user.id, name: user.name, phone: user.phone, email: user.email,
    city: user.city, createdAt: user.createdAt, isVerified: user.isVerified,
    professional: {
      id: pro.id, grade: pro.grade,
      ratingAvg: Number(pro.ratingAvg), ratingCount: pro.ratingCount,
      jobsCompleted: pro.jobsCompleted, responseRate: Number(pro.responseRate),
      loyaltyMonths: pro.loyaltyMonths, isVerified: pro.isVerified, bio: pro.bio,
      skillCategories: pro.skillCategories.map(sc => ({
        id: sc.id, yearsExp: sc.yearsExp, category: sc.category,
      })),
    },
    wallet: user.wallet ? {
      availableBalance: Number(user.wallet.availableBalance),
      lockedBalance: Number(user.wallet.lockedBalance),
      lifetimeEarned: Number(user.wallet.lifetimeEarned),
    } : null,
  });
}
