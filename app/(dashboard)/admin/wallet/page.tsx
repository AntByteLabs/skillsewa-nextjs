export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Wallet, Lock, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminWalletPage() {
  const [
    walletStats,
    pendingWithdrawals,
    processedWithdrawals,
  ] = await Promise.all([
    prisma.wallet.aggregate({
      _sum: { availableBalance: true, lockedBalance: true, lifetimeEarned: true },
      _count: true,
    }),
    prisma.withdrawal.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 20,
      include: { wallet: { include: { user: { select: { name: true, phone: true, role: true } } } } },
    }),
    prisma.withdrawal.findMany({
      where: { status: { in: ["PROCESSED", "REJECTED"] } },
      orderBy: { processedAt: "desc" },
      take: 10,
      include: { wallet: { include: { user: { select: { name: true, phone: true } } } } },
    }),
  ]);

  const totalAvailable = Number(walletStats._sum.availableBalance ?? 0);
  const totalLocked = Number(walletStats._sum.lockedBalance ?? 0);
  const totalLifetime = Number(walletStats._sum.lifetimeEarned ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet Control</h1>
        <p className="text-muted-foreground">Monitor all platform wallets and withdrawal requests</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Available" value={formatCurrency(totalAvailable)} description={`${walletStats._count} wallets`} icon={Wallet} iconColor="text-green-600" />
        <StatCard title="Total Locked" value={formatCurrency(totalLocked)} description="Bonus fund reserves" icon={Lock} iconColor="text-orange-600" />
        <StatCard title="Lifetime Paid Out" value={formatCurrency(totalLifetime)} icon={TrendingUp} iconColor="text-brand-600" />
      </div>

      {/* Pending withdrawals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pending Withdrawals ({pendingWithdrawals.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {pendingWithdrawals.map((w) => (
              <div key={w.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{w.wallet.user.name}</p>
                  <p className="text-xs text-muted-foreground">{w.wallet.user.phone} · {w.method}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(w.createdAt)}</p>
                </div>
                <p className="font-semibold text-sm">{formatCurrency(Number(w.amount))}</p>
                <div className="flex gap-2">
                  <form action={`/api/admin/wallet`} method="PATCH">
                    <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                  </form>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
            {pendingWithdrawals.length === 0 && (
              <p className="px-6 py-8 text-sm text-muted-foreground text-center">No pending withdrawal requests</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processed */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recently Processed</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {processedWithdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <p className="text-sm font-medium">{w.wallet.user.name}</p>
                  <p className="text-xs text-muted-foreground">{w.method} · {w.processedAt ? formatDate(w.processedAt) : "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatCurrency(Number(w.amount))}</span>
                  <Badge variant={w.status === "PROCESSED" ? "success" : "destructive"}>{w.status}</Badge>
                </div>
              </div>
            ))}
            {processedWithdrawals.length === 0 && (
              <p className="px-6 py-8 text-sm text-muted-foreground text-center">No processed withdrawals</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
