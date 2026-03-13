import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createMuxClient, getMuxConfig } from "../../../../lib/muxConfig";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playbackId, signingKeyId, signingKeyPrivate } = getMuxConfig();
  if (!playbackId || !signingKeyId || !signingKeyPrivate) {
    return NextResponse.json({ error: "Video not configured" }, { status: 500 });
  }

  try {
    const mux = createMuxClient();
    const token = mux.jwt.signPlaybackId(playbackId, {
      keyId: signingKeyId,
      keySecret: signingKeyPrivate,
      expiration: "2h",
    });

    return NextResponse.json({
      playbackId,
      token,
    });
  } catch (err) {
    console.error("[mux/token] Error generating token:", err?.message || err);
    return NextResponse.json({ error: "Failed to generate playback token" }, { status: 500 });
  }
}
