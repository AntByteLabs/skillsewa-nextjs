import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, signRefreshToken } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { cookies } from "next/headers";

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^9[6-8]\d{8}$/, "Invalid Nepal phone number"),
  password: z.string().min(6),
  role: z.enum(["CUSTOMER", "PROFESSIONAL", "SUPPLIER"]).default("CUSTOMER"),
  city: z.string().optional(),
  email: z.string().email().optional(),
  referralCode: z.string().optional(), // professional referral code
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 422, parsed.error.flatten());
    }

    const { name, phone, password, role, city, email, referralCode } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return apiError("Phone number already registered", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name, phone, passwordHash, role, city, email },
      });

      // Create wallet for all users
      await tx.wallet.create({
        data: { userId: newUser.id },
      });

      // Create role-specific profile
      if (role === "PROFESSIONAL") {
        // Resolve referral code → referredById
        let referredById: string | undefined;
        if (referralCode) {
          const referrer = await tx.professional.findUnique({
            where: { referralCode: referralCode.toUpperCase() },
            select: { id: true },
          });
          if (referrer) referredById = referrer.id;
        }
        await tx.professional.create({
          data: { userId: newUser.id, ...(referredById ? { referredById } : {}) },
        });
      } else if (role === "SUPPLIER") {
        await tx.supplier.create({
          data: {
            userId: newUser.id,
            businessName: name,
            isVerified: false,
          },
        });
      }

      return newUser;
    });

    const tokenPayload = { userId: user.id, role: user.role, phone: user.phone };
    const [accessToken, refreshToken] = await Promise.all([
      signToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return apiSuccess(
      {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
        accessToken,
        refreshToken,
      },
      201
    );
  } catch (err) {
    console.error("Register error:", err);
    return apiError("Registration failed.", 500);
  }
}
