export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError, getPaginationParams, apiPaginated } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

  const where = {
    userId: token.userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: token.userId, isRead: false } }),
  ]);

  return apiPaginated(
    notifications,
    total,
    page,
    limit
  );
}

export async function PATCH(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  // Mark all as read
  await prisma.notification.updateMany({
    where: { userId: token.userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return apiSuccess({ message: "All notifications marked as read" });
}
