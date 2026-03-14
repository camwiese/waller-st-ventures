import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/server";
import { createMuxClient, getMuxConfig } from "../../../../lib/muxConfig";
import { notifyShareLinkView } from "../../../../lib/notifications";
import { getNotificationRecipientsForInvestor } from "../../../../lib/adminAuth";

export async function GET(request, { params }) {
  const { token } = await params;

  if (!token || typeof token !== "string" || token.length > 50) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { data: shareToken, error } = await serviceClient
    .from("share_tokens")
    .select("id, token, email, content_type, is_active, deal_slug, view_count")
    .eq("token", token)
    .single();

  if (error || !shareToken) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (!shareToken.is_active) {
    return NextResponse.json({ error: "This link is no longer available" }, { status: 410 });
  }

  const nextViewCount = (shareToken.view_count || 0) + 1;
  const lastViewedAt = new Date().toISOString();
  const { error: updateError } = await serviceClient
    .from("share_tokens")
    .update({
      view_count: nextViewCount,
      last_viewed_at: lastViewedAt,
    })
    .eq("id", shareToken.id);

  if (updateError) {
    console.error("[share/token] Failed to update view count:", updateError.message);
  }

  // Fire-and-forget email notification (deduped via share_view_notifications)
  runShareViewNotification(shareToken.email, shareToken.content_type, serviceClient).catch((err) => {
    console.error("[share/token] Notification error:", err?.message || err);
  });

  // For podcast: generate Mux playback token
  if (shareToken.content_type === "podcast") {
    const { playbackId, signingKeyId, signingKeyPrivate } = getMuxConfig();
    if (!playbackId || !signingKeyId || !signingKeyPrivate) {
      return NextResponse.json({ error: "Video not configured" }, { status: 500 });
    }

    try {
      const mux = createMuxClient();
      const playbackToken = await mux.jwt.signPlaybackId(playbackId, {
        keyId: signingKeyId,
        keySecret: signingKeyPrivate,
        expiration: "2h",
      });

      return NextResponse.json({
        contentType: "podcast",
        playbackId,
        token: playbackToken,
        email: shareToken.email,
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

async function runShareViewNotification(email, contentType, serviceClient) {
  const { data: upserted, error } = await serviceClient
    .from("share_view_notifications")
    .upsert(
      { user_email: email, content_type: contentType, deal_slug: "pst" },
      { onConflict: "user_email,content_type,deal_slug", ignoreDuplicates: true }
    )
    .select("id");

  if (error) throw error;
  if (!Array.isArray(upserted) || upserted.length === 0) return;

  const recipients = await getNotificationRecipientsForInvestor(email, serviceClient);
  await notifyShareLinkView(email, contentType, recipients);
}
