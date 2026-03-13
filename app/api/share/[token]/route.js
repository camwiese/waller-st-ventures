import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/server";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function GET(request, { params }) {
  const { token } = await params;

  if (!token || typeof token !== "string" || token.length > 50) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { data: shareToken, error } = await serviceClient
    .from("share_tokens")
    .select("id, token, email, content_type, is_active, deal_slug")
    .eq("token", token)
    .single();

  if (error || !shareToken) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (!shareToken.is_active) {
    return NextResponse.json({ error: "This link is no longer available" }, { status: 410 });
  }

  // Update view count and last_viewed_at
  serviceClient
    .from("share_tokens")
    .update({
      view_count: shareToken.view_count + 1 || 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq("id", shareToken.id)
    .then(() => {})
    .catch(() => {});

  // For podcast: generate Mux playback token
  if (shareToken.content_type === "podcast") {
    const playbackId = process.env.MUX_PLAYBACK_ID;
    if (!playbackId) {
      return NextResponse.json({ error: "Video not configured" }, { status: 500 });
    }

    try {
      const playbackToken = mux.jwt.signPlaybackId(playbackId, {
        keyId: process.env.MUX_SIGNING_KEY_ID,
        keySecret: process.env.MUX_SIGNING_KEY_PRIVATE,
        expiration: "2h",
      });

      return NextResponse.json({
        contentType: "podcast",
        playbackId,
        token: playbackToken,
        email: shareToken.email,
        audioUrl: process.env.AUDIO_ONLY_URL || null,
      });
    } catch (err) {
      console.error("[share/token] Mux token error:", err?.message || err);
      return NextResponse.json({ error: "Failed to generate playback token" }, { status: 500 });
    }
  }

  // For deck: just return content type and email (PDF served via /api/share/[token]/deck)
  return NextResponse.json({
    contentType: "deck",
    email: shareToken.email,
  });
}
