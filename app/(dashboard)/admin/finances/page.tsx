export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Wallet, CreditCard, ArrowUpRight, ArrowDownLeft } from "lucide-react";

async function getFinanceData() {
  const [
    completedBookings,
    earningsSummary,
    pendingWithdrawals,
    processedWithdrawals,
    recentTransactions,
    recentWithdrawals,
    bookingsByMonth,
  ] = await Promise.all([
    // Sum from actual completed bookings
    prisma.booking.aggregate({
      where: { status: "COMPLETED" },
      _sum: { finalPrice: true, platformRevenue: true, connectionFee: true },
      _count: true,
    }),
    // Professional earnings (commission = platform cut)
    prisma.professionalEarning.aggregate({
      _sum: { amount: true, commission: true, netAmount: true },
    }),
    prisma.withdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
    prisma.withdrawal.aggregate({ where: { status: "PROCESSED" }, _sum: { amount: true } }),
    prisma.walletTransaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { wallet: { include: { user: { select: { name: true, role: true } } } } },
    }),
    prisma.withdrawal.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { wallet: { include: { user: { select: { name: true } } } } },
    }),
    // Monthly revenue last 6 months
    prisma.booking.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
      select: { completedAt: true, finalPrice: true, platformRevenue: true },
      orderBy: { completedAt: "asc" },
    }),
  ]);

  const totalVolume = Number(completedBookings._sum.finalPrice ?? 0);
  // Platform revenue = sum of platformRevenue field, or fallback to 5% of volume
  const platformRevenue = Number(completedBookings._sum.platformRevenue ?? 0) ||
    Number(earningsSummary._sum.commission ?? 0) ||
    totalVolume * 0.05;
  const connectionFees = Number(completedBookings._sum.connectionFee ?? 0);

  return {
    totalVolume,
    platformRevenue,
    connectionFees,
    pendingWithdrawals: Number(pendingWithdrawals._sum.amount ?? 0),
    pendingWithdrawalsCount: pendingWithdrawals._count,
    processedWithdrawals: Number(processedWithdrawals._sum.amount ?? 0),
    completedJobs: completedBookings._count,
    recentTransactions,
    recentWithdrawals,
    bookingsByMonth,
  };
}

export default async function AdminFinancesPage() {
  const data = await getFinanceData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finances</h1>
        <p className="text-muted-foreground">Platform revenue and earnings analytics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total GMV"
          value={formatCurrency(data.totalVolume)}
          description={`${data.completedJobs} completed jobs`}
          icon={CreditCard}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(data.platformRevenue)}
          description="Commission + connection fees"
          icon={DollarSign}
          iconColor="text-green-600"
        />
        <StatCard
          title="Connection Fees"
          value={formatCurrency(data.connectionFees)}
          description="Per-booking connection fee"
          icon={Wallet}
          iconColor="text-purple-600"
        />
        <StatCard
          title="Withdrawals Pending"
          value={formatCurrency(data.pendingWithdrawals)}
          description={`${data.pendingWithdrawalsCount} requests`}
          icon={TrendingUp}
          iconColor="text-orange-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent wallet transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Wallet Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-6 py-3">
                  <div className={`rounded-full p-2 ${tx.type === "CREDIT" || tx.type === "UNLOCK" ? "bg-green-50" : "bg-red-50"}`}>
                    {tx.type === "CREDIT" || tx.type === "UNLOCK"
                      ? <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      : <ArrowUpRight className="h-4 w-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.wallet.user.name}</p>
                    <p className="text-xs text-muted-foreground">{tx.description ?? tx.type} · {tx.wallet.user.role}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                      {tx.type === "CREDIT" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
              ))}
              {data.recentTransactions.length === 0 && (
                <p className="px-6 py-8 text-sm text-muted-foreground text-center">No transactions yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Withdrawal Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.recentWithdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between px-6 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{w.wallet.user.name}</p>
                    <p className="text-xs text-muted-foreground">{w.method} · {formatDate(w.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatCurrency(Number(w.amount))}</span>
                    <Badge variant={
                      w.status === "PROCESSED" ? "success" :
                      w.status === "PENDING" ? "pending" :
                      w.status === "APPROVED" ? "info" : "destructive"
                    }>
                      {w.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {data.recentWithdrawals.length === 0 && (
                <p className="px-6 py-8 text-sm text-muted-foreground text-center">No withdrawal requests yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Gross Merchandise Value", value: formatCurrency(data.totalVolume), sub: "Total value of completed services" },
              { label: "Platform Commission (5%)", value: formatCurrency(data.totalVolume * 0.05), sub: "Deducted from professional earnings" },
              { label: "Professional Payouts", value: formatCurrency(data.totalVolume * 0.9), sub: "90% net to professionals" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
