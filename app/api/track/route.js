import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../lib/supabase/server";
import { notifyNewSession, notifyHighIntent } from "../../../lib/notifications";
import { getNotificationRecipientsForInvestor, isAnyAdmin } from "../../../lib/adminAuth";
import {
  computeRawIntentScore,
  getRecencyFactor,
  groupIntoSessions,
  SESSION_GAP_MINUTES,
} from "../../../lib/intentScore";
import { TAB_WEIGHTS } from "../../../constants/tabs";

const ALLOWED_DEAL_SLUGS = ["pst"];
const MAX_DEAL_SLUG_LENGTH = 64;
const MAX_TAB_ID_LENGTH = 64;
const MAX_TIME_SPENT_SECONDS = 86400; // 24 hours

async function runNotificationsInBackground(user, dealSlug, tabId, inserted, priorEvents) {
  try {
    const serviceClient = createServiceClient();
    const insertedAt = new Date(inserted.created_at).getTime();

    // Get scoped notification recipients (GP + partner who invited this investor)
    const recipients = await getNotificationRecipientsForInvestor(user.email, serviceClient);

    const isFirstVisit = !priorEvents || priorEvents.length === 0;
    if (isFirstVisit) {
      await notifyNewSession(user.email, true, tabId, recipients);
    } else {
      const gapMs = insertedAt - new Date(priorEvents[0].created_at).getTime();
      const isNewSession = gapMs > SESSION_GAP_MINUTES * 60 * 1000;
      if (isNewSession) {
        await notifyNewSession(user.email, false, tabId, recipients);
      }
    }

    const HIGH_INTENT_THRESHOLD = 50;
    const { data: allViews } = await serviceClient
      .from("page_views")
      .select("tab_id, time_spent_seconds, created_at")
      .eq("user_email", user.email)
      .eq("deal_slug", dealSlug);

    if (allViews && allViews.length > 0) {
      const rawScore = computeRawIntentScore(allViews, TAB_WEIGHTS, groupIntoSessions);
      const lastActive = allViews.reduce(
        (latest, r) => (r.created_at > latest ? r.created_at : latest),
        allViews[0].created_at
      );
      const intentScore = Math.round(rawScore * getRecencyFactor(lastActive));

      if (intentScore >= HIGH_INTENT_THRESHOLD) {
        const { data: upserted } = await serviceClient
          .from("high_intent_notifications")
          .upsert(
            {
              user_email: user.email,
              deal_slug: dealSlug,
              intent_score: intentScore,
            },
            { onConflict: "user_email,deal_slug", ignoreDuplicates: true }
          )
          .select("id")
          .single();

        if (upserted) {
          await notifyHighIntent(user.email, intentScore, recipients);
        }
      }
    }
  } catch (err) {
    console.error("[track] Notification error:", err?.message || err);
  }
}

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

  const { dealSlug, tabId, timeSpentSeconds } = body;
  if (
    typeof dealSlug !== "string" ||
    typeof tabId !== "string" ||
    typeof timeSpentSeconds !== "number" ||
    timeSpentSeconds < 1 ||
    timeSpentSeconds > MAX_TIME_SPENT_SECONDS ||
    dealSlug.length > MAX_DEAL_SLUG_LENGTH ||
    tabId.length > MAX_TAB_ID_LENGTH ||
    !ALLOWED_DEAL_SLUGS.includes(dealSlug)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { data: inserted, error } = await serviceClient
    .from("page_views")
    .insert({
      user_email: user.email,
      deal_slug: dealSlug,
      tab_id: tabId,
      time_spent_seconds: timeSpentSeconds,
    })
    .select("created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const { data: priorEvents } = await serviceClient
    .from("page_views")
    .select("created_at")
    .eq("user_email", user.email)
    .eq("deal_slug", dealSlug)
    .lt("created_at", inserted.created_at)
    .order("created_at", { ascending: false })
    .limit(1);

  const gpEmails = (process.env.GP_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const userEmailLower = (user.email || "").toLowerCase();
  const excludeEmails = (process.env.NOTIFICATION_EXCLUDE_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminUser = gpEmails.includes(userEmailLower) || await isAnyAdmin(userEmailLower);
  const shouldExclude = isAdminUser || excludeEmails.includes(userEmailLower);

  if (!shouldExclude) {
    runNotificationsInBackground(user, dealSlug, tabId, inserted, priorEvents).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
