export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const radius = parseFloat(req.nextUrl.searchParams.get("radius") ?? String(config.business.workerSearchRadiusKm));

  if (isNaN(lat) || isNaN(lng)) {
    return apiError("lat and lng query params required", 400);
  }

  const professionals = await prisma.professional.findMany({
    where: {
      isAvailable: true,
      isVerified: true,
      user: { locationLat: { not: null }, locationLng: { not: null }, isActive: true },
      ...(categoryId ? { skillCategories: { some: { categoryId } } } : {}),
    },
    include: {
      user: { select: { name: true, phone: true, city: true, locationLat: true, locationLng: true, avatarUrl: true } },
      skillCategories: { include: { category: true }, take: 3 },
    },
    take: 50,
  });

  // Filter by radius using Haversine
  const nearby = professionals
    .map((pro) => {
      const pLat = Number(pro.user.locationLat);
      const pLng = Number(pro.user.locationLng);
      const R = 6371;
      const dLat = ((pLat - lat) * Math.PI) / 180;
      const dLng = ((pLng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((pLat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...pro, distance: Math.round(distance * 10) / 10 };
    })
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  return apiSuccess(
    nearby.map((p) => ({
      id: p.id,
      userId: p.userId,
      grade: p.grade,
      ratingAvg: Number(p.ratingAvg),
      ratingCount: p.ratingCount,
      jobsCompleted: p.jobsCompleted,
      isAvailable: p.isAvailable,
      distance: p.distance,
      responseRate: Number(p.responseRate),
      user: p.user,
      skillCategories: p.skillCategories.map((sc) => ({
        id: sc.id,
        name: sc.category.name,
        code: sc.category.code,
      })),
    }))
  );
}
