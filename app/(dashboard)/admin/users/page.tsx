export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatDate } from "@/lib/utils";
import { MapPin, Phone } from "lucide-react";

const ROLE_VARIANTS: Record<string, "default" | "info" | "success" | "warning"> = {
  ADMIN: "default",
  PROFESSIONAL: "info",
  CUSTOMER: "success",
  SUPPLIER: "warning",
};

export default async function AdminUsersPage() {
  const [users, counts] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, name: true, phone: true, email: true, role: true,
        isActive: true, isVerified: true, city: true, createdAt: true,
        _count: { select: { bookingsAsCustomer: true } },
      },
    }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
  ]);

  const roleCounts = Object.fromEntries(counts.map((c) => [c.role, c._count]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">{users.length} registered users</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["CUSTOMER", "PROFESSIONAL", "SUPPLIER", "ADMIN"].map((role) => (
          <Card key={role}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{roleCounts[role] ?? 0}</p>
              <Badge variant={ROLE_VARIANTS[role]}>{role}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All Users</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-4 px-6 py-3.5">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{user.name}</p>
                    <Badge variant={ROLE_VARIANTS[user.role]} className="text-xs">{user.role}</Badge>
                    {user.isVerified && <span className="text-xs text-brand-600">✓ Verified</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</span>
                    {user.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{user.city}</span>}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <p>{formatDate(user.createdAt)}</p>
                  <Badge variant={user.isActive ? "success" : "destructive"} className="mt-0.5">
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
