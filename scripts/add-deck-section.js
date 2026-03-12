const { createClient } = require("@supabase/supabase-js");

const DEAL_SLUG = process.env.DEFAULT_DEAL_SLUG || "pst";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Find the deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("slug", DEAL_SLUG)
    .single();
  if (dealError) throw new Error(`Deal not found: ${dealError.message}`);

  // Check if deck section already exists
  const { data: existing } = await supabase
    .from("content_sections")
    .select("id")
    .eq("deal_id", deal.id)
    .eq("slug", "investor-deck")
    .maybeSingle();

  if (existing) {
    console.log("Investor Deck section already exists, skipping.");
    return;
  }

  // Find the memo section to get its display_order
  const { data: memoSection } = await supabase
    .from("content_sections")
    .select("display_order")
    .eq("deal_id", deal.id)
    .eq("slug", "deal-memo")
    .maybeSingle();

  const deckOrder = memoSection ? memoSection.display_order + 1 : 1;

  // Shift all sections after memo down by 1
  const { data: laterSections } = await supabase
    .from("content_sections")
    .select("id, display_order")
    .eq("deal_id", deal.id)
    .gte("display_order", deckOrder)
    .order("display_order", { ascending: false });

  if (laterSections && laterSections.length > 0) {
    for (const section of laterSections) {
      await supabase
        .from("content_sections")
        .update({ display_order: section.display_order + 1 })
        .eq("id", section.id);
    }
  }

  // Insert the deck section
  const { error: insertError } = await supabase
    .from("content_sections")
    .insert({
      deal_id: deal.id,
      slug: "investor-deck",
      title: "Investor Deck",
      display_order: deckOrder,
      is_visible: true,
      updated_at: new Date().toISOString(),
    });

  if (insertError) throw new Error(`Failed to insert deck section: ${insertError.message}`);

  // Log to changelog
  await supabase.from("content_changelog").insert({
    deal_id: deal.id,
    block_id: null,
    section_slug: "investor-deck",
    section_title: "Investor Deck",
    action: "section_add",
    description: "Added Investor Deck section",
    previous_content: null,
    new_content: { slug: "investor-deck", title: "Investor Deck" },
    changed_by: "script",
  });

  console.log("Investor Deck section added successfully (display_order: %d).", deckOrder);
}

main().catch((err) => {
  console.error("Add deck section failed:", err);
  process.exit(1);
});
