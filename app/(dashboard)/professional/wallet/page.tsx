export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Wallet, Lock, TrendingUp, ArrowUpRight, ArrowDownLeft, Info } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function ProfessionalWalletPage() {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      locks: {
        where: { isLocked: true },
      },
      withdrawals: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!wallet) {
    return <div className="text-center py-20 text-muted-foreground">Wallet not found</div>;
  }

  const professional = await prisma.professional.findUnique({ where: { userId } });

  const unlockProgress = professional
    ? {
        jobs: { current: professional.jobsCompleted, required: 10 },
        rating: { current: Number(professional.ratingAvg), required: 4.0 },
        months: { current: professional.loyaltyMonths, required: 3 },
      }
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">Your earnings, bonus fund, and withdrawals</p>
      </div>

      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-brand-200 bg-brand-50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-brand-700 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-brand-700">{formatCurrency(Number(wallet.availableBalance))}</p>
            <p className="text-xs text-brand-600 mt-1">Ready to withdraw</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-orange-600" />
              <p className="text-sm font-medium text-orange-700">Locked Bonus</p>
            </div>
            <p className="text-3xl font-bold text-orange-700">{formatCurrency(Number(wallet.lockedBalance))}</p>
            <p className="text-xs text-orange-600 mt-1">Unlocks on milestone</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Lifetime Earned</p>
            <p className="text-3xl font-bold">{formatCurrency(Number(wallet.lifetimeEarned))}</p>
            <p className="text-xs text-muted-foreground mt-1">Total earned on platform</p>
          </CardContent>
        </Card>
      </div>

      {/* Unlock progress */}
      {unlockProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" /> Bonus Fund Unlock Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700">
                Complete all 3 milestones to unlock your bonus fund. Meet any one milestone to partially unlock.
              </p>
            </div>
            {[
              { label: "Jobs Completed", current: unlockProgress.jobs.current, required: unlockProgress.jobs.required, unit: "jobs" },
              { label: "Rating", current: unlockProgress.rating.current, required: unlockProgress.rating.required, unit: "stars" },
              { label: "Platform Tenure", current: unlockProgress.months.current, required: unlockProgress.months.required, unit: "months" },
            ].map((m) => {
              const pct = Math.min(100, (m.current / m.required) * 100);
              const done = m.current >= m.required;
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium">{m.label}</span>
                    <span className={done ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                      {m.current} / {m.required} {m.unit} {done ? "✓" : ""}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-brand-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {wallet.transactions.map((tx) => {
              const isCredit = tx.type === "CREDIT" || tx.type === "UNLOCK";
              return (
                <div key={tx.id} className="flex items-center gap-3 px-6 py-3.5">
                  <div className={`rounded-full p-2 ${isCredit ? "bg-green-50" : "bg-red-50"}`}>
                    {isCredit
                      ? <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      : <ArrowUpRight className="h-4 w-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{tx.description ?? tx.type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                      {isCredit ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                    </p>
                    <Badge variant={tx.status === "COMPLETED" ? "success" : "pending"} className="text-xs">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {wallet.transactions.length === 0 && (
              <p className="px-6 py-8 text-sm text-muted-foreground text-center">No transactions yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
