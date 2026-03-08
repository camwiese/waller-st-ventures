import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../../lib/adminAuth";

// PATCH - Update notification preferences for the current admin
export async function PATCH(request) {
  const supabase = await createClient();
  const auth = await requireAdminAccess(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // GP doesn't have a partner_admins row — they always get all notifications
  if (auth.isGP) {
    return NextResponse.json({ ok: true, message: "GP always receives all notifications" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { notifyOnOwnInvites } = body;
  if (typeof notifyOnOwnInvites !== "boolean") {
    return NextResponse.json({ error: "notifyOnOwnInvites must be a boolean" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
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
