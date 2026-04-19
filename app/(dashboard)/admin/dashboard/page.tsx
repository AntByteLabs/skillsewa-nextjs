export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  Users, Briefcase, DollarSign, Package, Star, AlertCircle,
  CheckCircle, Clock, TrendingUp, Wallet, ArrowUpRight,
  ArrowDownLeft, Shield, Zap, Gift, Activity,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-NP", { day: "numeric", month: "short" }).format(d);
}
function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("en-NP", { hour: "numeric", minute: "2-digit", hour12: true }).format(d);
}
function ago(d: Date) {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return fmt(d);
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  COMPLETED:   { label: "Completed",   color: "text-green-700",  bg: "bg-green-50",   dot: "bg-green-500"  },
  CONFIRMED:   { label: "Confirmed",   color: "text-brand-700",  bg: "bg-brand-50",   dot: "bg-brand-500"  },
  PENDING:     { label: "Pending",     color: "text-amber-700",  bg: "bg-amber-50",   dot: "bg-amber-400"  },
  IN_PROGRESS: { label: "In Progress", color: "text-orange-700", bg: "bg-orange-50",  dot: "bg-orange-500" },
  CANCELLED:   { label: "Cancelled",   color: "text-red-700",    bg: "bg-red-50",     dot: "bg-red-400"    },
  DISPUTED:    { label: "Disputed",    color: "text-purple-700", bg: "bg-purple-50",  dot: "bg-purple-400" },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-50", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

const GRADE_META: Record<string, { color: string; bg: string }> = {
  BRONZE:   { color: "text-amber-700",  bg: "bg-amber-50"  },
  SILVER:   { color: "text-gray-600",   bg: "bg-gray-100"  },
  GOLD:     { color: "text-yellow-700", bg: "bg-yellow-50" },
  PLATINUM: { color: "text-cyan-700",   bg: "bg-cyan-50"   },
  ELITE:    { color: "text-purple-700", bg: "bg-purple-50" },
};

// ─── data fetching ─────────────────────────────────────────────────────────────

async function getAdminStats() {
  const now = new Date();
  const firstOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLast   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLast     = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Build monthly buckets for the last 7 months (for sparklines / bar chart)
  const months = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
    return {
      label: d.toLocaleString("en", { month: "short" }),
      start: d,
      end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    };
  });

  const [
    // Counts
    totalUsers,
    totalUsersLast,
    totalProfessionals,
    totalProfessionalsLast,
    totalBookings,
    totalBookingsLast,
    completedBookings,
    pendingBookings,
    activeBookings,
    cancelledBookings,
    totalOrders,
    totalOrdersLast,
    // Revenue aggregates
    allPayments,
    thisMonthPayments,
    lastMonthPayments,
    connectionFeesTotal,
    referralCommissionsTotal,
    // Pending actions
    pendingVerifications,
    pendingWithdrawals,
    pendingWithdrawalAmount,
    // Wallet / bonus fund
    bonusFundData,
    // Top professionals
    topProfessionals,
    // Recent bookings
    recentBookings,
    // Service category breakdown
    categoryStats,
    // Recent wallet transactions (activity)
    recentActivity,
    // Professional grade distribution
    gradeDist,
    // Ratings
    avgRating,
    // New this month
    newUsersThisMonth,
    newProfessionalsThisMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true, createdAt: { lt: firstOfMonth } } }),
    prisma.professional.count(),
    prisma.professional.count({ where: { createdAt: { lt: firstOfMonth } } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { lt: firstOfMonth } } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: { in: ["CONFIRMED", "IN_PROGRESS"] } } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { lt: firstOfMonth } } }),
    // All-time payment volume
    prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    // This month payments
    prisma.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: firstOfMonth } }, _sum: { amount: true } }),
    // Last month payments
    prisma.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: firstOfLast, lte: endOfLast } }, _sum: { amount: true } }),
    // Connection fees (sum of connectionFee from completed bookings)
    prisma.booking.aggregate({ where: { status: "COMPLETED" }, _sum: { connectionFee: true } }),
    // Referral commissions total (wallet transactions of type REFERRAL_COMMISSION)
    prisma.walletTransaction.aggregate({
      where: { type: "REFERRAL_COMMISSION", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.professional.count({ where: { isVerified: false } }),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
    prisma.withdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
    // Bonus fund = sum of all locked balances across professional wallets
    prisma.wallet.aggregate({
      where: { user: { role: "PROFESSIONAL" } },
      _sum: { lockedBalance: true, availableBalance: true },
    }),
    // Top 5 professionals by completed jobs
    prisma.professional.findMany({
      take: 5,
      orderBy: { jobsCompleted: "desc" },
      include: {
        user: { select: { name: true } },
        skillCategories: { include: { category: { select: { name: true } } }, take: 1 },
      },
    }),
    // Recent 10 bookings
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        customer:     { select: { name: true } },
        professional: { include: { user: { select: { name: true } } } },
        service:      { select: { name: true } },
      },
    }),
    // Bookings per service category
    prisma.booking.groupBy({
      by: ["serviceId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    // Recent activity: last 6 wallet transactions (any type) + recent reviews
    prisma.walletTransaction.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      where: { status: "COMPLETED" },
      include: { wallet: { include: { user: { select: { name: true, role: true } } } } },
    }),
    // Grade distribution
    prisma.professional.groupBy({ by: ["grade"], _count: { id: true } }),
    // Avg customer rating from reviews
    prisma.review.aggregate({ _avg: { rating: true }, _count: { id: true } }),
    // New users this month
    prisma.user.count({ where: { createdAt: { gte: firstOfMonth } } }),
    prisma.professional.count({ where: { createdAt: { gte: firstOfMonth } } }),
  ]);

  // Monthly booking counts for bar chart
  const monthlyBookings = await Promise.all(
    months.map((m) =>
      prisma.booking.count({ where: { createdAt: { gte: m.start, lte: m.end } } })
    )
  );

  // Monthly revenue for bar chart
  const monthlyRevenue = await Promise.all(
    months.map((m) =>
      prisma.payment.aggregate({
        where: { status: "COMPLETED", paidAt: { gte: m.start, lte: m.end } },
        _sum: { amount: true },
      }).then((r) => Number(r._sum.amount ?? 0) * 0.05)
    )
  );

  // Resolve service names for category breakdown
  const serviceIds = categoryStats.map((s) => s.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    include: { category: { select: { name: true } } },
  });

  const categoryBreakdown = categoryStats.map((s) => {
    const svc = services.find((sv) => sv.id === s.serviceId);
    return { name: svc?.name ?? "Unknown", category: svc?.category.name ?? "", count: s._count.id };
  });

  const totalVolume    = Number(allPayments._sum.amount ?? 0);
  const thisMonthVol   = Number(thisMonthPayments._sum.amount ?? 0);
  const lastMonthVol   = Number(lastMonthPayments._sum.amount ?? 0);
  const platformRev    = totalVolume * 0.05;
  const thisMonthRev   = thisMonthVol * 0.05;
  const lastMonthRev   = lastMonthVol * 0.05;
  const connFees       = Number(connectionFeesTotal._sum.connectionFee ?? 0);
  const referralTotal  = Number(referralCommissionsTotal._sum.amount ?? 0);
  const bonusLocked    = Number(bonusFundData._sum.lockedBalance ?? 0);
  const bonusAvailable = Number(bonusFundData._sum.availableBalance ?? 0);

  // Growth helpers
  const growth = (curr: number, prev: number) =>
    prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

  return {
    // Counts
    totalUsers, totalProfessionals, totalBookings, completedBookings,
    pendingBookings, activeBookings, cancelledBookings, totalOrders,
    newUsersThisMonth, newProfessionalsThisMonth,
    // Revenue
    totalVolume, thisMonthVol, lastMonthVol,
    platformRev, thisMonthRev, lastMonthRev,
    connFees, referralTotal,
    bonusLocked, bonusAvailable,
    // Pending
    pendingVerifications, pendingWithdrawals,
    pendingWithdrawalAmount: Number(pendingWithdrawalAmount._sum.amount ?? 0),
    // Growth
    userGrowth: growth(totalUsers, totalUsersLast),
    proGrowth:  growth(totalProfessionals, totalProfessionalsLast),
    bookingGrowth: growth(totalBookings, totalBookingsLast),
    revenueGrowth: growth(thisMonthRev, lastMonthRev),
    orderGrowth: growth(totalOrders, totalOrdersLast),
    // Lists
    topProfessionals, recentBookings, categoryBreakdown, recentActivity, gradeDist,
    // Chart data
    months: months.map((m) => m.label),
    monthlyBookings, monthlyRevenue,
    // Platform health
    completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
    avgRating: Number(avgRating._avg.rating ?? 0),
    totalReviews: avgRating._count.id,
  };
}

