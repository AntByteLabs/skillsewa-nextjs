export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  const { id, issueId } = await params;
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  const body = await req.json();
  const issue = await prisma.serviceIssue.update({
    where: { id: issueId, serviceId: id },
    data: body,
  });
  return apiSuccess({ ...issue, basePrice: Number(issue.basePrice), minPrice: Number(issue.minPrice), maxPrice: Number(issue.maxPrice) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  const { id, issueId } = await params;
  const token = await getTokenFromRequest(req);
  if (!token || token.role !== "ADMIN") return apiError("Forbidden", 403);

  await prisma.serviceIssue.delete({ where: { id: issueId, serviceId: id } });
  return apiSuccess({ message: "Issue deleted" });
}
