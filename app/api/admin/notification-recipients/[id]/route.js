import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../../lib/supabase/server";

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

export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase)();
  if (auth.error) return auth.error;

  const { id } = (await params) || {};
  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();
  const { error } = await serviceClient
    .from("access_request_notification_emails")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[admin/notification-recipients] DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
