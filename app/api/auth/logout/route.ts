import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }

  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");

  return apiSuccess({ message: "Logged out successfully" });
}
