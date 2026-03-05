import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { sendInviteEmail } from "../../../../lib/notifications";
import { isValidEmail, normalizeEmail } from "../../../../lib/email";

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const gpEmail = (process.env.GP_EMAIL || "").toLowerCase();
  if (!user || user.email?.toLowerCase() !== gpEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

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

  const targetEmail = normalizeEmail(email);

  try {
    await sendInviteEmail(targetEmail, "invite");
  } catch (err) {
    console.error("[admin/remind] sendInviteEmail failed:", err?.message);
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
