export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError, apiPaginated, getPaginationParams } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const CreateReviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  const professionalId = req.nextUrl.searchParams.get("professionalId");
  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);

  const where = professionalId
    ? { reviewee: { professional: { id: professionalId } }, isPublic: true }
    : { isPublic: true };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        reviewer: { select: { name: true, avatarUrl: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return apiPaginated(reviews, total, page, limit);
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const body = await req.json();
  const parsed = CreateReviewSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const { bookingId, rating, comment } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { professional: true },
  });

  if (!booking) return apiError("Booking not found", 404);
  if (booking.customerId !== token.userId) return apiError("Forbidden", 403);
  if (booking.status !== "COMPLETED") return apiError("Can only review completed bookings", 400);

  const existing = await prisma.review.findUnique({ where: { bookingId } });
  if (existing) return apiError("Review already submitted", 409);

  if (!booking.professionalId || !booking.professional) return apiError("No professional to review", 400);

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: {
        bookingId,
        reviewerId: token.userId,
        revieweeId: booking.professional!.userId,
        rating,
        comment,
      },
    });

    // Update professional rating
    const allReviews = await tx.review.aggregate({
      where: { revieweeId: booking.professional!.userId },
      _avg: { rating: true },
      _count: true,
    });

    await tx.professional.update({
      where: { id: booking.professionalId! },
      data: {
        ratingAvg: allReviews._avg.rating ?? rating,
        ratingCount: allReviews._count,
      },
    });

    return r;
  });

  return apiSuccess(review, 201);
}
