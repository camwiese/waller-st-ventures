import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../../lib/supabase/server";
import { notifyShareLinkView } from "../../../../../lib/notifications";
import { getNotificationRecipientsForInvestor } from "../../../../../lib/adminAuth";

const MAX_DURATION = 86400;
const RATE_LIMIT_PER_HOUR = 100;

export async function POST(request, { params }) {
  const { token } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const serviceClient = createServiceClient();

  // Validate token
  const { data: shareToken } = await serviceClient
    .from("share_tokens")
    .select("id, email, content_type, is_active")
    .eq("token", token)
    .single();

  if (!shareToken || !shareToken.is_active) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  // Rate limiting
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count } = await serviceClient
    .from("share_view_events")
    .select("id", { count: "exact", head: true })
    .eq("share_token_id", shareToken.id)
    .gte("created_at", oneHourAgo);

  if (count >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const { mode, durationSeconds, maxPositionSeconds, totalDurationSeconds } = body;
  const normalizedMode = shareToken.content_type === "deck" ? null : "video";

  // Validate payload
  const durationValid = typeof durationSeconds === "number" && durationSeconds >= 0 && durationSeconds <= MAX_DURATION;
  const maxPosValid = typeof maxPositionSeconds === "number" && maxPositionSeconds >= 0;
  const totalDurValid = typeof totalDurationSeconds === "number" && totalDurationSeconds >= 0;
  const modeValid = shareToken.content_type === "deck" ? mode == null : mode === "video";

  if (!durationValid || !maxPosValid || !totalDurValid || !modeValid) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ua = request.headers.get("user-agent") || "";
  const deviceType = /mobile|iphone|android/i.test(ua)
    ? /ipad|tablet/i.test(ua) ? "tablet" : "mobile"
    : "desktop";

  const { error } = await serviceClient.from("share_view_events").insert({
    share_token_id: shareToken.id,
    user_email: shareToken.email,
    content_type: shareToken.content_type,
    deal_slug: "pst",
    mode: normalizedMode,
    duration_seconds: Math.round(durationSeconds),
    max_position_seconds: Math.round(maxPositionSeconds),
    total_duration_seconds: Math.round(totalDurationSeconds),
    device_type: deviceType,
    user_agent: ua.slice(0, 500),
  });

  if (error) {
    console.error("[share/track] DB error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Fire-and-forget notification (one per email + content_type)
  runShareViewNotification(shareToken.email, shareToken.content_type, serviceClient).catch((err) => {
    console.error("[share/track] Notification error:", err?.message || err);
  });

  return NextResponse.json({ ok: true });
}

async function runShareViewNotification(email, contentType, serviceClient) {
  const { data: upserted, error } = await serviceClient
    .from("share_view_notifications")
    .upsert(
      { user_email: email, content_type: contentType, deal_slug: "pst" },
      { onConflict: "user_email,content_type,deal_slug", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    throw error;
  }

  if (!Array.isArray(upserted) || upserted.length === 0) return;

  const recipients = await getNotificationRecipientsForInvestor(email, serviceClient);
  await notifyShareLinkView(email, contentType, recipients);
}
