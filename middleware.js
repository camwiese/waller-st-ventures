import { NextResponse } from "next/server";

// All logic inlined to avoid importing @supabase/ssr at module load time,
// which crashes Vercel Edge runtime when Supabase env vars are missing.

const PUBLIC_PATHS = ["/", "/login", "/auth/callback", "/auth/verify"];

function isPublic(pathname) {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth/");
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public routes — always pass through, no Supabase needed
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // If Supabase is not configured, redirect everything else to landing page
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Supabase is configured — import and run auth
  try {
    const { createServerClient } = await import("@supabase/ssr");

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isProtected =
      pathname === "/pst" ||
      pathname.startsWith("/pst/") ||
      pathname.startsWith("/admin");

    // Not logged in → redirect to login
    if (!user && isProtected) {
      const url = request.nextUrl.clone();
      const email = url.searchParams.get("email");
      url.pathname = "/login";
      url.search = email ? `?email=${encodeURIComponent(email)}` : "";
      return NextResponse.redirect(url);
    }

    // Non-admin trying to access /admin → redirect to /pst
    if (user && pathname.startsWith("/admin")) {
      const gpEmails = (process.env.GP_EMAIL || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (!gpEmails.includes(user.email?.toLowerCase())) {
        const url = request.nextUrl.clone();
        url.pathname = "/pst";
        return NextResponse.redirect(url);
      }
    }

    // Already logged in on /login → send to /pst
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/pst";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (e) {
    console.error("[middleware] Error:", e?.message || e);
    // On any failure, redirect to landing page
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|og-image\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
