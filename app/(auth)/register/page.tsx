"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Phone, Lock, Eye, EyeOff, Briefcase, ShoppingBag, Users, Mail, MessageSquare, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

type Role = "CUSTOMER" | "PROFESSIONAL" | "SUPPLIER";

const ROLES = [
  { value: "CUSTOMER" as Role, label: "Customer", desc: "Book services", icon: Users },
  { value: "PROFESSIONAL" as Role, label: "Professional", desc: "Offer your skills", icon: Briefcase },
  { value: "SUPPLIER" as Role, label: "Supplier", desc: "Sell products", icon: ShoppingBag },
];

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role>("CUSTOMER");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", referralCode: "" });
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  // Pre-fill referral code from ?ref= URL param and auto-select PROFESSIONAL role
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setForm((f) => ({ ...f, referralCode: ref.toUpperCase() }));
      setRole("PROFESSIONAL");
    }
  }, [searchParams]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const sendOtp = async () => {
    setOtpSending(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send OTP");
      // Demo mode: auto-fill OTP from response
      if (json.data?.demoCode) {
        setOtp(json.data.demoCode);
        toast({ variant: "default", title: "Demo mode", description: "OTP auto-filled for demo" });
      } else {
        toast({ variant: "success", title: "OTP sent", description: `Code sent to ${form.phone}` });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setOtpSending(false);
    }
  };

  const handleStep2Continue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "CUSTOMER") {
      // Customers skip OTP — submit directly
      await submitRegistration();
    } else {
      // PROFESSIONAL / SUPPLIER — go to OTP step
      setStep(3);
      await sendOtp();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Verify OTP first
      const verifyRes = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, otp }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyJson.error ?? "OTP verification failed");

      // OTP verified — submit registration
      await submitRegistration();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const submitRegistration = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          role,
          ...(form.referralCode ? { referralCode: form.referralCode } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Registration failed");
      toast({ variant: "success", title: "Account created!", description: "Welcome to SkillSewa" });
      if (role === "PROFESSIONAL") router.push("/professional/jobs");
      else if (role === "SUPPLIER") router.push("/supplier/products");
      else router.push("/customer/bookings");
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
        <p className="text-muted-foreground mt-1">Join Nepal&apos;s fastest-growing service platform</p>
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <p className="text-sm font-medium">I want to join as a…</p>
          <div className="grid gap-3">
            {ROLES.map(({ value, label, desc, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  "flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                  role === value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className={cn("rounded-lg p-2.5", role === value ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                {role === value && (
                  <div className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
          <Button className="w-full" size="lg" onClick={() => setStep(2)}>
            Continue as {role.charAt(0) + role.slice(1).toLowerCase()}
          </Button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2Continue} className="space-y-4">
          <Input label="Full Name" placeholder="Hari Bahadur" value={form.name} onChange={update("name")} leftIcon={<User className="h-4 w-4" />} />
          <Input label="Phone Number" type="tel" placeholder="98XXXXXXXX" value={form.phone} onChange={update("phone")} leftIcon={<Phone className="h-4 w-4" />} />
          <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={update("email")} leftIcon={<Mail className="h-4 w-4" />} />
          <Input
            label="Password"
            type={showPwd ? "text" : "password"}
            placeholder="Min 6 characters"
            value={form.password}
            onChange={update("password")}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          {role === "PROFESSIONAL" && (
            <Input
              label="Referral Code (optional)"
              placeholder="e.g. SKILL1234"
              value={form.referralCode}
              onChange={update("referralCode")}
              leftIcon={<Gift className="h-4 w-4" />}
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button type="submit" className="flex-1" loading={loading}>
              {role === "CUSTOMER" ? "Create Account" : "Continue"}
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
            <p className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Verify your phone number
            </p>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <span className="font-medium text-foreground">{form.phone}</span>
            </p>
          </div>

          {/* Demo notice — shown when OTP is auto-filled */}
          {otp && (
            <div className="rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
              Demo mode: OTP auto-filled
            </div>
          )}

          <Input
            label="OTP Code"
            type="text"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            leftIcon={<MessageSquare className="h-4 w-4" />}
            maxLength={6}
          />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Didn&apos;t receive the code?</span>
            <button
              type="button"
              className="text-primary font-medium hover:underline disabled:opacity-50"
              onClick={sendOtp}
              disabled={otpSending}
            >
              {otpSending ? "Sending…" : "Resend OTP"}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
            <Button type="submit" className="flex-1" loading={loading} disabled={otp.length !== 6}>
              Verify &amp; Create Account
            </Button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>}>
      <RegisterPageInner />
    </Suspense>
  );
}
