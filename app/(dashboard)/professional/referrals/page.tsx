export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { Gift, Users, TrendingUp, ArrowDownLeft, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";

const GRADE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  BRONZE:   { label: "Bronze",   color: "text-amber-700",  bg: "bg-amber-50" },
  SILVER:   { label: "Silver",   color: "text-gray-600",   bg: "bg-gray-100" },
  GOLD:     { label: "Gold",     color: "text-yellow-700", bg: "bg-yellow-50" },
  PLATINUM: { label: "Platinum", color: "text-cyan-700",   bg: "bg-cyan-50" },
  ELITE:    { label: "Elite",    color: "text-purple-700", bg: "bg-purple-50" },
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-NP", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export default async function ReferralsPage() {
  const h = await headers();
  const userId = h.get("x-user-id") ?? "";

  const professional = await prisma.professional.findUnique({
    where: { userId },
    select: {
      id: true,
      referralCode: true,
      referralEarnings: true,
      referrals: {
        select: {
          id: true,
          grade: true,
          jobsCompleted: true,
          isVerified: true,
          createdAt: true,
          referralSource: { select: { amount: true, createdAt: true } },
          user: { select: { name: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!professional) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Profile not found</p>
        </div>
      </div>
    );
  }

  // Auto-generate code if missing
  let referralCode = professional.referralCode;
  if (!referralCode) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    // Persist in background (best-effort, page will show on next load)
    await prisma.professional.update({
      where: { id: professional.id },
      data: { referralCode: code },
    }).catch(() => null);
    referralCode = code;
  }

  // Referral commission transactions
  const referralTxns = await prisma.walletTransaction.findMany({
    where: {
      wallet: { userId },
      type: "REFERRAL_COMMISSION",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const totalEarnings = Number(professional.referralEarnings);
  const referralCount = professional.referrals.length;
  const activeReferrals = professional.referrals.filter((r) => r.jobsCompleted > 0).length;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const referralLink = `${appUrl}/register?ref=${referralCode}`;

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Gift className="h-6 w-6 text-purple-600" />
          Referral Program
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Refer new professionals and earn <span className="font-semibold text-foreground">1.5% commission</span> from every job they complete — forever.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">How It Works</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { step: "1", icon: "🔗", title: "Share your code", desc: "Send your referral link to friends who want to join as professionals" },
            { step: "2", icon: "✅", title: "They register & complete jobs", desc: "They sign up using your code and start completing service bookings" },
            { step: "3", icon: "💰", title: "You earn automatically", desc: "30% of our 5% platform commission (1.5% of job value) goes to your wallet on every completed job" },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <p className="font-semibold text-sm">{icon} {title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats + Code */}
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Earnings", value: formatCurrency(totalEarnings), icon: TrendingUp, color: "text-brand-orange-600", bg: "bg-brand-orange-50 border-brand-orange-100" },
            { label: "Total Referred", value: String(referralCount), icon: Users, color: "text-brand-600", bg: "bg-brand-50 border-brand-100" },
            { label: "Active Earners", value: String(activeReferrals), icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 border-green-100" },
            { label: "Your Rate", value: "1.5%", icon: Gift, color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Referral code card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-brand-600 to-orange-500 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Your Referral Code</p>
            <p className="text-4xl font-black tracking-widest font-mono mb-3">{referralCode}</p>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 border border-white/20">
              <ExternalLink className="h-3.5 w-3.5 opacity-70 shrink-0" />
              <span className="text-xs opacity-80 truncate">{referralLink}</span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <CopyButton text={referralCode ?? ""} label="Copy Code" />
            <CopyButton text={referralLink} label="Copy Link" variant="outline" />
          </div>
          <div className="px-4 pb-4">
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
              <p className="text-xs text-amber-700 font-medium">
                💡 Earnings are credited instantly when your referred professional completes a job
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referred Professionals Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold">Referred Professionals</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{referralCount} professional{referralCount !== 1 ? "s" : ""} joined through your code</p>
          </div>
        </div>

        {professional.referrals.length === 0 ? (
          <div className="py-16 text-center">
            <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">No referrals yet</p>
            <p className="text-xs text-muted-foreground mt-1">Share your referral code or link to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40">
                  {["Professional", "Grade", "Jobs Done", "You Earned", "Joined"].map((col, i) => (
                    <th
                      key={col}
                      className={`text-xs font-bold text-muted-foreground uppercase tracking-wider px-5 py-3 ${i >= 2 ? "text-right" : "text-left"}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {professional.referrals.map((r) => {
                  const grade = GRADE_BADGE[r.grade] ?? GRADE_BADGE.BRONZE;
                  const earned = Number(r.referralSource?.amount ?? 0);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {r.user.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{r.user.name}</p>
                            {r.isVerified && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${grade.bg} ${grade.color}`}>
                          {grade.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-mono text-sm font-semibold">{r.jobsCompleted}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-mono text-sm font-semibold ${earned > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                          {earned > 0 ? `+${formatCurrency(earned)}` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-xs text-muted-foreground">{formatDate(r.user.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payout Transactions */}
      {referralTxns.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold">Referral Payout History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Commissions credited to your wallet</p>
          </div>
          <div className="divide-y divide-border">
            {referralTxns.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tx.description ?? "Referral commission"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-green-700">
                  +{formatCurrency(Number(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

