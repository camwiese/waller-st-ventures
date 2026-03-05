import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { isAdminEmail } from "../admin";
import { ROUTES } from "../routes";

export async function updateSession(request) {
  if (process.env.NODE_ENV === "development" && process.env.BYPASS_AUTH_MIDDLEWARE === "1") {
    return NextResponse.next({ request });
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    const isProtected =
      pathname === ROUTES.ROOT ||
      pathname.startsWith(ROUTES.ADMIN) ||
      pathname.startsWith(ROUTES.WELCOME);

    if (!user && isProtected) {
      const url = request.nextUrl.clone();
      const email = url.searchParams.get("email");
      url.pathname = ROUTES.LOGIN;
      url.search = email ? `?email=${encodeURIComponent(email)}` : "";
      return NextResponse.redirect(url);
    }

    if (user && pathname.startsWith(ROUTES.ADMIN) && !isAdminEmail(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.ROOT;
      return NextResponse.redirect(url);
    }

    if (user && pathname === ROUTES.LOGIN) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.ROOT;
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (e) {
    console.error("[middleware] Auth check failed:", e?.message || e);
    // Supabase unreachable — block protected routes instead of allowing through
    const { pathname } = request.nextUrl;
    const isProtected =
      pathname === ROUTES.ROOT ||
      pathname.startsWith(ROUTES.ADMIN) ||
      pathname.startsWith(ROUTES.WELCOME);
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.LOGIN;
      url.search = "?error=service_unavailable";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }
}
