import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "skillsewa-secret-change-in-production"
);

export interface TokenPayload {
  userId: string;
  role: string;
  phone: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? "24h")
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES_IN ?? "7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      phone: payload.phone as string,
    };
  } catch {
    return null;
  }
}

export async function getTokenFromRequest(
  req: NextRequest
): Promise<TokenPayload | null> {
  // 1. Bearer token in Authorization header (API clients / mobile)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return verifyToken(token);
  }

  // 2. HTTP-only cookie (browser requests — the primary path)
  const cookieToken = req.cookies.get("access_token")?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  // 3. Middleware-injected headers (when middleware already validated the token)
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  const phone = req.headers.get("x-user-phone");
  if (userId && role && phone) {
    return { userId, role, phone };
  }

  return null;
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function requireRole(
  tokenPayload: TokenPayload | null,
  ...roles: string[]
): boolean {
  if (!tokenPayload) return false;
  return roles.includes(tokenPayload.role);
}
