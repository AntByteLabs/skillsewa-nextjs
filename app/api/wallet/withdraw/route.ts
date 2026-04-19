export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

const WithdrawSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["ESEWA", "KHALTI", "BANK"]),
  accountDetails: z.record(z.string()),
});

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const body = await req.json();
  const parsed = WithdrawSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid request", 422, parsed.error.flatten());

  const { amount, method, accountDetails } = parsed.data;

  if (amount < config.business.minWithdrawalAmount) {
    return apiError(`Minimum withdrawal is Rs ${config.business.minWithdrawalAmount}`, 400);
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: token.userId } });
  if (!wallet) return apiError("Wallet not found", 404);

  if (Number(wallet.availableBalance) < amount) {
    return apiError("Insufficient available balance", 400);
  }

  const withdrawal = await prisma.$transaction(async (tx) => {
    const w = await tx.withdrawal.create({
      data: {
        walletId: wallet.id,
        amount,
        method,
        accountDetails,
        status: "PENDING",
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAWAL",
        status: "PENDING",
        amount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: Number(wallet.availableBalance) - amount,
        description: `Withdrawal via ${method}`,
        referenceId: w.id,
        referenceType: "withdrawal",
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { decrement: amount },
        totalBalance: { decrement: amount },
      },
    });

    return w;
  });

  return apiSuccess({ withdrawal: { id: withdrawal.id, status: withdrawal.status, amount } }, 201);
}
