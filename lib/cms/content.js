import { unstable_cache } from "next/cache";
import { createServiceClient } from "../supabase/server";

const DEFAULT_DEAL_SLUG = process.env.DEFAULT_DEAL_SLUG || "pst";

const TAB_TO_SECTION_SLUG = {
  overview: "opening-letter",
  memo: "deal-memo",
  terms: "investment-terms",
  faq: "faq",
  science: "science-primer",
  model: "scenario-model",
  interview: "interview",
  chat: "contact",
};

const SECTION_SLUG_TO_TAB = Object.fromEntries(
  Object.entries(TAB_TO_SECTION_SLUG).map(([tab, slug]) => [slug, tab])
);

const getDealBySlugCached = unstable_cache(
  async (slug) => {
    const supabase = createServiceClient();
    const { data } = await supabase.from("deals").select("id, slug, title").eq("slug", slug).maybeSingle();
    return data || null;
  },
  ["cms-deal-by-slug"],
  { tags: ["content"], revalidate: 3600 }
);

const getAllSectionsCached = unstable_cache(
  async (dealId, includeHidden) => {
    const supabase = createServiceClient();
    let query = supabase
      .from("content_sections")
      .select("id, slug, title, display_order, is_visible, content_blocks(id, key, type, content, display_order, updated_at)")
      .eq("deal_id", dealId)
      .order("display_order", { ascending: true });
    if (!includeHidden) {
      query = query.eq("is_visible", true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  ["cms-sections-with-blocks"],
  { tags: ["content"], revalidate: 3600 }
);

export async function getDealBySlug(dealSlug = DEFAULT_DEAL_SLUG) {
  return getDealBySlugCached(dealSlug);
}

export async function getAllSectionsWithBlocks({ dealSlug = DEFAULT_DEAL_SLUG, includeHidden = false } = {}) {
  const deal = await getDealBySlug(dealSlug);
  if (!deal) return [];
  return getAllSectionsCached(deal.id, includeHidden);
}

export function blockArrayToMap(section) {
  const blocks = Array.isArray(section?.content_blocks) ? section.content_blocks : [];
  return blocks
    .slice()
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .reduce((acc, block) => {
      acc[block.key] = block.content;
      return acc;
    }, {});
}

export async function getCmsContentByTabs({ dealSlug = DEFAULT_DEAL_SLUG, includeHidden = false } = {}) {
  const sections = await getAllSectionsWithBlocks({ dealSlug, includeHidden });
  const orderedSections = sections.map((section) => {
    const knownTabId = SECTION_SLUG_TO_TAB[section.slug] || null;
    const id = knownTabId || section.slug;
    return {
      id,
      knownTabId,
      section,
      blocks: blockArrayToMap(section),
    };
  });

  const byId = orderedSections.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  return {
    orderedSections,
    byId,
  };
}

export async function getCmsSectionBySlug(sectionSlug, { dealSlug = DEFAULT_DEAL_SLUG, includeHidden = false } = {}) {
  const sections = await getAllSectionsWithBlocks({ dealSlug, includeHidden });
  const section = sections.find((item) => item.slug === sectionSlug) || null;
  return section ? { section, blocks: blockArrayToMap(section) } : null;
}

