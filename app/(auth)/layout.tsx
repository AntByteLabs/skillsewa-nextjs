import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-brand-700 text-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <span className="text-2xl font-bold tracking-tight">SkillSewa</span>
        </div>

        <div className="space-y-6">
          <blockquote className="text-3xl font-light leading-snug">
            "Nepal's most trusted platform for home services and professional skills."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/20" />
            <div>
              <p className="font-semibold">Trusted by 10,000+ customers</p>
              <p className="text-brand-200 text-sm">Across 77 districts of Nepal</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Professionals", value: "2,000+" },
            { label: "Services Done", value: "50,000+" },
            { label: "Avg Rating", value: "4.8★" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 p-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-brand-200">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
