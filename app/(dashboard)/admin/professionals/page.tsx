export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatDate } from "@/lib/utils";
import { Star, MapPin, Briefcase } from "lucide-react";

const GRADE_VARIANTS: Record<string, "bronze" | "silver" | "gold" | "platinum" | "elite"> = {
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
  ELITE: "elite",
};

export default async function AdminProfessionalsPage() {
  const professionals = await prisma.professional.findMany({
    include: {
      user: { select: { name: true, phone: true, city: true, isActive: true, isVerified: true, createdAt: true } },
      skillCategories: { include: { category: true }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Professionals</h1>
        <p className="text-muted-foreground">{professionals.length} registered professionals</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {professionals.map((pro) => (
          <Card key={pro.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="h-11 w-11">
                  <AvatarFallback>{getInitials(pro.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{pro.user.name}</p>
                    {pro.isVerified && (
                      <span className="text-xs text-brand-600">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{pro.user.phone}</p>
                  {pro.user.city && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{pro.user.city}</span>
                    </div>
                  )}
                </div>
                <Badge variant={GRADE_VARIANTS[pro.grade]}>{pro.grade}</Badge>
              </div>

              <div className="flex items-center gap-4 text-sm mb-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium">{Number(pro.ratingAvg).toFixed(1)}</span>
                  <span className="text-muted-foreground">({pro.ratingCount})</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{pro.jobsCompleted} jobs</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {pro.skillCategories.map((sc) => (
                  <span key={sc.id} className="text-xs rounded-full bg-brand-50 text-brand-700 px-2 py-0.5">
                    {sc.category.name}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex gap-2">
                  <Badge variant={pro.isVerified ? "success" : "warning"}>
                    {pro.isVerified ? "Verified" : "Pending"}
                  </Badge>
                  <Badge variant={pro.isAvailable ? "success" : "secondary"}>
                    {pro.isAvailable ? "Available" : "Busy"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">Joined {formatDate(pro.user.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
