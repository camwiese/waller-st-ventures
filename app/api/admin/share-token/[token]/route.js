import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../../lib/adminAuth";

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const { error: authError } = await requireAdminAccess(supabase);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 403 });
  }

  const { token } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.is_active !== "boolean") {
    return NextResponse.json({ error: "is_active (boolean) required" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("share_tokens")
    .update({ is_active: body.is_active })
    .eq("token", token)
    .select("token, is_active")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json({ token: data.token, is_active: data.is_active });
}
