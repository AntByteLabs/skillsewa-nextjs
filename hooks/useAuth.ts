"use client";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useAuth() {
  const { user, accessToken, isAuthenticated, setUser, clearAuth } = useAuthStore();
  const router = useRouter();

  const login = useCallback(
    async (identifier: string, password: string, redirectTo?: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Login failed");
      setUser(json.data.user, json.data.accessToken);

      // If there's a redirect URL, go there
      if (redirectTo) {
        router.push(redirectTo);
        return json.data;
      }

      const role = json.data.user.role;
      if (role === "ADMIN") router.push("/admin/dashboard");
      else if (role === "PROFESSIONAL") router.push("/professional/jobs");
      else if (role === "SUPPLIER") router.push("/supplier/products");
      else router.push("/customer/bookings");

      return json.data;
    },
    [setUser, router]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    window.location.href = "/login";  // force full reload instead of router.push
  }, [clearAuth]);

  return { user, accessToken, isAuthenticated, login, logout };
}
