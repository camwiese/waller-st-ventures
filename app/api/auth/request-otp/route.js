import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/server";
import { notifyAccessRequest } from "../../../../lib/notifications";
import { getAdminEmails } from "../../../../lib/admin";
import { isValidEmail, normalizeEmail } from "../../../../lib/email";
import { randomUUID } from "crypto";
import { normalizeAppUrl } from "../../../../lib/url";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DEDUP_WINDOW_MS = 90_000;

export async function POST(request) {
  console.log("[request-otp] POST received");
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = body;
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[request-otp] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return NextResponse.json({ error: { message: "Service temporarily unavailable" } }, { status: 503 });
  }

  const normalizedEmail = normalizeEmail(email);
  const adminEmails = getAdminEmails();

  let serviceClient;
  try {
    serviceClient = createServiceClient();
  } catch (err) {
    console.error("[request-otp] createServiceClient failed:", err?.message);
    return NextResponse.json({ error: { message: "Service temporarily unavailable" } }, { status: 503 });
  }

  // Check if email is on approved list (bypass for admin emails)
  const isGp = adminEmails.includes(normalizedEmail);
  if (!isGp) {
    const { data: allowed, error: allowedError } = await serviceClient
      .from("allowed_emails")
      .select("id")
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (allowedError) {
      console.error("[request-otp] allowed_emails query failed:", allowedError.message);
      return NextResponse.json(
        { error: { message: "Service temporarily unavailable" } },
        { status: 503 }
      );
    }

    if (!allowed) {
      // Not on list — record access request (or reuse existing pending) and notify recipients
      console.log("[request-otp] Access request path: email=" + normalizedEmail);
      const baseUrl = normalizeAppUrl(
        process.env.NEXT_PUBLIC_APP_URL,
        "https://waller-street-ventures.vercel.app"
      );

      const { data: existingPending } = await serviceClient
        .from("access_requests")
        .select("response_token")
        .eq("email", normalizedEmail)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let responseToken = existingPending?.response_token;
      if (!responseToken) {
        responseToken = randomUUID();
        await serviceClient.from("access_requests").insert({
          email: normalizedEmail,
          status: "pending",
          response_token: responseToken,
        });
      }

      const approveUrl = `${baseUrl}/api/admin/access-requests/respond?token=${responseToken}&action=approve`;
      const denyUrl = `${baseUrl}/api/admin/access-requests/respond?token=${responseToken}&action=deny`;

      let recipients = [];
      try {
        const { data: rows } = await serviceClient
          .from("access_request_notification_emails")
          .select("email")
          .order("created_at", { ascending: true });
        recipients = (rows || []).map((r) => r.email);
      } catch (err) {
        console.error("[request-otp] Failed to fetch notification recipients:", err?.message);
      }
      if (recipients.length === 0) {
        recipients = adminEmails.length > 0 ? adminEmails : [];
      }
      console.log("[request-otp] Notifying recipients:", recipients.join(", "));

      try {
        await notifyAccessRequest(normalizedEmail, approveUrl, denyUrl, recipients);
        console.log("[request-otp] notifyAccessRequest completed");
      } catch (err) {
        console.error("[request-otp] notifyAccessRequest failed:", err?.message);
      }

      return NextResponse.json(
        {
          error: {
            code: "not_invited",
            message:
              "You need to request access to view the WSV Data Room. Please contact whoever sent you here and ask them to add you. We've received your request and sent it to our team.",
          },
        },
        { status: 403 }
      );
    }
  }

  // Deduplicate rapid OTP requests (e.g. invite link opened in multiple browser contexts)
  try {
    const { data: recentSend } = await serviceClient
      .from("otp_attempts")
      .select("created_at")
      .eq("email", normalizedEmail)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSend) {
      const sentAt = new Date(recentSend.created_at).getTime();
      if (Date.now() - sentAt < DEDUP_WINDOW_MS) {
        return NextResponse.json({
          deduplicated: true,
          message: "Code already sent. Please check your inbox.",
        });
      }
    }
  } catch (err) {
    console.error("[request-otp] Dedup check failed, proceeding:", err?.message);
  }

  const otpBody = {
    email: normalizedEmail,
  };

  const supabaseUrl = SUPABASE_URL.replace(/\/$/, "");
  const otpUrl = `${supabaseUrl}/auth/v1/otp`;

  let supabaseRes;
  let supabaseData = {};
  try {
    supabaseRes = await fetch(otpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(otpBody),
    });
    supabaseData = await supabaseRes.json().catch(() => ({}));
  } catch (err) {
    console.error("[request-otp] Supabase fetch failed:", err?.message || err);
    return NextResponse.json({ error: { message: "Service temporarily unavailable" } }, { status: 503 });
  }

  let status = "sent";
  let errorMessage = null;

  if (!supabaseRes.ok) {
    const msg = supabaseData?.msg || supabaseData?.error_description || supabaseData?.message || "Unknown error";
    const errorCode = supabaseData?.error || supabaseData?.error_code || supabaseData?.code || "";
    const isRateLimit =
      supabaseRes.status === 429 ||
      errorCode === "over_email_send_rate_limit" ||
      String(msg).toLowerCase().includes("rate limit");
    status = isRateLimit ? "rate_limited" : "error";
    errorMessage = isRateLimit
      ? "Too many attempts. Please wait a minute and try again."
      : msg;
  }

  // Log OTP attempt — don't let audit failure crash the response
  try {
    const otpServiceClient = createServiceClient();
    await otpServiceClient.from("otp_attempts").insert({
      email: otpBody.email,
      status,
      error_message: errorMessage,
    });
  } catch (err) {
    console.error("[request-otp] Failed to log OTP attempt:", err?.message || err);
  }

  if (!supabaseRes.ok) {
    return NextResponse.json(
      { error: { message: errorMessage } },
      { status: supabaseRes.status }
    );
  }

  return NextResponse.json(supabaseData);
}