// ─── page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const s = await getAdminStats();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-NP", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const maxMonthlyBookings = Math.max(...s.monthlyBookings, 1);
  const maxMonthlyRevenue  = Math.max(...s.monthlyRevenue, 1);

  // Sparkline weights for stat cards
  const spark = [0.3, 0.45, 0.4, 0.62, 0.55, 0.8, 1.0];

  const maxCat = Math.max(...s.categoryBreakdown.map((c) => c.count), 1);

  return (
    <div className="space-y-5 pb-10">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}, Admin 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here&apos;s what&apos;s happening on SkillSewa today
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-white border border-border text-xs text-muted-foreground font-medium shadow-sm">
            📅 {dateStr}
          </span>
        </div>
      </div>

      {/* ── ALERT BANNERS ──────────────────────────────────────── */}
      {(s.pendingVerifications > 0 || s.pendingWithdrawals > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {s.pendingVerifications > 0 && (
            <Link href="/admin/professionals" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition-colors">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {s.pendingVerifications} professional{s.pendingVerifications > 1 ? "s" : ""} awaiting verification
                </p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            </Link>
          )}
          {s.pendingWithdrawals > 0 && (
            <Link href="/admin/wallet" className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 hover:bg-blue-100 transition-colors">
              <Wallet className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-800">
                  {s.pendingWithdrawals} withdrawal{s.pendingWithdrawals > 1 ? "s" : ""} pending · {formatCurrency(s.pendingWithdrawalAmount)}
                </p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* ── ROW 1: STAT CARDS ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Users */}
        <div className="relative bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-brand-400 to-brand-600" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-brand-600" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.userGrowth >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {s.userGrowth >= 0 ? "↑" : "↓"} {Math.abs(s.userGrowth)}%
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{s.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Active Users</p>
            <div className="flex items-end gap-0.5 h-6 mt-3">
              {spark.map((v, i) => (
                <div key={i} className="flex-1 rounded-sm rounded-t bg-brand-500 opacity-60"
                  style={{ height: `${Math.max(v * 100, 8)}%` }} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">+{s.newUsersThisMonth}</span> joined this month
            </p>
          </div>
        </div>

        {/* Platform Revenue */}
        <div className="relative bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-orange-400 to-orange-500" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-500" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.revenueGrowth >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {s.revenueGrowth >= 0 ? "↑" : "↓"} {Math.abs(s.revenueGrowth)}%
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(s.thisMonthRev)}</p>
            <p className="text-xs text-muted-foreground mt-1">Platform Revenue (This Month)</p>
            <div className="flex items-end gap-0.5 h-6 mt-3">
              {spark.map((v, i) => (
                <div key={i} className="flex-1 rounded-sm rounded-t bg-orange-400 opacity-60"
                  style={{ height: `${Math.max(v * 100, 8)}%` }} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All-time: <span className="font-semibold text-foreground">{formatCurrency(s.platformRev)}</span>
            </p>
          </div>
        </div>

        {/* Active Workers */}
        <div className="relative bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-green-400 to-green-500" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.proGrowth >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {s.proGrowth >= 0 ? "↑" : "↓"} {Math.abs(s.proGrowth)}%
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{s.totalProfessionals.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Professionals</p>
            <div className="flex items-end gap-0.5 h-6 mt-3">
              {spark.map((v, i) => (
                <div key={i} className="flex-1 rounded-sm rounded-t bg-green-500 opacity-60"
                  style={{ height: `${Math.max(v * 100, 8)}%` }} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold text-amber-600">{s.pendingVerifications} pending</span> verification
            </p>
          </div>
        </div>

        {/* Bonus Fund */}
        <div className="relative bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-50 text-purple-700">
                Bonus Fund
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(s.bonusLocked + s.bonusAvailable)}</p>
            <p className="text-xs text-muted-foreground mt-1">Worker Bonus Fund Total</p>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500"
                style={{ width: `${(s.bonusLocked + s.bonusAvailable) > 0 ? Math.min(100, (s.bonusLocked / (s.bonusLocked + s.bonusAvailable)) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>Locked: {formatCurrency(s.bonusLocked)}</span>
              <span>Free: {formatCurrency(s.bonusAvailable)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Live Jobs + Activity ───────────────────────── */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">

        {/* Live Job Feed */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold">Live Job Feed</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time bookings across the platform</p>
            </div>
            <div className="flex items-center gap-2">
              {s.activeBookings > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  {s.activeBookings} live
                </span>
              )}
              <Link href="/admin/bookings" className="text-xs text-brand-600 font-medium hover:underline">
                View all →
              </Link>
            </div>
          </div>
          {s.recentBookings.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No bookings yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40">
                    {["Customer", "Service", "Worker", "Status", "Value"].map((col, i) => (
                      <th key={col}
                        className={`text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 ${i === 4 ? "text-right" : "text-left"}`}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold">{b.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(b.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                          {b.service.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {b.professional?.user.name ?? <span className="text-xs text-amber-600 font-medium">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.finalPrice
                          ? <span className="font-mono text-sm font-semibold text-green-700">{formatCurrency(Number(b.finalPrice))}</span>
                          : b.estimatedPrice
                            ? <span className="font-mono text-xs text-muted-foreground">~{formatCurrency(Number(b.estimatedPrice))}</span>
                            : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Stream */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-bold">Activity Stream</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Recent platform events</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="divide-y divide-border">
              {s.recentActivity.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">No recent activity</p>
              ) : s.recentActivity.map((tx) => {
                const isCredit = ["CREDIT", "UNLOCK", "REFERRAL_COMMISSION"].includes(tx.type);
                const typeLabel: Record<string, string> = {
                  CREDIT: "Earnings credited",
                  LOCK: "Bonus fund locked",
                  UNLOCK: "Bonus fund unlocked",
                  DEBIT: "Wallet debited",
                  WITHDRAWAL: "Withdrawal processed",
                  COMMISSION: "Commission split",
                  REFERRAL_COMMISSION: "Referral commission",
                  REFUND: "Refund issued",
                };
                return (
                  <div key={tx.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? "bg-green-50" : "bg-orange-50"}`}>
                      {isCredit
                        ? <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        : <ArrowUpRight className="h-4 w-4 text-orange-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {tx.wallet.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabel[tx.type] ?? tx.type.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold font-mono ${isCredit ? "text-green-700" : "text-orange-600"}`}>
                        {isCredit ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">{ago(tx.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Revenue + Top Workers + Quick Actions ──────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Revenue Breakdown */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold">Revenue Breakdown</h2>
              <p className="text-xs text-muted-foreground mt-0.5">All 3 streams · All time</p>
            </div>
            <Link href="/admin/finances" className="text-xs text-brand-600 font-medium hover:underline">Export →</Link>
          </div>
          <div className="p-5 space-y-4">
            {/* KPI mini grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "🔗", label: "Connection Fees",   value: formatCurrency(s.connFees),   color: "text-brand-600" },
                { icon: "🤝", label: "Svc Commission",    value: formatCurrency(s.platformRev), color: "text-orange-600" },
                { icon: "🎁", label: "Referral Payouts",  value: formatCurrency(s.referralTotal), color: "text-purple-600" },
                { icon: "📊", label: "Total Revenue",     value: formatCurrency(s.platformRev + s.connFees), color: "text-foreground" },
              ].map(({ icon, label, value, color }) => (
                <div key={label} className="rounded-xl bg-muted/40 border border-border p-3">
                  <p className="text-base">{icon}</p>
                  <p className={`text-sm font-bold ${color} mt-1`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Monthly Revenue Bar Chart */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Monthly Revenue Trend</p>
              <div className="flex items-end gap-1.5 h-24">
                {s.monthlyRevenue.map((rev, i) => {
                  const isLast = i === s.monthlyRevenue.length - 1;
                  const heightPct = Math.max((rev / maxMonthlyRevenue) * 100, 4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-md transition-all ${isLast ? "bg-gradient-to-t from-orange-500 to-brand-500" : "bg-brand-200"}`}
                        style={{ height: `${heightPct}%` }}
                        title={formatCurrency(rev)}
                      />
                      <span className={`text-xs ${isLast ? "text-brand-600 font-bold" : "text-muted-foreground"}`}>
                        {s.months[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stream breakdown */}
            <div className="space-y-2.5 pt-1 border-t border-border">
              {[
                { name: "Connection Fee",        amount: s.connFees,    pct: s.connFees / (s.platformRev + s.connFees + 0.01) * 100, color: "bg-brand-500" },
                { name: "Service Commission (5%)", amount: s.platformRev, pct: s.platformRev / (s.platformRev + s.connFees + 0.01) * 100, color: "bg-orange-400" },
                { name: "Referral Payouts",       amount: s.referralTotal, pct: Math.min(20, s.referralTotal / (s.platformRev + 0.01) * 100), color: "bg-purple-400" },
              ].map(({ name, amount, pct, color }) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground truncate">{name}</span>
                      <span className="font-mono font-semibold text-foreground ml-2 shrink-0">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Workers + Bonus Fund */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold">Top Professionals</h2>
              <p className="text-xs text-muted-foreground mt-0.5">By completed jobs</p>
            </div>
            <Link href="/admin/professionals" className="text-xs text-brand-600 font-medium hover:underline">See all →</Link>
          </div>
          <div className="p-5 space-y-3">
            {s.topProfessionals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : s.topProfessionals.map((pro, idx) => {
              const gradeMeta = GRADE_META[pro.grade] ?? GRADE_META.BRONZE;
              const initials = pro.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const skillName = pro.skillCategories[0]?.category.name ?? "General";
              const avatarColors = [
                "from-brand-500 to-purple-500",
                "from-orange-400 to-red-400",
                "from-green-500 to-teal-500",
                "from-brand-500 to-brand-700",
                "from-gray-400 to-gray-500",
              ];
              return (
                <div key={pro.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[idx]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{pro.user.name}</p>
                    <p className="text-xs text-muted-foreground">{skillName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-semibold">{Number(pro.ratingAvg).toFixed(1)} ★</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeMeta.bg} ${gradeMeta.color}`}>
                      {pro.grade.charAt(0) + pro.grade.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Bonus Fund Summary */}
            <div className="pt-3 mt-1 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">🛡️ Bonus Fund</p>
                <span className="font-mono text-sm font-bold text-brand-600">{formatCurrency(s.bonusLocked + s.bonusAvailable)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500"
                  style={{ width: `${(s.bonusLocked + s.bonusAvailable) > 0 ? Math.min(100, (s.bonusLocked / (s.bonusLocked + s.bonusAvailable)) * 100) : 50}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-lg bg-brand-50 border border-brand-100 p-2.5">
                  <p className="text-xs font-bold text-brand-600 uppercase">From Commission</p>
                  <p className="font-mono text-sm font-bold text-foreground mt-0.5">{formatCurrency(s.bonusLocked)}</p>
                </div>
                <div className="rounded-lg bg-purple-50 border border-purple-100 p-2.5">
                  <p className="text-xs font-bold text-purple-600 uppercase">Referral Paid</p>
                  <p className="font-mono text-sm font-bold text-foreground mt-0.5">{formatCurrency(s.referralTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions + Platform KPIs */}
        <div className="flex flex-col gap-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { href: "/admin/professionals", icon: CheckCircle, label: "Verify Worker", sub: `${s.pendingVerifications} pending`, urgent: s.pendingVerifications > 0 },
                { href: "/admin/wallet",         icon: Wallet,       label: "Fund Payout",  sub: `${s.pendingWithdrawals} requests`, urgent: s.pendingWithdrawals > 0 },
                { href: "/admin/bookings",        icon: Activity,     label: "All Bookings", sub: `${s.activeBookings} active` },
                { href: "/admin/finances",        icon: TrendingUp,   label: "Finances",     sub: "Export & reports" },
                { href: "/admin/services",        icon: Zap,          label: "Services",     sub: "Manage catalogue" },
                { href: "/admin/users",           icon: Users,        label: "Users",        sub: `${s.totalUsers} total` },
              ].map(({ href, icon: Icon, label, sub, urgent }) => (
                <Link key={href} href={href}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all group ${urgent ? "border-amber-200 bg-amber-50 hover:bg-amber-100" : "border-border hover:bg-brand-50 hover:border-brand-200"}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${urgent ? "bg-amber-100" : "bg-muted group-hover:bg-brand-100"} transition-colors`}>
                    <Icon className={`h-3.5 w-3.5 ${urgent ? "text-amber-600" : "text-muted-foreground group-hover:text-brand-600"} transition-colors`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">{label}</p>
                    <p className={`text-xs ${urgent ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>{sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform KPIs */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold">Platform Health</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { label: "Avg Rating",      value: `${s.avgRating.toFixed(1)} ★`, bg: "bg-green-50 border-green-100", text: "text-green-700" },
                { label: "Completion Rate", value: `${s.completionRate}%`,          bg: "bg-brand-50 border-brand-100", text: "text-brand-700" },
                { label: "Total Reviews",   value: s.totalReviews.toLocaleString(), bg: "bg-yellow-50 border-yellow-100", text: "text-yellow-700" },
                { label: "Total Orders",    value: s.totalOrders.toLocaleString(),  bg: "bg-orange-50 border-orange-100", text: "text-orange-700" },
              ].map(({ label, value, bg, text }) => (
                <div key={label} className={`rounded-xl border p-3 ${bg}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${text} opacity-70`}>{label}</p>
                  <p className={`text-lg font-extrabold ${text} mt-1`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 4: Category Performance + Grade Dist + Booking Stats ── */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">

        {/* Category Performance */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold">Category Performance</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Bookings by service type · all time</p>
            </div>
            <span className="font-mono text-sm font-bold">{s.totalBookings.toLocaleString()} total</span>
          </div>
          <div className="p-5 space-y-3">
            {s.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No booking data yet</p>
            ) : s.categoryBreakdown.map(({ name, count }, i) => {
              const colors = ["bg-brand-500", "bg-green-500", "bg-purple-500", "bg-orange-400", "bg-amber-400", "bg-cyan-500", "bg-pink-400", "bg-teal-500"];
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 truncate">{name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[i % colors.length]}`}
                      style={{ width: `${(count / maxCat) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-semibold text-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Booking Distribution + Grade Distribution */}
        <div className="flex flex-col gap-4">

          {/* Booking Status Distribution */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold">Booking Status</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Distribution across all bookings</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                {/* Donut SVG */}
                <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                  {(() => {
                    const total = s.totalBookings || 1;
                    const segs = [
                      { val: s.completedBookings, color: "#22c55e" },
                      { val: s.activeBookings,    color: "#0ea5e9" },
                      { val: s.pendingBookings,   color: "#f59e0b" },
                      { val: s.cancelledBookings, color: "#ef4444" },
                    ];
                    const circ = 2 * Math.PI * 36;
                    let offset = -circ * 0.25; // start at top
                    return segs.map(({ val, color }, i) => {
                      const dash = (val / total) * circ;
                      const el = (
                        <circle key={i} cx="50" cy="50" r="36" fill="none"
                          stroke={color} strokeWidth="14"
                          strokeDasharray={`${dash} ${circ}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="butt"
                        />
                      );
                      offset += dash;
                      return el;
                    });
                  })()}
                  <text x="50" y="46" textAnchor="middle" fontSize="14" fontWeight="800" fill="#0f172a">{s.totalBookings}</text>
                  <text x="50" y="57" textAnchor="middle" fontSize="7" fill="#94a3b8">total</text>
                </svg>
                <div className="flex-1 space-y-2">
                  {[
                    { label: "Completed",   val: s.completedBookings, color: "bg-green-500"  },
                    { label: "Active",      val: s.activeBookings,    color: "bg-brand-500"  },
                    { label: "Pending",     val: s.pendingBookings,   color: "bg-amber-400"  },
                    { label: "Cancelled",   val: s.cancelledBookings, color: "bg-red-400"    },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                      <span className="text-xs text-muted-foreground flex-1">{label}</span>
                      <span className="font-mono text-xs font-semibold">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Booking Trend */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold">Monthly Booking Trend</h2>
            </div>
            <div className="p-5">
              <div className="flex items-end gap-1.5 h-20">
                {s.monthlyBookings.map((cnt, i) => {
                  const isLast = i === s.monthlyBookings.length - 1;
                  const h = Math.max((cnt / maxMonthlyBookings) * 100, 4);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-md ${isLast ? "bg-gradient-to-t from-brand-600 to-brand-400" : "bg-brand-100"}`}
                        style={{ height: `${h}%` }}
                        title={`${cnt} bookings`}
                      />
                      <span className={`text-xs ${isLast ? "text-brand-600 font-bold" : "text-muted-foreground"}`}>{s.months[i]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Grade distribution inline */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Professional Grades</p>
                <div className="flex gap-2 flex-wrap">
                  {s.gradeDist.map(({ grade, _count }) => {
                    const gm = GRADE_META[grade] ?? GRADE_META.BRONZE;
                    return (
                      <span key={grade} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${gm.bg} ${gm.color}`}>
                        {grade.charAt(0) + grade.slice(1).toLowerCase()}
                        <span className="font-mono ml-0.5">{_count.id}</span>
                      </span>
                    );
                  })}
                  {s.gradeDist.length === 0 && <span className="text-xs text-muted-foreground">No data</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 5: Financial KPIs strip ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { icon: Package,    label: "Total Orders",    value: s.totalOrders.toLocaleString(),            color: "text-orange-600", bg: "bg-orange-50" },
          { icon: DollarSign, label: "Total Volume",    value: formatCurrency(s.totalVolume),             color: "text-brand-600",  bg: "bg-brand-50"  },
          { icon: Gift,       label: "Referral Paid",   value: formatCurrency(s.referralTotal),           color: "text-purple-600", bg: "bg-purple-50" },
          { icon: Shield,     label: "Bonus Locked",    value: formatCurrency(s.bonusLocked),             color: "text-blue-600",   bg: "bg-blue-50"   },
          { icon: Star,       label: "Avg Rating",      value: `${s.avgRating.toFixed(1)} ★`,            color: "text-yellow-600", bg: "bg-yellow-50" },
          { icon: TrendingUp, label: "Completion Rate", value: `${s.completionRate}%`,                    color: "text-green-600",  bg: "bg-green-50"  },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-4 hover:shadow-md transition-all">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`h-4.5 w-4.5 ${color}`} />
            </div>
            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground pt-2">
        SkillSewa Command Center · v2.0 · Kathmandu Valley, Nepal · {new Date().getFullYear()}
      </p>

    </div>
  );
}
