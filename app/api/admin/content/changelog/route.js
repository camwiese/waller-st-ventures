import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../../lib/adminAuth";

export async function GET(request) {
  const supabase = await createClient();
  const isLocalDevBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (!isLocalDevBypass) {
    const auth = await requireAdminAccess(supabase);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!auth.isGP && !auth.partner?.can_edit_content) {
      return NextResponse.json({ error: "You don't have permission to view changelog" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10", 10);
  const section = searchParams.get("section");
  const action = searchParams.get("action");
  const dealSlug = searchParams.get("dealSlug") || process.env.DEFAULT_DEAL_SLUG || "pst";

  const service = createServiceClient();
  const { data: deal, error: dealError } = await service.from("deals").select("id").eq("slug", dealSlug).single();
  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  let query = service
    .from("content_changelog")
    .select("*")
    .eq("deal_id", deal.id)
    .order("changed_at", { ascending: false })
    .range((page - 1) * pageSize, (page * pageSize) - 1);

  if (section) query = query.eq("section_slug", section);
  if (action) query = query.eq("action", action);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message || "Failed to load changelog" }, { status: 500 });
  }

  return NextResponse.json({ entries: data || [], page, pageSize });
}

