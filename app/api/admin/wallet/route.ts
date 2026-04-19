export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError, apiPaginated, getPaginationParams } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const ProcessWithdrawalSchema = z.object({
  withdrawalId: z.string(),
  action: z.enum(["APPROVE", "REJECT"]),
  adminNote: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);
  const status = req.nextUrl.searchParams.get("status") ?? "PENDING";

  const [withdrawals, total] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { status: status as "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED" },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        wallet: { include: { user: { select: { name: true, phone: true, role: true } } } },
      },
    }),
    prisma.withdrawal.count({ where: { status: status as "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED" } }),
  ]);

  return apiPaginated(
    withdrawals.map((w) => ({ ...w, amount: Number(w.amount) })),
    total,
    page,
    limit
  );
}

export async function PATCH(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = ProcessWithdrawalSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422);

  const { withdrawalId, action, adminNote } = parsed.data;

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { wallet: true },
  });
  if (!withdrawal) return apiError("Withdrawal not found", 404);
  if (withdrawal.status !== "PENDING") return apiError("Withdrawal already processed", 400);

  if (action === "REJECT") {
    // Refund amount back to wallet
    await prisma.$transaction([
      prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: "REJECTED", adminNote, processedAt: new Date(), processedBy: token.userId },
      }),
      prisma.wallet.update({
        where: { id: withdrawal.walletId },
        data: {
          availableBalance: { increment: withdrawal.amount },
          totalBalance: { increment: withdrawal.amount },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: withdrawal.walletId,
          type: "REFUND",
          status: "COMPLETED",
          amount: withdrawal.amount,
          balanceBefore: withdrawal.wallet.availableBalance,
          balanceAfter: Number(withdrawal.wallet.availableBalance) + Number(withdrawal.amount),
          description: `Withdrawal rejected: ${adminNote ?? "by admin"}`,
          referenceId: withdrawalId,
          referenceType: "withdrawal",
        },
      }),
    ]);
  } else {
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "PROCESSED", adminNote, processedAt: new Date(), processedBy: token.userId },
    });
  }

  return apiSuccess({ message: `Withdrawal ${action === "APPROVE" ? "approved" : "rejected"}` });
}
