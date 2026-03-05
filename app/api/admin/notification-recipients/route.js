import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";

function requireAdmin(supabase) {
  const gpEmail = (process.env.GP_EMAIL || "").toLowerCase();
  return async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email?.toLowerCase() !== gpEmail) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
    }
    return { user };
  };
}

export async function GET() {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase)();
  if (auth.error) return auth.error;

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from("access_request_notification_emails")
    .select("id, email, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/notification-recipients] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch notification recipients" }, { status: 500 });
  }

  return NextResponse.json({ recipients: data || [] });
}

export async function POST(request) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase)();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const targetEmail = email.trim().toLowerCase();
  const serviceClient = await createServiceClient();

  const { data, error } = await serviceClient
    .from("access_request_notification_emails")
    .insert({ email: targetEmail })
    .select("id, email, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This email is already in the list" }, { status: 409 });
    }
    console.error("[admin/notification-recipients] POST error:", error);
    return NextResponse.json({ error: "Failed to add email" }, { status: 500 });
  }

  return NextResponse.json({ recipient: data });
}
