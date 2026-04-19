export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError, apiPaginated, getPaginationParams } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

const CreateBookingSchema = z.object({
  serviceId: z.string(),
  scheduledAt: z.string().optional(),   // datetime-local gives "2026-03-26T14:30" — no timezone
  addressLine: z.string().min(1),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  notes: z.string().max(500).optional(),
  issueIds: z.array(z.string()).optional(),
  estimatedPrice: z.number().positive().optional(),
});

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);
  const status = req.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> =
    token.role === "CUSTOMER"
      ? { customerId: token.userId }
      : token.role === "PROFESSIONAL"
      ? { professional: { userId: token.userId } }
      : {};

  if (status) where.status = status;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        service: { include: { category: true } },
        customer: { select: { name: true, phone: true } },
        professional: { include: { user: { select: { name: true, phone: true } } } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return apiPaginated(bookings, total, page, limit);
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);
  if (!["CUSTOMER", "PROFESSIONAL", "ADMIN"].includes(token.role)) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = CreateBookingSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const { serviceId, scheduledAt, addressLine, locationLat, locationLng, notes, issueIds, estimatedPrice } = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return apiError("Service not found", 404);

  // Auto-match professional: prefer nearest if coordinates given, else pick best available
  let matchedProfessionalId: string | undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const baseWhere = {
    isAvailable: true,
    skillCategories: { some: { category: { id: service.categoryId } } },
    // Exclude professionals on leave today
    NOT: {
      leaves: {
        some: {
          startDate: { lte: today },
          endDate: { gte: today },
        },
      },
    },
  };

  if (locationLat && locationLng) {
    const availablePros = await prisma.professional.findMany({
      where: { ...baseWhere, user: { locationLat: { not: null }, locationLng: { not: null } } },
      include: { user: { select: { locationLat: true, locationLng: true } } },
      orderBy: { ratingAvg: "desc" },
    });

    let nearest: typeof availablePros[0] | null = null;
    let minDist = Infinity;

    for (const pro of availablePros) {
      if (!pro.user.locationLat || !pro.user.locationLng) continue;
      const R = 6371;
      const dLat = ((Number(pro.user.locationLat) - locationLat) * Math.PI) / 180;
      const dLng = ((Number(pro.user.locationLng) - locationLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((locationLat * Math.PI) / 180) *
          Math.cos((Number(pro.user.locationLat) * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (dist <= config.business.workerSearchRadiusKm && dist < minDist) {
        minDist = dist;
        nearest = pro;
      }
    }

    matchedProfessionalId = nearest?.id;
  }

  // Fallback: if no coordinates or no match within radius, pick best-rated available professional
  if (!matchedProfessionalId) {
    const fallback = await prisma.professional.findFirst({
      where: baseWhere,
      orderBy: [{ ratingAvg: "desc" }, { jobsCompleted: "desc" }],
    });
    matchedProfessionalId = fallback?.id;
  }

  // Validate issue IDs and fetch their prices
  let issueRecords: { id: string; basePrice: import("@prisma/client").Prisma.Decimal }[] = [];
  if (issueIds && issueIds.length > 0) {
    issueRecords = await prisma.serviceIssue.findMany({
      where: { id: { in: issueIds }, serviceId, isActive: true },
      select: { id: true, basePrice: true },
    });
  }

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        customerId: token.userId,
        serviceId,
        professionalId: matchedProfessionalId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        addressLine,
        locationLat,
        locationLng,
        notes,
        connectionFee: config.business.connectionFee,
        estimatedPrice: estimatedPrice ?? null,
        status: matchedProfessionalId ? "CONFIRMED" : "PENDING",
      },
      include: {
        service: { include: { category: true } },
        professional: { include: { user: { select: { name: true, phone: true } } } },
      },
    });

    if (issueRecords.length > 0) {
      await tx.bookingIssue.createMany({
        data: issueRecords.map((issue) => ({
          bookingId: created.id,
          serviceIssueId: issue.id,
          priceAtBooking: issue.basePrice,
        })),
      });
    }

    return created;
  });

  return apiSuccess(booking, 201);
}
