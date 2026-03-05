import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../../lib/supabase/server";
import { sendInviteEmail } from "../../../../../lib/notifications";
import { isValidEmail, normalizeEmail } from "../../../../../lib/email";
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token || !action || !["approve", "deny"].includes(action)) {
    const url = new URL("/admin", request.url);
    url.searchParams.set("error", "invalid_link");
    return NextResponse.redirect(url);
  }

  const serviceClient = createServiceClient();

  const { data: requests, error: fetchError } = await serviceClient
    .from("access_requests")
    .select("id, email, status, requested_at")
    .eq("response_token", token)
    .eq("status", "pending")
    .limit(1);

  if (fetchError || !requests?.length) {
    const url = new URL("/admin", request.url);
    url.searchParams.set("error", "expired_or_invalid");
    return NextResponse.redirect(url);
  }

  const req = requests[0];
  const requestedAt = new Date(req.requested_at).getTime();
  if (Date.now() - requestedAt > TOKEN_MAX_AGE_MS) {
    const url = new URL("/admin", request.url);
    url.searchParams.set("error", "expired");
    return NextResponse.redirect(url);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const adminUrl = new URL("/admin", baseUrl);

  if (action === "deny") {
    const { error: updateError } = await serviceClient
      .from("access_requests")
      .update({ status: "denied", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);

    if (updateError) {
      adminUrl.searchParams.set("error", "failed");
    } else {
      adminUrl.searchParams.set("message", "denied");
    }
    return NextResponse.redirect(adminUrl);
  }

  // Approve
  const targetEmail = normalizeEmail(req.email);
  if (!isValidEmail(targetEmail)) {
    adminUrl.searchParams.set("error", "invalid_email");
    return NextResponse.redirect(adminUrl);
  }

  const { error: insertError } = await serviceClient.from("allowed_emails").insert({
    email: targetEmail,
    source: "request_approved",
    invited_by: null,
    notes: null,
  });

  if (insertError && insertError.code !== "23505") {
    adminUrl.searchParams.set("error", "failed");
    return NextResponse.redirect(adminUrl);
  }

  const { error: updateError } = await serviceClient
    .from("access_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", req.id);

  if (updateError) {
    adminUrl.searchParams.set("error", "failed");
    return NextResponse.redirect(adminUrl);
  }

  // Send invite email before redirecting (must await on serverless)
  try {
    await sendInviteEmail(targetEmail, "approved");
  } catch (err) {
    console.error("[access-requests/respond] sendInviteEmail failed:", err?.message);
  }

  adminUrl.searchParams.set("message", "approved");
  return NextResponse.redirect(adminUrl);
}
