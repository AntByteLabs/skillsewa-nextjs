export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const wallet = await prisma.wallet.findUnique({
    where: { userId: token.userId },
  });

  if (!wallet) return apiError("Wallet not found", 404);

  return apiSuccess({
    id: wallet.id,
    userId: wallet.userId,
    totalBalance: Number(wallet.totalBalance),
    availableBalance: Number(wallet.availableBalance),
    lockedBalance: Number(wallet.lockedBalance),
    lifetimeEarned: Number(wallet.lifetimeEarned),
    lifetimeSpent: Number(wallet.lifetimeSpent),
  });
}
