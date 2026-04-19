import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, signRefreshToken } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { cookies } from "next/headers";

const LoginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(4),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Phone/email and password required", 422);
    }

    const { identifier, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
      },
      include: {
        professional: {
          include: {
            skillCategories: { include: { category: true } },
          },
        },
        supplier: true,
      },
    });

    if (!user || !user.isActive) {
      return apiError("Invalid credentials", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return apiError("Invalid credentials", 401);
    }

    const tokenPayload = { userId: user.id, role: user.role, phone: user.phone };
    const [accessToken, refreshToken] = await Promise.all([
      signToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    // Set HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24h
    });
    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7d
    });

    // Save refresh token to DB
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return apiSuccess({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        locationLat: user.locationLat,
        locationLng: user.locationLng,
        professional: user.professional
          ? {
              id: user.professional.id,
              grade: user.professional.grade,
              ratingAvg: user.professional.ratingAvg,
              jobsCount: user.professional.jobsCount,
              isAvailable: user.professional.isAvailable,
              skillCategories: user.professional.skillCategories.map((sc) => ({
                code: sc.category.code,
                name: sc.category.name,
              })),
            }
          : null,
        supplier: user.supplier
          ? { id: user.supplier.id, businessName: user.supplier.businessName }
          : null,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    return apiError("Login failed. Please try again.", 500);
  }
}
