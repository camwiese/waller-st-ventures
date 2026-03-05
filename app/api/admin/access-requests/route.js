import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { sendInviteEmail } from "../../../../lib/notifications";
import { isAdminEmail } from "../../../../lib/admin";
import { isValidEmail, normalizeEmail } from "../../../../lib/email";
function requireAdmin(supabase) {
  return async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
    }
    return { user };
  };
}

export async function GET() {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase)();
  if (auth.error) return auth.error;

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("access_requests")
    .select("id, email, requested_at, status, reviewed_at, reviewed_by")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/access-requests] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch access requests" }, { status: 500 });
  }

  return NextResponse.json({ requests: data || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase)();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, action, invitedBy, notes } = body;
  if (!action || !["approve", "deny"].includes(action)) {
    return NextResponse.json({ error: "Email and action (approve|deny) required" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const targetEmail = normalizeEmail(email);
  const reviewer = auth.user?.email?.toLowerCase() || "admin";

  const serviceClient = createServiceClient();

  const { data: requests, error: fetchError } = await serviceClient
    .from("access_requests")
    .select("id, status")
    .eq("email", targetEmail)
    .eq("status", "pending");

  if (fetchError || !requests?.length) {
    return NextResponse.json({ error: "No pending request found for this email" }, { status: 404 });
  }

  const now = new Date().toISOString();

  const requestIds = requests.map((r) => r.id);

  if (action === "deny") {
    const { error: updateError } = await serviceClient
      .from("access_requests")
      .update({ status: "denied", reviewed_at: now, reviewed_by: reviewer })
      .in("id", requestIds);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Approve: add to allowed_emails, update all pending requests for this email
  const { error: insertError } = await serviceClient.from("allowed_emails").insert({
    email: targetEmail,
    source: "request_approved",
    invited_by: invitedBy?.trim() || null,
    notes: notes?.trim() || null,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      // Already on list — just update the requests
    } else {
      console.error("[admin/access-requests] Insert allowed_emails error:", insertError);
      return NextResponse.json({ error: "Failed to add to invite list" }, { status: 500 });
    }
  }

  const { error: updateError } = await serviceClient
    .from("access_requests")
    .update({ status: "approved", reviewed_at: now, reviewed_by: reviewer })
    .in("id", requestIds);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }

  // Send invite email so they can log in
  const invitedByVal = invitedBy?.trim() || null;
  const invitedByName = invitedByVal && !invitedByVal.includes("@") ? invitedByVal : null;
  const invitedByEmail = isValidEmail(invitedByVal) ? normalizeEmail(invitedByVal) : null;
  try {
    await sendInviteEmail(targetEmail, "approved", { invitedByName, invitedByEmail });
  } catch (err) {
    console.error("[admin/access-requests] sendInviteEmail failed:", err?.message);
  }

  return NextResponse.json({ ok: true });
}
