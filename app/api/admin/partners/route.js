import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../lib/adminAuth";
import { isValidEmail, normalizeEmail } from "../../../../lib/email";

// GET - List all partner admins (any admin can view)
export async function GET() {
  const supabase = await createClient();
  const auth = await requireAdminAccess(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("partner_admins")
    .select("id, email, name, added_by, notify_on_own_invites, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/partners] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 });
  }

  return NextResponse.json({ partners: data || [] });
}

// POST - Add a partner admin (GP only)
export async function POST(request) {
  const supabase = await createClient();
  const auth = await requireAdminAccess(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!auth.isGP) {
    return NextResponse.json({ error: "Only the GP can add partner admins" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, name } = body;
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const targetEmail = normalizeEmail(email);
  const serviceClient = createServiceClient();

  // Insert into partner_admins
  const { data: partner, error: insertError } = await serviceClient
    .from("partner_admins")
    .insert({
      email: targetEmail,
      name: name?.trim() || null,
      added_by: auth.email,
    })
    .select("id, email, name, added_by, notify_on_own_invites, created_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "This email is already a partner admin" }, { status: 409 });
    }
    console.error("[admin/partners] Insert error:", insertError);
    return NextResponse.json({ error: "Failed to add partner" }, { status: 500 });
  }

  // Also add to allowed_emails so they can log in (idempotent)
  await serviceClient
    .from("allowed_emails")
    .upsert(
      { email: targetEmail, source: "admin_added" },
      { onConflict: "email", ignoreDuplicates: true }
    );

  return NextResponse.json({ ok: true, partner });
}

// DELETE - Remove a partner admin (GP only)
export async function DELETE(request) {
  const supabase = await createClient();
  const auth = await requireAdminAccess(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!auth.isGP) {
    return NextResponse.json({ error: "Only the GP can remove partner admins" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const targetEmail = normalizeEmail(email);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("partner_admins")
    .delete()
    .eq("email", targetEmail);

  if (error) {
    console.error("[admin/partners] Delete error:", error);
    return NextResponse.json({ error: "Failed to remove partner" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
