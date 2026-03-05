import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "../../../lib/supabase/server";
import { notifyNewSession, notifyLoginEvent } from "../../../lib/notifications";
import { isAdminEmail } from "../../../lib/admin";
import { ROUTES } from "../../../lib/routes";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "magiclink";

  const hasAuthParams = code || tokenHash;
  if (!hasAuthParams) {
    const url = new URL(ROUTES.ROOT, request.url);
    return NextResponse.redirect(url);
  }

  try {
    // Create redirect response first so we can write cookies to it
    const redirectUrl = new URL(ROUTES.ROOT, request.url);
    const response = NextResponse.redirect(redirectUrl, 307);

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
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    let data;
    if (code) {
      const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const url = new URL(ROUTES.ROOT, request.url);
        url.searchParams.set("error", "auth_failed");
        return NextResponse.redirect(url);
      }
      data = sessionData;
    } else if (tokenHash) {
      const otpType = ["magiclink", "email", "signup"].includes(type) ? type : "magiclink";
      const { data: sessionData, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      if (error) {
        const url = new URL(ROUTES.ROOT, request.url);
        url.searchParams.set("error", "auth_failed");
        return NextResponse.redirect(url);
      }
      data = sessionData;
    }

    // Log login event and notify on new sign-in (fire-and-forget, don't block redirect)
    const user = data?.session?.user;
    if (user?.email) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const userAgent = request.headers.get("user-agent") ?? "unknown";
      recordLoginAndNotify(user, ip, userAgent).catch(() => {});
    }

    return response;
  } catch {
    const url = new URL(ROUTES.ROOT, request.url);
    url.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(url);
  }
}

async function recordLoginAndNotify(user, ip, userAgent) {
  const serviceClient = createServiceClient();

  // Record login event
  try {
    const { data: priorLogins } = await serviceClient
      .from("login_events")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    const isFirstLogin = !priorLogins || priorLogins.length === 0;

    await serviceClient.from("login_events").insert({
      user_id: user.id,
      email: user.email,
      ip_address: ip,
      user_agent: userAgent,
      is_first_login: isFirstLogin,
    });

    notifyLoginEvent(user.email, ip, userAgent, isFirstLogin, serviceClient).catch((err) =>
      console.error("[auth/callback] notifyLoginEvent failed:", err?.message || err)
    );
  } catch (err) {
    console.error("[auth/callback] Failed to record login event:", err?.message || err);
  }

  // Notify on new session
  const excludeEmails = (process.env.NOTIFICATION_EXCLUDE_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const emailLower = user.email.toLowerCase();

  if (isAdminEmail(user.email) || excludeEmails.includes(emailLower)) {
    return;
  }

  try {
    const { data: priorViews } = await serviceClient
      .from("page_views")
      .select("id")
      .eq("user_email", user.email)
      .eq("deal_slug", "pst")
      .limit(1);

    const isFirstVisit = !priorViews || priorViews.length === 0;
    await notifyNewSession(user.email, isFirstVisit);
  } catch (err) {
    console.error("[auth/callback] Notification error:", err?.message || err);
  }
}
