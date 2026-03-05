const { createClient } = require("@supabase/supabase-js");

const DEAL_SLUG = process.env.DEFAULT_DEAL_SLUG || "pst";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Find the deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("slug", DEAL_SLUG)
    .single();

  if (dealError || !deal) {
    console.error("Deal not found:", dealError?.message || DEAL_SLUG);
    process.exit(1);
  }

  console.log(`Deal "${DEAL_SLUG}" found: ${deal.id}`);

  // Get all sections for this deal
  const { data: sections, error: sectionsError } = await supabase
    .from("content_sections")
    .select("id, slug, title")
    .eq("deal_id", deal.id);

  if (sectionsError) {
    console.error("Failed to load sections:", sectionsError.message);
    process.exit(1);
  }

  console.log(`Found ${sections.length} sections`);

  // Get all existing citations blocks so we can skip them
  const { data: existingBlocks, error: blocksError } = await supabase
    .from("content_blocks")
    .select("section_id")
    .eq("deal_id", deal.id)
    .eq("key", "citations");

  if (blocksError) {
    console.error("Failed to load existing blocks:", blocksError.message);
    process.exit(1);
  }

  const existingSectionIds = new Set(existingBlocks.map((b) => b.section_id));
  const now = new Date().toISOString();
  let added = 0;

  for (const section of sections) {
    if (existingSectionIds.has(section.id)) {
      console.log(`  SKIP "${section.title}" (${section.slug}) — already has citations block`);
      continue;
    }

    const { error: insertError } = await supabase.from("content_blocks").insert({
      deal_id: deal.id,
      section_id: section.id,
      key: "citations",
      type: "text_list",
      content: [],
      display_order: 99,
      updated_at: now,
    });

    if (insertError) {
      console.error(`  ERROR adding citations to "${section.title}":`, insertError.message);
    } else {
      console.log(`  ADDED citations block to "${section.title}" (${section.slug})`);
      added++;
    }
  }

  console.log(`\nDone. Added ${added} citations block(s), skipped ${sections.length - added}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
