import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../lib/supabase/server";

const MAX_DURATION = 86400;

export async function POST(request) {
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode, durationSeconds, maxPositionSeconds, totalDurationSeconds } = body;

  if (
    !["video", "audio"].includes(mode) ||
    typeof durationSeconds !== "number" ||
    durationSeconds < 1 ||
    durationSeconds > MAX_DURATION ||
    typeof maxPositionSeconds !== "number" ||
    maxPositionSeconds < 0 ||
    typeof totalDurationSeconds !== "number" ||
    totalDurationSeconds < 0
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ua = request.headers.get("user-agent") || "";
  const deviceType = /mobile|iphone|android/i.test(ua)
    ? /ipad|tablet/i.test(ua) ? "tablet" : "mobile"
    : "desktop";

  const serviceClient = createServiceClient();

  const { error } = await serviceClient.from("video_view_events").insert({
    user_email: user.email.toLowerCase(),
    deal_slug: "pst",
    mode,
    duration_seconds: Math.round(durationSeconds),
    max_position_seconds: Math.round(maxPositionSeconds),
    total_duration_seconds: Math.round(totalDurationSeconds),
    device_type: deviceType,
    user_agent: ua.slice(0, 500),
  });

  if (error) {
    console.error("[video-track] DB error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
