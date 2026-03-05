import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { sendInviteEmail } from "../../../../lib/notifications";
import { isAdminEmail } from "../../../../lib/admin";
import { isValidEmail, normalizeEmail } from "../../../../lib/email";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, notify = true } = body;
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const targetEmail = normalizeEmail(email);
  const shouldNotify = notify !== false;

  const serviceClient = createServiceClient();

  const { error: insertError } = await serviceClient.from("allowed_emails").insert({
    email: targetEmail,
    source: "admin_added",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "This email is already on the invite list" }, { status: 409 });
    }
    console.error("[admin/invite] Insert error:", insertError);
    return NextResponse.json({ error: "Failed to add email" }, { status: 500 });
  }

  if (shouldNotify) {
    sendInviteEmail(targetEmail, "invite").catch((err) =>
      console.error("[admin/invite] sendInviteEmail failed:", err?.message)
    );
  }

  return NextResponse.json({ ok: true, notified: shouldNotify });
}
