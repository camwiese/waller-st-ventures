import { NextResponse } from "next/server";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // If Supabase isn't configured, let everything through (landing-only mode)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  // Dynamically import to avoid Edge crashes when Supabase env vars are missing
  const { updateSession } = await import("./lib/supabase/middleware");
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|og-image\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
