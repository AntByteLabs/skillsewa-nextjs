"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, ShoppingBag } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function HomeNavClient() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearAuth();
    window.location.href = "/"; // full reload to clear all state
  };

  // Dashboard link based on role
  const dashboardHref =
    user?.role === "ADMIN" ? "/admin/dashboard" :
    user?.role === "PROFESSIONAL" ? "/professional/jobs" :
    user?.role === "SUPPLIER" ? "/supplier/products" :
    "/customer/bookings";

  // Don't render until client hydration to avoid mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-16 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-8 w-20 rounded-lg bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/shop">
          <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1 text-gray-600">
            <ShoppingBag className="h-4 w-4" /> Shop
          </Button>
        </Link>
        <Link href={dashboardHref}>
          <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1 text-gray-600">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={dashboardHref}>
            <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:bg-brand-700 transition-colors">
              {getInitials(user.name ?? "U")}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/shop">
        <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1 text-gray-600">
          <ShoppingBag className="h-4 w-4" /> Shop
        </Button>
      </Link>
      <Link href="/login">
        <Button variant="ghost" size="sm" className="text-gray-600">Sign In</Button>
      </Link>
      <Link href="/register">
        <Button size="sm" className="bg-brand-600 hover:bg-brand-700">Sign Up</Button>
      </Link>
    </div>
  );
}
