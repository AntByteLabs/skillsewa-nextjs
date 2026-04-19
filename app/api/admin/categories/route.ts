export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const CategorySchema = z.object({
  code: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
  name: z.string().min(2).max(100),
  nameNp: z.string().optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";

  const categories = await prisma.serviceCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { services: true, professionals: true, skillRequests: true } },
    },
  });

  return apiSuccess(categories);
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = CategorySchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const existing = await prisma.serviceCategory.findUnique({ where: { code: parsed.data.code } });
  if (existing) return apiError("A category with this code already exists", 409);

  const category = await prisma.serviceCategory.create({ data: parsed.data });
  return apiSuccess(category, 201);
}
