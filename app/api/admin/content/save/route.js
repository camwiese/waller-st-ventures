import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient, createServiceClient } from "../../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../../lib/adminAuth";
import { sanitizeFaqGroups, sanitizeRichText } from "../../../../../lib/cms/sanitize";
import { diffFaqGroups } from "../../../../../lib/cms/faq-diff";

function validateFaqGroups(groups) {
  if (!Array.isArray(groups)) return "FAQ groups must be an array";
  const groupIds = new Set();
  const itemIds = new Set();
  for (const group of groups) {
    if (!group.title || !group.title.trim()) return "FAQ group title is required";
    if (!group.id) return "FAQ group id is required";
    if (groupIds.has(group.id)) return "FAQ group ids must be unique";
    groupIds.add(group.id);
    const items = Array.isArray(group.items) ? group.items : [];
    for (const item of items) {
      if (!item.question || !item.question.trim()) return "FAQ question is required";
      if (!item.id) return "FAQ item id is required";
      if (itemIds.has(item.id)) return "FAQ item ids must be unique";
      itemIds.add(item.id);
    }
  }
  return null;
}

function normalizeBlockContent(blockType, value) {
  if (blockType === "rich_text") return sanitizeRichText(value);
  if (blockType === "faq_list") return sanitizeFaqGroups(value);
  return value;
}

export async function POST(request) {
  const supabase = await createClient();
  const isLocalDevBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  let actorId = null;
  let actorEmail = process.env.GP_EMAIL || "local-dev-admin";
  if (!isLocalDevBypass) {
    const auth = await requireAdminAccess(supabase);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!auth.isGP && !auth.partner?.can_edit_content) {
      return NextResponse.json({ error: "You don't have permission to edit content" }, { status: 403 });
    }
    actorId = auth.user?.id || null;
    actorEmail = auth.email;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const changes = Array.isArray(body?.changes) ? body.changes : [];
  if (changes.length === 0) {
    return NextResponse.json({ ok: true, saved_at: new Date().toISOString(), changed: 0 });
  }

  const dealSlug = body?.dealSlug || process.env.DEFAULT_DEAL_SLUG || "pst";
  const service = createServiceClient();
  const { data: deal, error: dealError } = await service.from("deals").select("id").eq("slug", dealSlug).single();
  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  let writeCount = 0;

  for (const change of changes) {
    if (!change?.block_id) continue;
    const { data: existingBlock, error: blockReadError } = await service
      .from("content_blocks")
      .select("id, deal_id, section_id, key, type, content")
      .eq("id", change.block_id)
      .single();
    if (blockReadError || !existingBlock || existingBlock.deal_id !== deal.id) {
      return NextResponse.json({ error: "Invalid block in changes" }, { status: 400 });
    }

    const normalizedContent = normalizeBlockContent(existingBlock.type, change.new_content);
    if (existingBlock.type === "faq_list") {
      const validationError = validateFaqGroups(normalizedContent);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const { data: section } = await service
      .from("content_sections")
      .select("slug, title")
      .eq("id", existingBlock.section_id)
      .maybeSingle();

    const { error: updateError } = await service
      .from("content_blocks")
      .update({ content: normalizedContent, updated_at: now })
      .eq("id", existingBlock.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message || "Failed to update content block" }, { status: 500 });
    }

    const baseEntry = {
      deal_id: deal.id,
      block_id: existingBlock.id,
      section_slug: section?.slug || change.section_slug || "unknown",
      section_title: section?.title || change.section_title || "Unknown",
      changed_by: actorId,
      changed_by_email: actorEmail,
      changed_at: now,
    };

    if (existingBlock.type === "faq_list") {
      const diffEntries = diffFaqGroups(existingBlock.content, normalizedContent);
      if (diffEntries.length === 0) {
        await service.from("content_changelog").insert({
          ...baseEntry,
          action: "faq_edit",
          description: `Updated FAQ content in ${baseEntry.section_title}`,
          previous_content: existingBlock.content,
          new_content: normalizedContent,
        });
      } else {
        const payload = diffEntries.map((entry) => ({
          ...baseEntry,
          action: entry.action,
          description: entry.description,
          previous_content: existingBlock.content,
          new_content: normalizedContent,
        }));
        await service.from("content_changelog").insert(payload);
      }
    } else {
      await service.from("content_changelog").insert({
        ...baseEntry,
        action: change.action || "edit",
        description: change.description || `Edited ${baseEntry.section_title}`,
        previous_content: existingBlock.content,
        new_content: normalizedContent,
      });
    }

    writeCount += 1;
  }

  revalidateTag("content");
  return NextResponse.json({ ok: true, saved_at: now, changed: writeCount });
}

