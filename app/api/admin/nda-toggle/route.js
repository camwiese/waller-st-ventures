import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../lib/adminAuth";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();
  const isLocalDevBypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (!isLocalDevBypass) {
    const auth = await requireAdminAccess(supabase);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { email, nda_required } = await request.json();
  if (!email || typeof nda_required !== "boolean") {
    return NextResponse.json({ error: "email and nda_required (boolean) are required" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("allowed_emails")
    .update({ nda_required })
    .eq("email", email.toLowerCase());

  if (error) {
    console.error("[nda-toggle] Update error:", error.message);
    return NextResponse.json({ error: "Failed to update NDA requirement" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: email.toLowerCase(), nda_required });
}
