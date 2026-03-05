import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../../../lib/supabase/server";
import { isAdminEmail } from "../../../../../../lib/admin";

export async function GET(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLocalDevBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (!isLocalDevBypass && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  let sectionId = params?.id;
  if (!sectionId) {
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last !== "sections") sectionId = last;
  }
  if (!sectionId) {
    return NextResponse.json({ error: "Section id is required" }, { status: 400 });
  }

  const { searchParams } = url;
  const dealSlug = searchParams.get("dealSlug") || process.env.DEFAULT_DEAL_SLUG || "pst";

  const service = createServiceClient();
  const { data: deal, error: dealError } = await service.from("deals").select("id").eq("slug", dealSlug).single();
  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { data: section, error } = await service
    .from("content_sections")
    .select("id, slug, title, display_order, is_visible, content_blocks(id, key, type, content, display_order, updated_at)")
    .eq("id", sectionId)
    .eq("deal_id", deal.id)
    .single();

  if (error || !section) {
    return NextResponse.json({ error: error?.message || "Section not found" }, { status: 404 });
  }

  return NextResponse.json({ section });
}
