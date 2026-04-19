export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api";

// In-memory OTP store (demo only — resets on server restart)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
  const { phone, otp: providedOtp } = await req.json();

  if (!phone) return apiError("Phone required", 400);

  // VERIFY mode
  if (providedOtp) {
    const stored = otpStore.get(phone);
    if (!stored) return apiError("OTP expired or not sent", 400);
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      return apiError("OTP expired", 400);
    }
    if (stored.code !== providedOtp) return apiError("Invalid OTP", 400);
    otpStore.delete(phone);
    return apiSuccess({ verified: true });
  }

  // SEND mode — generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

  // In production: send via Sparrow SMS
  // For demo: return the code directly
  return apiSuccess({
    sent: true,
    demoCode: code, // Remove in production
    message: `OTP sent to ${phone}`,
  });
}
