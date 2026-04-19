"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/useToast";
import { useSearchParams } from "next/navigation";

function LoginPageInner() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!identifier || identifier.length < 3) e.identifier = "Enter a valid phone number or email";
    if (!password || password.length < 4) e.password = "Password too short";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      await login(identifier, password, searchParams.get("redirect") ?? undefined);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to your SkillSewa account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Phone or Email"
          type="text"
          placeholder="98XXXXXXXX or email@example.com"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={errors.identifier}
          leftIcon={<AtSign className="h-4 w-4" />}
        />

        <Input
          label="Password"
          type={showPwd ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="hover:text-foreground transition-colors"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Create account
          </Link>
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>Demo accounts</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: "Admin", phone: "9800000001", role: "ADMIN" },
            { label: "Professional", phone: "9800000002", role: "PRO" },
            { label: "Customer", phone: "9800000003", role: "CUSTOMER" },
            { label: "Supplier", phone: "9800000004", role: "SUPPLIER" },
          ].map((demo) => (
            <button
              key={demo.role}
              type="button"
              onClick={() => {
                setIdentifier(demo.phone);
                setPassword("demo1234");
              }}
              className="rounded-lg border px-3 py-2 text-left hover:bg-muted transition-colors"
            >
              <span className="font-medium">{demo.label}</span>
              <br />
              <span className="text-muted-foreground">{demo.phone} or email</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
