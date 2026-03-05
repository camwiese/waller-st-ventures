import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient, createServiceClient } from "../../../../../lib/supabase/server";
import { isAdminEmail } from "../../../../../lib/admin";

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLocalDevBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (!isLocalDevBypass && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dealSlug = searchParams.get("dealSlug") || process.env.DEFAULT_DEAL_SLUG || "pst";

  const service = createServiceClient();
  const { data: deal, error: dealError } = await service.from("deals").select("id").eq("slug", dealSlug).single();
  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const { data: sections, error } = await service
    .from("content_sections")
    .select("id, slug, title, display_order, is_visible")
    .eq("deal_id", deal.id)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to load sections" }, { status: 500 });
  }

  return NextResponse.json({ sections: sections || [] });
}

function toSlug(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLocalDevBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (!isLocalDevBypass && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const actorId = user?.id || null;
  const actorEmail = user?.email || process.env.GP_EMAIL || "local-dev-admin";

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body?.action;
  const dealSlug = body?.dealSlug || process.env.DEFAULT_DEAL_SLUG || "pst";
  const service = createServiceClient();
  const { data: deal, error: dealError } = await service.from("deals").select("id").eq("slug", dealSlug).single();
  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (action === "add") {
    const title = String(body?.title || "").trim();
    const slug = toSlug(body?.slug || title);
    if (!title || !slug) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const { data: maxRow } = await service
      .from("content_sections")
      .select("display_order")
      .eq("deal_id", deal.id)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const displayOrder = (maxRow?.display_order || 0) + 1;

    const { data: section, error: sectionError } = await service
      .from("content_sections")
      .insert({
        deal_id: deal.id,
        slug,
        title,
        display_order: displayOrder,
        is_visible: true,
        updated_at: now,
      })
      .select("*")
      .single();
    if (sectionError) {
      return NextResponse.json({ error: sectionError.message || "Failed to create section" }, { status: 500 });
    }

    const defaultFaqGroups = [{
      id: crypto.randomUUID(),
      title: "General",
      order: 0,
      items: [],
    }];

    await service.from("content_blocks").insert([
      {
        deal_id: deal.id,
        section_id: section.id,
        key: "body",
        type: "rich_text",
        content: "",
        display_order: 0,
        updated_at: now,
      },
      {
        deal_id: deal.id,
        section_id: section.id,
        key: "faqs",
        type: "faq_list",
        content: defaultFaqGroups,
        display_order: 1,
        updated_at: now,
      },
      {
        deal_id: deal.id,
        section_id: section.id,
        key: "citations",
        type: "text_list",
        content: [],
        display_order: 2,
        updated_at: now,
      },
    ]);

    const { data: sectionWithBlocks, error: sectionWithBlocksError } = await service
      .from("content_sections")
      .select("id, slug, title, display_order, is_visible, content_blocks(id, key, type, content, display_order, updated_at)")
      .eq("id", section.id)
      .single();
    if (sectionWithBlocksError) {
      return NextResponse.json(
        { error: sectionWithBlocksError.message || "Failed to load section after create" },
        { status: 500 }
      );
    }

    await service.from("content_changelog").insert({
      deal_id: deal.id,
      block_id: null,
      section_slug: slug,
      section_title: title,
      action: "section_add",
      description: `Added section "${title}"`,
      previous_content: null,
      new_content: { slug, title },
      changed_by: actorId,
      changed_by_email: actorEmail,
      changed_at: now,
    });

    revalidateTag("content");
    return NextResponse.json({ ok: true, section: sectionWithBlocks });
  }

  if (action === "toggle_visibility") {
    const sectionId = body?.sectionId;
    const visible = !!body?.isVisible;
    if (!sectionId) return NextResponse.json({ error: "sectionId is required" }, { status: 400 });

    const { data: section, error: sectionError } = await service
      .from("content_sections")
      .update({ is_visible: visible, updated_at: now })
      .eq("id", sectionId)
      .eq("deal_id", deal.id)
      .select("id, slug, title, is_visible")
      .single();
    if (sectionError) {
      return NextResponse.json({ error: sectionError.message || "Failed to update visibility" }, { status: 500 });
    }

    await service.from("content_changelog").insert({
      deal_id: deal.id,
      block_id: null,
      section_slug: section.slug,
      section_title: section.title,
      action: visible ? "section_show" : "section_hide",
      description: `${visible ? "Showed" : "Hid"} section "${section.title}"`,
      previous_content: null,
      new_content: { is_visible: visible },
      changed_by: actorId,
      changed_by_email: actorEmail,
      changed_at: now,
    });

    revalidateTag("content");
    return NextResponse.json({ ok: true, section });
  }

  if (action === "rename") {
    const sectionId = body?.sectionId;
    const title = String(body?.title || "").trim();
    if (!sectionId || !title) {
      return NextResponse.json({ error: "sectionId and title are required" }, { status: 400 });
    }

    const { data: section, error: sectionError } = await service
      .from("content_sections")
      .update({ title, updated_at: now })
      .eq("id", sectionId)
      .eq("deal_id", deal.id)
      .select("id, slug, title")
      .single();
    if (sectionError) {
      return NextResponse.json({ error: sectionError.message || "Failed to rename section" }, { status: 500 });
    }

    await service.from("content_changelog").insert({
      deal_id: deal.id,
      block_id: null,
      section_slug: section.slug,
      section_title: section.title,
      action: "section_rename",
      description: `Renamed section to "${title}"`,
      previous_content: null,
      new_content: { title },
      changed_by: actorId,
      changed_by_email: actorEmail,
      changed_at: now,
    });

    revalidateTag("content");
    return NextResponse.json({ ok: true, section });
  }

  if (action === "reorder") {
    const orderedSectionIds = Array.isArray(body?.orderedSectionIds) ? body.orderedSectionIds : [];
    if (orderedSectionIds.length === 0) {
      return NextResponse.json({ error: "orderedSectionIds is required" }, { status: 400 });
    }

    for (let index = 0; index < orderedSectionIds.length; index += 1) {
      await service
        .from("content_sections")
        .update({ display_order: index, updated_at: now })
        .eq("id", orderedSectionIds[index])
        .eq("deal_id", deal.id);
    }

    await service.from("content_changelog").insert({
      deal_id: deal.id,
      block_id: null,
      section_slug: "system",
      section_title: "System",
      action: "section_reorder",
      description: "Reordered sections",
      previous_content: null,
      new_content: { orderedSectionIds },
      changed_by: actorId,
      changed_by_email: actorEmail,
      changed_at: now,
    });

    revalidateTag("content");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
