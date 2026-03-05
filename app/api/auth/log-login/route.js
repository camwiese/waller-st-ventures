import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { notifyLoginEvent } from "../../../../lib/notifications";
import { headers } from "next/headers";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn("[log-login] No auth user found; skipping login event.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = headersList.get("user-agent") ?? "unknown";

  const serviceClient = createServiceClient();

  const { data: priorLogins } = await serviceClient
    .from("login_events")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  const isFirstLogin = !priorLogins || priorLogins.length === 0;

  try {
    await serviceClient.from("login_events").insert({
      user_id: user.id,
      email: user.email,
      ip_address: ip,
      user_agent: userAgent,
      is_first_login: isFirstLogin,
    });
  } catch (err) {
    console.error("[log-login] Failed to insert login_event:", err?.message || err);
  }

  notifyLoginEvent(user.email, ip, userAgent, isFirstLogin, serviceClient).catch((err) =>
    console.error("[log-login] notifyLoginEvent failed:", err?.message || err)
  );

  return NextResponse.json({ ok: true });
}
