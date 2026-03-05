import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request) {
  // Landing page (/) is fully public — skip auth
  if (request.nextUrl.pathname === "/") {
    return;
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|og-image\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
