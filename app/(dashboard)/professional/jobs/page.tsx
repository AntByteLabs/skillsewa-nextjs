export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import Link from "next/link";
import {
  Briefcase, Star, Wallet, Users, MapPin, Calendar, Clock,
  Gift, TrendingUp, CheckCircle, AlertCircle, ChevronRight, Zap,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  COMPLETED:   { label: "Completed",   color: "text-green-700",              bg: "bg-green-50",              dot: "bg-green-500" },
  CONFIRMED:   { label: "Confirmed",   color: "text-brand-700",              bg: "bg-brand-50",              dot: "bg-brand-500" },
  PENDING:     { label: "Pending",     color: "text-amber-700",              bg: "bg-amber-50",              dot: "bg-amber-400" },
  IN_PROGRESS: { label: "In Progress", color: "text-brand-orange-700",       bg: "bg-brand-orange-50",       dot: "bg-brand-orange-500" },
  CANCELLED:   { label: "Cancelled",   color: "text-red-700",                bg: "bg-red-50",                dot: "bg-red-400" },
  DISPUTED:    { label: "Disputed",    color: "text-purple-700",             bg: "bg-purple-50",             dot: "bg-purple-400" },
};

const GRADE_META: Record<string, { label: string; color: string; bg: string }> = {
  BRONZE:   { label: "Bronze",   color: "text-amber-700",  bg: "bg-amber-50 border border-amber-200" },
  SILVER:   { label: "Silver",   color: "text-gray-600",   bg: "bg-gray-100 border border-gray-200" },
  GOLD:     { label: "Gold",     color: "text-yellow-700", bg: "bg-yellow-50 border border-yellow-200" },
  PLATINUM: { label: "Platinum", color: "text-cyan-700",   bg: "bg-cyan-50 border border-cyan-200" },
  ELITE:    { label: "Elite",    color: "text-purple-700", bg: "bg-purple-50 border border-purple-200" },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-50", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export default async function ProfessionalJobsPage() {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";

  const professional = await prisma.professional.findUnique({
    where: { userId },
    include: {
      user: true,
      skillCategories: { include: { category: true } },
    },
  });

  if (!professional) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="font-medium">Professional profile not found</p>
          <p className="text-sm text-muted-foreground">Please complete your profile setup.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [bookings, wallet, monthEarnings, referralData] = await Promise.all([
    prisma.booking.findMany({
      where: { professionalId: professional.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.professionalEarning.aggregate({
      where: { professionalId: professional.id, createdAt: { gte: firstOfMonth } },
      _sum: { netAmount: true },
      _count: true,
    }),
    prisma.professional.findUnique({
      where: { id: professional.id },
      select: {
        referralCode: true,
        referralEarnings: true,
        referrals: {
          select: { id: true, jobsCompleted: true, user: { select: { name: true } } },
        },
      },
    }),
  ]);

  const activeJobs = bookings.filter((b) => ["IN_PROGRESS", "CONFIRMED"].includes(b.status));
  const thisMonthEarnings = Number(monthEarnings._sum.netAmount ?? 0);
  const referralEarnings = Number(referralData?.referralEarnings ?? 0);
  const referralCount = referralData?.referrals.length ?? 0;
  const gradeMeta = GRADE_META[professional.grade] ?? GRADE_META.BRONZE;

  // Sparkline heights (relative to completed jobs)
  const sparkWeights = [0.3, 0.45, 0.4, 0.6, 0.55, 0.75, 0.8, 1.0];

  return (
    <div className="space-y-6 pb-8">

      {/* ── TOPBAR ───────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {professional.user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here&apos;s what&apos;s happening on your SkillSewa dashboard today
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeJobs.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {activeJobs.length} active job{activeJobs.length > 1 ? "s" : ""}
            </span>
          )}
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${gradeMeta.bg} ${gradeMeta.color}`}>
            {gradeMeta.label} Grade
          </span>
        </div>
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Total Jobs */}
        <div className="relative bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-brand-400 to-brand-600" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-brand-600" />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-700">All time</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{professional.jobsCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Jobs Completed</p>
            <div className="flex items-end gap-0.5 h-6 mt-3">
              {sparkWeights.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm rounded-t bg-brand-500 opacity-60"
                  style={{ height: `${Math.max(v * 100, 8)}%` }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{professional.jobsCount}</span> total assigned
            </p>
          </div>
        </div>

        {/* This Month Earnings */}
        <div className="relative bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-[#fb923c] to-[#f97316]" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-50 text-orange-700">This month</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(thisMonthEarnings)}</p>
            <p className="text-xs text-muted-foreground mt-1">Net Earnings (after 10%)</p>
            <div className="flex items-end gap-0.5 h-6 mt-3">
              {[0.2, 0.4, 0.35, 0.6, 0.5, 0.8, 0.7, 1.0].map((v, i) => (
                <div key={i} className="flex-1 rounded-sm rounded-t bg-orange-400 opacity-60"
                  style={{ height: `${Math.max(v * 100, 8)}%` }} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{monthEarnings._count}</span> jobs this month
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="relative bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-500" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
                {professional.ratingCount} reviews
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">
              {Number(professional.ratingAvg).toFixed(1)}
              <span className="text-yellow-500 text-xl ml-1">★</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Average Rating</p>
            <div className="mt-3 space-y-1.5">
              {([5, 4, 3] as const).map((star) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-3">{star}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${star === 5 ? 70 : star === 4 ? 20 : 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Referral Earnings */}
        <div className="relative bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Gift className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-50 text-purple-700">
                {referralCount} referred
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(referralEarnings)}</p>
            <p className="text-xs text-muted-foreground mt-1">Referral Commissions</p>
            <div className="mt-3 p-2.5 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-xs text-purple-700 font-medium">You earn 1.5% per job</p>
              <p className="text-xs text-purple-500 mt-0.5">from each referred pro</p>
            </div>
          </div>
        </div>

      </div>

      {/* ── ROW 2: Jobs Table + Wallet ─────────────────────── */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">

        {/* Recent Jobs Feed */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold">Live Job Feed</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Your recent and active bookings</p>
            </div>
            {activeJobs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                {activeJobs.length} Live
              </span>
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="py-16 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">No jobs yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete your profile to start receiving bookings</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40">
                    {["Customer", "Service", "Status", "Value"].map((h, i) => (
                      <th
                        key={h}
                        className={`text-xs font-bold text-muted-foreground uppercase tracking-wider px-5 py-3 ${i === 3 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold">{booking.customer.name}</p>
                        {booking.addressLine && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{booking.addressLine}</span>
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                          {booking.service.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={booking.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {booking.finalPrice ? (
                          <span className="font-mono text-sm font-semibold text-green-700">
                            +{formatCurrency(Number(booking.finalPrice) * 0.9)}
                          </span>
                        ) : booking.estimatedPrice ? (
                          <span className="font-mono text-sm text-muted-foreground">
                            ~{formatCurrency(Number(booking.estimatedPrice))}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">TBD</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: Wallet + Quick Actions */}
        <div className="flex flex-col gap-4">

          {/* Wallet Card */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold">Wallet</h2>
              <Link href="/professional/wallet" className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-brand-50 border border-brand-100 p-3.5">
                  <p className="text-xs font-bold text-brand-600 uppercase tracking-wide">Available</p>
                  <p className="text-lg font-extrabold text-brand-700 mt-1">
                    {formatCurrency(Number(wallet?.availableBalance ?? 0))}
                  </p>
                  <p className="text-xs text-brand-500 mt-0.5">Ready to withdraw</p>
                </div>
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-3.5">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Locked</p>
                  <p className="text-lg font-extrabold text-orange-700 mt-1">
                    {formatCurrency(Number(wallet?.lockedBalance ?? 0))}
                  </p>
                  <p className="text-xs text-orange-500 mt-0.5">Unlock on milestone</p>
                </div>
              </div>

              {/* Unlock progress */}
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bonus Unlock Progress</p>
                {[
                  { label: "Jobs", current: professional.jobsCompleted, required: 10, suffix: "" },
                  { label: "Rating", current: Number(professional.ratingAvg), required: 4.0, suffix: "★" },
                  { label: "Months", current: professional.loyaltyMonths, required: 3, suffix: "mo" },
                ].map((m) => {
                  const pct = Math.min(100, (m.current / m.required) * 100);
                  const done = m.current >= m.required;
                  return (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className={done ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                          {m.current}{m.suffix} / {m.required}{m.suffix} {done ? "✓" : ""}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-brand-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { href: "/professional/schedule",  icon: Calendar, label: "My Schedule", sub: "Set availability" },
                { href: "/professional/wallet",    icon: Wallet,   label: "Withdraw",    sub: "Min Rs. 500" },
                { href: "/professional/referrals", icon: Gift,     label: "Refer & Earn", sub: `${referralCount} referred` },
                { href: "/professional/profile",   icon: Users,    label: "My Profile",  sub: "Update skills" },
              ].map(({ href, icon: Icon, label, sub }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-white hover:bg-brand-50 hover:border-brand-200 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-brand-100 transition-colors shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-brand-600 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-auto transition-opacity shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Referral + Performance ───────────────────── */}
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">

        {/* Referral Card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-bold">Referral Program</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Earn 1.5% from every job your referred pros complete</p>
            </div>
            <Link href="/professional/referrals" className="text-xs text-brand-600 font-medium hover:underline">
              Details →
            </Link>
          </div>
          <div className="p-5 space-y-4">
            {/* Code banner */}
            <div className="rounded-xl bg-gradient-to-br from-brand-500 to-orange-500 p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Your Referral Code</p>
              <p className="text-2xl font-black tracking-widest font-mono">
                {referralData?.referralCode ?? "—"}
              </p>
              <p className="text-xs opacity-70 mt-1">
                /register?ref={referralData?.referralCode ?? "CODE"}
              </p>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Referred", value: String(referralCount), color: "text-brand-600" },
                { label: "Total Earned", value: formatCurrency(referralEarnings), color: "text-orange-600" },
                { label: "Rate", value: "1.5%", color: "text-purple-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-muted/40 p-2.5 text-center border border-border">
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {/* Referred pros */}
            {(referralData?.referrals ?? []).length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Referred Professionals</p>
                {(referralData?.referrals ?? []).slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {r.user.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{r.user.name}</p>
                      <p className="text-xs text-muted-foreground">{r.jobsCompleted} jobs</p>
                    </div>
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-border p-4 text-center">
                <Gift className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-medium">No referrals yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Share your code to start earning</p>
              </div>
            )}
          </div>
        </div>

        {/* Performance Overview */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold">Performance Overview</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your stats on the platform</p>
          </div>
          <div className="p-5 space-y-4">
            {/* KPI tiles */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Jobs Completed",  value: String(professional.jobsCompleted), bg: "bg-brand-50 border-brand-100",   text: "text-brand-700",   icon: CheckCircle },
                { label: "Response Rate",   value: `${Number(professional.responseRate).toFixed(0)}%`, bg: "bg-green-50 border-green-100",   text: "text-green-700",   icon: Zap },
                { label: "Avg Rating",      value: `${Number(professional.ratingAvg).toFixed(1)}★`,   bg: "bg-yellow-50 border-yellow-100", text: "text-yellow-700",  icon: Star },
                { label: "Loyalty",         value: `${professional.loyaltyMonths}mo`,   bg: "bg-purple-50 border-purple-100", text: "text-purple-700",  icon: Clock },
              ].map(({ label, value, bg, text, icon: Icon }) => (
                <div key={label} className={`rounded-xl p-3.5 border ${bg}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${text} opacity-70`}>{label}</p>
                  <p className={`text-xl font-extrabold ${text} mt-1`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Skills */}
            {professional.skillCategories.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Skill Categories</p>
                <div className="space-y-2">
                  {professional.skillCategories.slice(0, 4).map((sc) => (
                    <div key={sc.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 truncate">{sc.category.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-orange-400"
                          style={{ width: `${Math.min(100, sc.yearsExp * 20 + 30)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{sc.yearsExp}yr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification banner */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${professional.isVerified ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              {professional.isVerified
                ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                : <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />}
              <div>
                <p className={`text-xs font-semibold ${professional.isVerified ? "text-green-700" : "text-amber-700"}`}>
                  {professional.isVerified ? "Verified Professional" : "Verification Pending"}
                </p>
                <p className={`text-xs ${professional.isVerified ? "text-green-600" : "text-amber-600"}`}>
                  {professional.isVerified ? "Your profile is fully verified" : "Upload documents to get verified"}
                </p>
              </div>
              {!professional.isVerified && (
                <Link href="/professional/profile" className="ml-auto text-xs text-amber-700 font-medium hover:underline shrink-0">
                  Complete →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
