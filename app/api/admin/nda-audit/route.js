import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../lib/adminAuth";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const isLocalDevBypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (!isLocalDevBypass) {
    const auth = await requireAdminAccess(supabase);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("nda_agreements")
    .select("id, user_email, signer_name, agreed_at, ip_address, user_agent, nda_version")
    .order("agreed_at", { ascending: false });

  if (error) {
    console.error("[nda-audit] Query error:", error.message);
    return NextResponse.json({ error: "Failed to load NDA audit log" }, { status: 500 });
  }

  return NextResponse.json({ agreements: data || [] });
}
