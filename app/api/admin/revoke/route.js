import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../lib/adminAuth";

export async function POST(request) {
  const supabase = await createClient();
  const auth = await requireAdminAccess(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = body;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const targetEmail = email.trim().toLowerCase();

  // Don't allow revoking own access
  if (targetEmail === auth.email) {
    return NextResponse.json({ error: "Cannot revoke your own access" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const errors = [];

  // 1. Add to revoked_emails (soft revoke — keep analytics for querying)
  const { error: revokedError } = await serviceClient
    .from("revoked_emails")
    .insert({ email: targetEmail });
  if (revokedError && revokedError.code !== "23505") errors.push(`revoked_emails: ${revokedError.message}`);

  // 2. Delete from allowed_emails (invite list)
  const { error: allowedError } = await serviceClient
    .from("allowed_emails")
    .delete()
    .eq("email", targetEmail);
  if (allowedError) errors.push(`allowed_emails: ${allowedError.message}`);

  // 3. Find and delete the Supabase auth user (invalidates all sessions/magic links)
  const { data: { users }, error: listError } = await serviceClient.auth.admin.listUsers();
  if (listError) {
    errors.push(`list users: ${listError.message}`);
  } else {
    const authUser = (users || []).find((u) => u.email?.toLowerCase() === targetEmail);
    if (authUser) {
      const { error: deleteError } = await serviceClient.auth.admin.deleteUser(authUser.id);
      if (deleteError) errors.push(`delete auth user: ${deleteError.message}`);
    }
  }

  if (errors.length > 0) {
    console.error(`[admin/revoke] Partial errors for ${targetEmail}:`, errors);
    return NextResponse.json({ ok: true, warnings: errors });
  }

  return NextResponse.json({ ok: true });
}
