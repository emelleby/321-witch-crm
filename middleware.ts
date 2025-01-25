import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createMiddlewareClient(request);

    // Refresh session if it exists
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Session error:", error.message);
    }

    // If there's no session and the user is trying to access a protected route
    if (!session && isProtectedRoute(request.nextUrl.pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (e) {
    console.error("Middleware error:", e);
    return NextResponse.next();
  }
}

// Add a matcher for all routes that should be protected
export const config = {
  matcher: [
    "/admin/:path*",
    "/agent/:path*",
    "/customer/:path*",
    "/verify-email",
    "/profile",
  ],
};

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/agent") ||
    pathname.startsWith("/customer") ||
    pathname === "/verify-email" ||
    pathname === "/profile"
  );
}
