const { createClient } = require("@supabase/supabase-js");

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["1", "true", "yes", "y", "on"].includes(String(value).toLowerCase());
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function envOrFallback(primaryName, fallbackName) {
  return process.env[primaryName] || process.env[fallbackName] || null;
}

async function getDealBySlug(supabase, slug) {
  const { data, error } = await supabase.from("deals").select("id, slug, title").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getSectionsWithBlocks(supabase, dealId) {
  const { data, error } = await supabase
    .from("content_sections")
    .select("id, slug, title, display_order, is_visible, content_blocks(id, section_id, key, type, content, display_order)")
    .eq("deal_id", dealId)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

function collectSourceFaqBlocks(sourceSections, { sectionSlug, blockKey, copyAllFaqBlocks }) {
  const matches = [];
  for (const section of sourceSections) {
    const blocks = Array.isArray(section.content_blocks) ? section.content_blocks : [];
    for (const block of blocks) {
      if (block.type !== "faq_list") continue;
      if (!copyAllFaqBlocks) {
        if (section.slug !== sectionSlug) continue;
        if (block.key !== blockKey) continue;
      }
      matches.push({ section, block });
    }
  }
  return matches;
}

async function createTargetSectionIfMissing(supabase, targetDealId, sourceSection, dryRun) {
  if (dryRun) {
    return {
      id: "__dry_run_section__",
      slug: sourceSection.slug,
      title: sourceSection.title,
      display_order: sourceSection.display_order ?? 0,
      is_visible: sourceSection.is_visible !== false,
      content_blocks: [],
      dryRunCreated: true,
    };
  }

  const now = new Date().toISOString();
  const payload = {
    deal_id: targetDealId,
    slug: sourceSection.slug,
    title: sourceSection.title,
    display_order: sourceSection.display_order ?? 0,
    is_visible: sourceSection.is_visible !== false,
    updated_at: now,
  };
  const { data, error } = await supabase.from("content_sections").insert(payload).select("id, slug, title, display_order, is_visible").single();
  if (error) throw error;
  return { ...data, content_blocks: [] };
}

async function upsertTargetFaqBlock(supabase, targetDealId, targetSection, sourceBlock, dryRun) {
  const now = new Date().toISOString();
  const existingBlocks = Array.isArray(targetSection.content_blocks) ? targetSection.content_blocks : [];
  const existing = existingBlocks.find((block) => block.key === sourceBlock.key) || null;

  if (existing && existing.type !== "faq_list") {
    throw new Error(
      `Target block type mismatch for section "${targetSection.slug}" key "${sourceBlock.key}". Expected "faq_list", got "${existing.type}".`
    );
  }

  if (dryRun) {
    return {
      action: existing ? "updated" : "created",
      blockId: existing?.id || "__dry_run_block__",
      key: sourceBlock.key,
    };
  }

  const payload = {
    deal_id: targetDealId,
    section_id: targetSection.id,
    key: sourceBlock.key,
    type: "faq_list",
    content: sourceBlock.content,
    display_order: sourceBlock.display_order ?? 0,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("content_blocks")
    .upsert(payload, { onConflict: "section_id,key" })
    .select("id, key")
    .single();
  if (error) throw error;

  return {
    action: existing ? "updated" : "created",
    blockId: data.id,
    key: data.key,
  };
}

async function writeChangelog(supabase, targetDealId, sourceDealSlug, targetDealSlug, copiedCount) {
  const now = new Date().toISOString();
  const description = `Replicated FAQ content from ${sourceDealSlug} to ${targetDealSlug}`;
  const { error } = await supabase.from("content_changelog").insert({
    deal_id: targetDealId,
    block_id: null,
    section_slug: "system",
    section_title: "System",
    action: "faq_replication",
    description,
    previous_content: null,
    new_content: { source_deal_slug: sourceDealSlug, target_deal_slug: targetDealSlug, copied_blocks: copiedCount },
    changed_by: null,
    changed_by_email: "system-script",
    changed_at: now,
  });
  if (error) throw error;
}

async function main() {
  const sourceSupabaseUrl = envOrFallback("SOURCE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const sourceServiceRoleKey = envOrFallback("SOURCE_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  const targetSupabaseUrl = envOrFallback("TARGET_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const targetServiceRoleKey = envOrFallback("TARGET_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  const sourceDealSlug = requiredEnv("SOURCE_DEAL_SLUG");
  const targetDealSlug = requiredEnv("TARGET_DEAL_SLUG");

  if (!sourceSupabaseUrl) {
    throw new Error(
      "Missing source Supabase URL. Set SOURCE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL for single-project mode)."
    );
  }
  if (!sourceServiceRoleKey) {
    throw new Error(
      "Missing source Supabase service role key. Set SOURCE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY for single-project mode)."
    );
  }
  if (!targetSupabaseUrl) {
    throw new Error(
      "Missing target Supabase URL. Set TARGET_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL for single-project mode)."
    );
  }
  if (!targetServiceRoleKey) {
    throw new Error(
      "Missing target Supabase service role key. Set TARGET_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY for single-project mode)."
    );
  }

  const isSameProject = sourceSupabaseUrl === targetSupabaseUrl;
  if (isSameProject && sourceDealSlug === targetDealSlug) {
    throw new Error("SOURCE_DEAL_SLUG and TARGET_DEAL_SLUG must be different.");
  }

  const sectionSlug = process.env.SECTION_SLUG || "faq";
  const blockKey = process.env.BLOCK_KEY || "faqs";
  const copyAllFaqBlocks = parseBoolean(process.env.COPY_ALL_FAQ_BLOCKS, false);
  const createMissingStructure = parseBoolean(process.env.CREATE_MISSING_TARGET_STRUCTURE, false);
  const dryRun = parseBoolean(process.env.DRY_RUN, false);

  const sourceSupabase = createClient(sourceSupabaseUrl, sourceServiceRoleKey, { auth: { persistSession: false } });
  const targetSupabase = createClient(targetSupabaseUrl, targetServiceRoleKey, { auth: { persistSession: false } });

  const sourceDeal = await getDealBySlug(sourceSupabase, sourceDealSlug);
  if (!sourceDeal) throw new Error(`Source deal not found: ${sourceDealSlug}`);
  const targetDeal = await getDealBySlug(targetSupabase, targetDealSlug);
  if (!targetDeal) throw new Error(`Target deal not found: ${targetDealSlug}`);

  const sourceSections = await getSectionsWithBlocks(sourceSupabase, sourceDeal.id);
  const targetSections = await getSectionsWithBlocks(targetSupabase, targetDeal.id);

  const sourceFaqBlocks = collectSourceFaqBlocks(sourceSections, {
    sectionSlug,
    blockKey,
    copyAllFaqBlocks,
  });

  if (sourceFaqBlocks.length === 0) {
    throw new Error(
      copyAllFaqBlocks
        ? `No faq_list blocks found in source deal: ${sourceDealSlug}`
        : `No source faq_list block found for section "${sectionSlug}" key "${blockKey}" in deal "${sourceDealSlug}"`
    );
  }

  const targetSectionBySlug = new Map(targetSections.map((section) => [section.slug, section]));
  let createdSections = 0;
  let createdBlocks = 0;
  let updatedBlocks = 0;
  const details = [];

  for (const entry of sourceFaqBlocks) {
    const sourceSection = entry.section;
    const sourceBlock = entry.block;
    let targetSection = targetSectionBySlug.get(sourceSection.slug) || null;

    if (!targetSection) {
      if (!createMissingStructure) {
        throw new Error(
          `Target deal is missing section "${sourceSection.slug}". Set CREATE_MISSING_TARGET_STRUCTURE=true to create missing sections/blocks.`
        );
      }
      targetSection = await createTargetSectionIfMissing(targetSupabase, targetDeal.id, sourceSection, dryRun);
      targetSectionBySlug.set(sourceSection.slug, targetSection);
      createdSections += 1;
    }

    const result = await upsertTargetFaqBlock(targetSupabase, targetDeal.id, targetSection, sourceBlock, dryRun);
    if (result.action === "created") createdBlocks += 1;
    if (result.action === "updated") updatedBlocks += 1;

    if (!dryRun) {
      const blocks = Array.isArray(targetSection.content_blocks) ? targetSection.content_blocks : [];
      const existingIdx = blocks.findIndex((item) => item.key === sourceBlock.key);
      const savedBlock = { id: result.blockId, key: sourceBlock.key, type: "faq_list" };
      if (existingIdx >= 0) {
        blocks[existingIdx] = savedBlock;
      } else {
        blocks.push(savedBlock);
      }
      targetSection.content_blocks = blocks;
    }

    details.push({
      section_slug: sourceSection.slug,
      block_key: sourceBlock.key,
      action: result.action,
    });
  }

  const copiedCount = createdBlocks + updatedBlocks;
  if (!dryRun && copiedCount > 0) {
    await writeChangelog(targetSupabase, targetDeal.id, sourceDealSlug, targetDealSlug, copiedCount);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dry_run: dryRun,
        source_deal_slug: sourceDealSlug,
        target_deal_slug: targetDealSlug,
        source_project_url: sourceSupabaseUrl,
        target_project_url: targetSupabaseUrl,
        selection: copyAllFaqBlocks ? "all faq_list blocks" : `section=${sectionSlug}, key=${blockKey}`,
        created_sections: createdSections,
        created_blocks: createdBlocks,
        updated_blocks: updatedBlocks,
        total_copied: copiedCount,
        details,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FAQ replication failed:", err);
  process.exit(1);
});
