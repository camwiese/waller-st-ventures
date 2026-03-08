import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../lib/supabase/server";

const CURRENT_NDA_VERSION = "1.0";

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = user.email.toLowerCase();
  const serviceClient = createServiceClient();

  // Check if already agreed to current version
  const { data: existing } = await serviceClient
    .from("nda_agreements")
    .select("id")
    .eq("user_email", userEmail)
    .eq("nda_version", CURRENT_NDA_VERSION)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyAgreed: true });
  }

  // Record agreement with e-sign fields
  const body = await request.json().catch(() => ({}));
  const signerName = typeof body.signer_name === "string" ? body.signer_name.trim() : null;
  const ndaContent = typeof body.nda_content === "string" ? body.nda_content : null;

  if (!signerName) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : null;
  const userAgent = request.headers.get("user-agent") || null;

  const { error: insertError } = await serviceClient
    .from("nda_agreements")
    .insert({
      user_email: userEmail,
      signer_name: signerName,
      ip_address: ip,
      user_agent: userAgent,
      nda_version: CURRENT_NDA_VERSION,
      nda_content: ndaContent,
    });

  if (insertError) {
    console.error("[nda/agree] Insert error:", insertError.message);
    return NextResponse.json(
      { error: "Failed to record agreement" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: existing } = await serviceClient
    .from("nda_agreements")
    .select("id, agreed_at")
    .eq("user_email", user.email.toLowerCase())
    .eq("nda_version", CURRENT_NDA_VERSION)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    agreed: !!existing,
    agreedAt: existing?.agreed_at || null,
  });
}
