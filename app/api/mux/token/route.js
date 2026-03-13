import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playbackId = process.env.MUX_PLAYBACK_ID;
  if (!playbackId) {
    return NextResponse.json({ error: "Video not configured" }, { status: 500 });
  }

  try {
    const token = mux.jwt.signPlaybackId(playbackId, {
      keyId: process.env.MUX_SIGNING_KEY_ID,
      keySecret: process.env.MUX_SIGNING_KEY_PRIVATE,
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
