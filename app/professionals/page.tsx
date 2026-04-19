export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Star, Briefcase, CheckCircle, ArrowRight, Shield, Wallet, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, getInitials } from "@/lib/utils";

const GRADE_COLORS: Record<string, string> = {
  BRONZE: "bg-amber-100 text-amber-700",
  SILVER: "bg-gray-100 text-gray-600",
  GOLD: "bg-yellow-100 text-yellow-700",
  PLATINUM: "bg-cyan-100 text-cyan-700",
  ELITE: "bg-purple-100 text-purple-700",
};

async function getData() {
  const pros = await prisma.professional.findMany({
    where: { isVerified: true, isAvailable: true },
    include: {
      user: { select: { name: true, city: true, avatarUrl: true } },
      skillCategories: { include: { category: true }, take: 3 },
    },
    orderBy: [{ grade: "desc" }, { ratingAvg: "desc" }],
    take: 12,
  }).catch(() => []);
  return pros;
}

export default async function ProfessionalsPage() {
  const pros = await getData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-2 text-brand-200 text-sm mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Become a Professional</span>
          </div>
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl font-extrabold leading-tight mb-4">
                Turn Your Skills Into Income
              </h1>
              <p className="text-brand-100 text-lg mb-8">
                Join 500+ verified professionals on SkillSewa. Set your own hours, grow your clientele, and earn more.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/register">
                  <Button className="bg-white text-brand-700 hover:bg-brand-50 font-semibold">
                    Join as Professional <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/book">
                  <Button variant="outline" className="border-white/40 text-white hover:bg-white/10">
                    Book a Service Instead
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Wallet, label: "Earn up to", value: "Rs 80,000/mo" },
                { icon: Shield, label: "Background", value: "Verified" },
                { icon: TrendingUp, label: "Avg Rating", value: "4.7 ★" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/15 backdrop-blur rounded-2xl p-4 text-center">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-brand-100" />
                  <p className="text-xs text-brand-200">{label}</p>
                  <p className="text-lg font-bold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border-b py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Register & Verify", desc: "Sign up, submit your skills and documents. Admin verifies within 24 hours." },
              { step: "2", title: "Get Auto-Assigned", desc: "When a customer nearby needs your skill, you get auto-matched and notified." },
              { step: "3", title: "Complete & Earn", desc: "Complete the job, mark it done. Earnings hit your wallet instantly." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active professionals */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Top Professionals</h2>
        {pros.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No professionals listed yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pros.map((pro) => (
              <div key={pro.id} className="bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">
                    {getInitials(pro.user.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm">{pro.user.name}</p>
                      <CheckCircle className="h-3.5 w-3.5 text-brand-600" />
                    </div>
                    {pro.user.city && <p className="text-xs text-muted-foreground">{pro.user.city}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-semibold">{Number(pro.ratingAvg).toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({pro.ratingCount})</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${GRADE_COLORS[pro.grade] ?? "bg-gray-100 text-gray-600"}`}>
                    {pro.grade}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {pro.skillCategories.map((sc) => (
                    <span key={sc.id} className="text-xs bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Briefcase className="h-2.5 w-2.5" />
                      {sc.category.name}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground flex items-center justify-between pt-3 border-t">
                  <span>{pro.jobsCompleted} jobs done</span>
                  <span className="text-green-600 font-medium">Available</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-brand-600 rounded-3xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Ready to start earning?</h3>
          <p className="text-brand-100 mb-6">Join our growing network of verified professionals in Nepal</p>
          <Link href="/register">
            <Button className="bg-white text-brand-700 hover:bg-brand-50 font-semibold px-8">
              Register as Professional
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
