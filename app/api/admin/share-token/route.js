import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../lib/adminAuth";
import { ADMIN_SHARE_TOKEN_COLUMNS } from "../../../../lib/shareTokens";
import { nanoid } from "nanoid";

export async function POST(request) {
  const supabase = await createClient();
  const { error: authError, email: adminEmail } = await requireAdminAccess(supabase);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, contentType } = body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!["podcast", "deck"].includes(contentType)) {
    return NextResponse.json({ error: "contentType must be 'podcast' or 'deck'" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const serviceClient = createServiceClient();

  // Check for existing active token for this email + content type
  const { data: existing } = await serviceClient
    .from("share_tokens")
    .select("token")
    .eq("email", normalizedEmail)
    .eq("content_type", contentType)
    .eq("deal_slug", "pst")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (existing) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wallerstreetventures.com";
    return NextResponse.json({
      token: existing.token,
      url: `${baseUrl}/share/${existing.token}`,
      isExisting: true,
    });
  }

  // Generate new token
  const token = nanoid(21);
  const { error: insertError } = await serviceClient.from("share_tokens").insert({
    token,
    email: normalizedEmail,
    content_type: contentType,
    deal_slug: "pst",
    created_by: adminEmail,
  });

  if (insertError) {
    console.error("[share-token] Insert error:", insertError.message);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wallerstreetventures.com";
  return NextResponse.json({
    token,
    url: `${baseUrl}/share/${token}`,
    isExisting: false,
  });
}

export async function GET(request) {
  const supabase = await createClient();
  const { error: authError } = await requireAdminAccess(supabase);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 403 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("share_tokens")
    .select(ADMIN_SHARE_TOKEN_COLUMNS)
    .eq("deal_slug", "pst")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ shareTokens: data || [] });
}
