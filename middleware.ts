import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/", "/login", "/register", "/shop", "/services", "/professionals", "/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/otp", "/api/products", "/api/services", "/uploads"];
const ROLE_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/professional": ["PROFESSIONAL", "ADMIN"],
  "/supplier": ["SUPPLIER", "ADMIN"],
  "/customer": ["CUSTOMER", "ADMIN"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Skip static files and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Get token
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Token expired" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("access_token");
    return res;
  }

  // Check role-based access
  for (const [route, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route) && !roles.includes(payload.role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Inject user info into headers for server components
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-user-id", payload.userId);
  reqHeaders.set("x-user-role", payload.role);
  reqHeaders.set("x-user-phone", payload.phone);

  return NextResponse.next({ request: { headers: reqHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
