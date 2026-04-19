export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const CreateIssueSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().positive().optional(),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const issues = await prisma.serviceIssue.findMany({
    where: { serviceId: id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return apiSuccess(issues.map((i) => ({ ...i, basePrice: Number(i.basePrice), minPrice: Number(i.minPrice), maxPrice: Number(i.maxPrice) })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return apiError("Service not found", 404);

  const body = await req.json();
  const parsed = CreateIssueSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const issue = await prisma.serviceIssue.create({
    data: {
      serviceId: id,
      name: parsed.data.name,
      description: parsed.data.description,
      basePrice: parsed.data.basePrice,
      minPrice: parsed.data.minPrice ?? parsed.data.basePrice * 0.8,
      maxPrice: parsed.data.maxPrice ?? parsed.data.basePrice * 1.5,
      sortOrder: parsed.data.sortOrder,
    },
  });
  return apiSuccess({ ...issue, basePrice: Number(issue.basePrice), minPrice: Number(issue.minPrice), maxPrice: Number(issue.maxPrice) }, 201);
}
