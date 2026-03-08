import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../../lib/adminAuth";
import { isValidEmail, normalizeEmail } from "../../../../../lib/email";

// PATCH - Update settings for the current admin or (GP only) for a specific partner
export async function PATCH(request) {
  const supabase = await createClient();
  const auth = await requireAdminAccess(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // GP toggling a specific partner's can_edit_content
  if (body.partnerEmail && auth.isGP) {
    const targetEmail = normalizeEmail(body.partnerEmail);
    if (!isValidEmail(targetEmail)) {
      return NextResponse.json({ error: "Valid partner email is required" }, { status: 400 });
    }

    const updates = {};
    if (typeof body.canEditContent === "boolean") updates.can_edit_content = body.canEditContent;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error } = await serviceClient
      .from("partner_admins")
      .update(updates)
      .eq("email", targetEmail);

    if (error) {
      console.error("[admin/partners/settings] Update partner error:", error);
      return NextResponse.json({ error: "Failed to update partner settings" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  // Partner updating their own notification preference
  if (auth.isGP) {
    return NextResponse.json({ ok: true, message: "GP always receives all notifications" });
  }

  const { notifyOnOwnInvites } = body;
  if (typeof notifyOnOwnInvites !== "boolean") {
    return NextResponse.json({ error: "notifyOnOwnInvites must be a boolean" }, { status: 400 });
  }

  const { error } = await serviceClient
    .from("partner_admins")
    .update({ notify_on_own_invites: notifyOnOwnInvites })
    .eq("email", auth.email);

  if (error) {
    console.error("[admin/partners/settings] Update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
