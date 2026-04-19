export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const ScheduleUpdateSchema = z.object({
  schedule: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    isAvailable: z.boolean(),
  })),
  isAvailable: z.boolean().optional(),
});

const LeaveSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const professional = await prisma.professional.findUnique({
    where: { userId: token.userId },
    include: {
      schedule: { orderBy: { dayOfWeek: "asc" } },
      leaves: {
        where: { endDate: { gte: new Date() } },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!professional) return apiError("Professional profile not found", 404);

  return apiSuccess({
    schedule: professional.schedule,
    leaves: professional.leaves,
    isAvailable: professional.isAvailable,
  });
}

export async function PUT(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);
  if (token.role !== "PROFESSIONAL") return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = ScheduleUpdateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const professional = await prisma.professional.findUnique({ where: { userId: token.userId } });
  if (!professional) return apiError("Profile not found", 404);

  const { schedule, isAvailable } = parsed.data;

  await prisma.$transaction([
    // Upsert each day's schedule
    ...schedule.map((slot) =>
      prisma.professionalSchedule.upsert({
        where: { professionalId_dayOfWeek: { professionalId: professional.id, dayOfWeek: slot.dayOfWeek } },
        update: { startTime: slot.startTime, endTime: slot.endTime, isAvailable: slot.isAvailable },
        create: { professionalId: professional.id, ...slot },
      })
    ),
    // Update availability toggle if provided
    ...(isAvailable !== undefined
      ? [prisma.professional.update({ where: { id: professional.id }, data: { isAvailable } })]
      : []),
  ]);

  return apiSuccess({ message: "Schedule updated" });
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);
  if (token.role !== "PROFESSIONAL") return apiError("Forbidden", 403);

  const body = await req.json();

  // Handle availability toggle
  if ("isAvailable" in body) {
    const professional = await prisma.professional.findUnique({ where: { userId: token.userId } });
    if (!professional) return apiError("Profile not found", 404);
    await prisma.professional.update({
      where: { id: professional.id },
      data: { isAvailable: Boolean(body.isAvailable) },
    });
    return apiSuccess({ isAvailable: body.isAvailable });
  }

  // Handle leave creation
  const parsed = LeaveSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const professional = await prisma.professional.findUnique({ where: { userId: token.userId } });
  if (!professional) return apiError("Profile not found", 404);

  const leave = await prisma.professionalLeave.create({
    data: {
      professionalId: professional.id,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      reason: parsed.data.reason,
    },
  });

  return apiSuccess(leave, 201);
}

export async function DELETE(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);
  if (token.role !== "PROFESSIONAL") return apiError("Forbidden", 403);

  const { searchParams } = req.nextUrl;
  const leaveId = searchParams.get("leaveId");
  if (!leaveId) return apiError("leaveId required", 400);

  const professional = await prisma.professional.findUnique({ where: { userId: token.userId } });
  if (!professional) return apiError("Profile not found", 404);

  // Verify ownership
  const leave = await prisma.professionalLeave.findFirst({
    where: { id: leaveId, professionalId: professional.id },
  });
  if (!leave) return apiError("Leave not found", 404);

  await prisma.professionalLeave.delete({ where: { id: leaveId } });

  return apiSuccess({ message: "Leave removed" });
}
