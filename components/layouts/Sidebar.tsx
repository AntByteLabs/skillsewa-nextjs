"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Briefcase, Calendar, Wallet, User, Settings,
  ShoppingBag, Package, BarChart3, Users, Wrench,
  LogOut, ChevronLeft, Menu, X, Home, CheckSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Professionals", href: "/admin/professionals", icon: Briefcase },
    { label: "Skills", href: "/admin/skills", icon: CheckSquare },
    { label: "Services", href: "/admin/services", icon: Wrench },
    { label: "Bookings", href: "/admin/bookings", icon: Calendar },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Finances", href: "/admin/finances", icon: BarChart3 },
    { label: "Wallet Control", href: "/admin/wallet", icon: Wallet },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  PROFESSIONAL: [
    { label: "My Jobs", href: "/professional/jobs", icon: Briefcase },
    { label: "Bookings", href: "/professional/bookings", icon: Calendar },
    { label: "Wallet", href: "/professional/wallet", icon: Wallet },
    { label: "Schedule", href: "/professional/schedule", icon: Calendar },
    { label: "Shop", href: "/shop", icon: ShoppingBag },
    { label: "Profile", href: "/professional/profile", icon: User },
  ],
  CUSTOMER: [
    { label: "Book Service", href: "/", icon: Home },
    { label: "Shop", href: "/shop", icon: ShoppingBag },
    { label: "My Bookings", href: "/customer/bookings", icon: Calendar },
    { label: "My Orders", href: "/customer/orders", icon: ShoppingBag },
    { label: "Profile", href: "/customer/profile", icon: User },
  ],
  SUPPLIER: [
    { label: "Products", href: "/supplier/products", icon: Package },
    { label: "Orders", href: "/supplier/orders", icon: ShoppingBag },
    { label: "Analytics", href: "/supplier/analytics", icon: BarChart3 },
    { label: "Profile", href: "/supplier/profile", icon: User },
  ],
};

interface SidebarProps {
  role: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_ITEMS[role] ?? NAV_ITEMS.CUSTOMER;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b", collapsed && "justify-center px-2")}>
        <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-base shrink-0">
          S
        </div>
        {!collapsed && (
          <div>
            <span className="text-lg font-bold tracking-tight">SkillSewa</span>
            <p className="text-xs text-muted-foreground capitalize">{role.toLowerCase()} portal</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-muted-foreground hover:text-foreground hidden lg:flex"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand-50 text-brand-700 shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", active && "text-brand-600")} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto text-xs font-semibold bg-brand-100 text-brand-700 rounded-full px-2 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t p-3 space-y-1">
        <div className={cn("flex items-center gap-3 px-2 py-2 rounded-lg", collapsed && "justify-center")}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user?.avatarUrl ?? ""} alt={user?.name} />
            <AvatarFallback>{getInitials(user?.name ?? "U")}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.phone}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden rounded-lg border bg-white p-2 shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r shadow-xl transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 border-r bg-white transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent />
      </div>
    </>
  );
}
