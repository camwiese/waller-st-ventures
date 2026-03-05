const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "..");
const DEAL_SLUG = process.env.DEFAULT_DEAL_SLUG || "pst";
const DEAL_TITLE = process.env.DEFAULT_DEAL_TITLE || "Puget Sound Therapeutics";

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toParagraphHtml(text) {
  return `<p>${escapeHtml(text)}</p>`;
}

function toRichTextFromParagraphs(paragraphs = []) {
  return paragraphs.map((text) => toParagraphHtml(text)).join("");
}

function toFaqAnswerHtml(answer) {
  if (!answer) return "";
  if (typeof answer === "string") return toParagraphHtml(answer);
  if (Array.isArray(answer.paragraphs)) {
    return toRichTextFromParagraphs(answer.paragraphs);
  }
  if (answer.intro && Array.isArray(answer.list)) {
    return `${toParagraphHtml(answer.intro)}<ul>${answer.list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }
  if (answer.intro && Array.isArray(answer.numberedList)) {
    return `${toParagraphHtml(answer.intro)}<ol>${answer.numberedList.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
  }
  return "";
}

function toSlug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildContentSeed() {
  const summary = readJson("content/summary.json");
  const memo = readJson("content/memo.json");
  const faq = readJson("content/faq.json");
  const science = readJson("content/science-primer.json");

  const gpBody = toRichTextFromParagraphs(summary.paragraphs || []);

  const memoBody = (memo.memo || [])
    .map((section) => {
      if (section.section === "TLDR") {
        return `<blockquote>${toRichTextFromParagraphs(section.paragraphs || [])}</blockquote>`;
      }
      if (!section.section || section.section === "Intro") {
        return toRichTextFromParagraphs(section.paragraphs || []);
      }
      return `<h2>${escapeHtml(section.section)}</h2>${toRichTextFromParagraphs(section.paragraphs || [])}`;
    })
    .join("");

  const faqGroups = (faq?.faq?.sections || []).map((group, groupIdx) => ({
    id: crypto.randomUUID(),
    title: group.section,
    order: groupIdx,
    items: (group.questions || []).map((item, itemIdx) => ({
      id: crypto.randomUUID(),
      question: item.question,
      answer: toFaqAnswerHtml(item.answer),
      order: itemIdx,
    })),
  }));

  const scienceBlocks = [];
  (science.sections || []).forEach((section, idx) => {
    if (!section.title) return;
    if (section.title === "Supporting References") return;
    const key = `section_${toSlug(section.title) || idx}`;
    scienceBlocks.push({
      key,
      type: "rich_text",
      content: toRichTextFromParagraphs(section.paragraphs || []),
    });
  });

  const scienceReferences = (science.sections || []).find((item) => item.title === "Supporting References");

  return [
    {
      slug: "opening-letter",
      title: "GP Letter",
      blocks: [
        { key: "body", type: "rich_text", content: gpBody },
        {
          key: "signature",
          type: "key_value_table",
          content: [
            { label: "name", value: summary?.signature?.name || "" },
            { label: "email", value: summary?.signature?.email || "" },
            { label: "phone", value: summary?.signature?.phone || "" },
          ],
        },
        {
          key: "contact",
          type: "key_value_table",
          content: [
            { label: "schedule_url", value: "" },
            { label: "phone_display", value: "425-503-6634" },
            { label: "phone_e164", value: "4255036634" },
            { label: "sidebar_supporting_text", value: "Seed Round Data Room" },
          ],
        },
      ],
    },
    {
      slug: "deal-memo",
      title: "Investment Memo",
      blocks: [
        { key: "summary", type: "rich_text", content: "" },
        { key: "body", type: "rich_text", content: memoBody },
      ],
    },
    {
      slug: "investment-terms",
      title: "Investment Terms",
      blocks: [
        {
          key: "summary",
          type: "rich_text",
          content: "<p>PST is raising a $5M seed round at $25M post-money via SAFE</p>",
        },
        {
          key: "round_details",
          type: "key_value_table",
          content: [
            { label: "Instrument", value: "Post-Money SAFE" },
            { label: "Valuation Cap", value: "$25,000,000", highlight: true },
            { label: "Round Size", value: "$5,000,000" },
            { label: "Check Size", value: "$50k minimum", highlight: true },
          ],
        },
        {
          key: "spv_terms",
          type: "text_list",
          content: [
            "Minimum check size is $50,000 unless otherwise agreed.",
            "Investment is made on the same seed round SAFE terms.",
            "Participation is subject to completed diligence and final subscription documents.",
          ],
        },
        {
          key: "faqs",
          type: "faq_list",
          content: [
            {
              id: crypto.randomUUID(),
              title: "Common Questions",
              order: 0,
              items: [
                {
                  id: crypto.randomUUID(),
                  question: "How should I think about the check size?",
                  answer: "<p>Minimum check size is $50,000. Final allocation still depends on round demand and confirmed commitments.</p>",
                  order: 0,
                },
                {
                  id: crypto.randomUUID(),
                  question: "When are funds expected to be called?",
                  answer: "<p>Capital timing follows final close logistics and subscription paperwork. You will receive explicit instructions before any transfer is required.</p>",
                  order: 1,
                },
                {
                  id: crypto.randomUUID(),
                  question: "What updates will I receive after investing?",
                  answer: "<p>Investors receive periodic updates with key milestones, financing progress, and material company developments.</p>",
                  order: 2,
                },
                {
                  id: crypto.randomUUID(),
                  question: "Where can I ask follow-up questions?",
                  answer: "<p>Use the chat/contact section to text or schedule time directly for diligence and process questions.</p>",
                  order: 3,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "faq",
      title: "FAQ",
      blocks: [
        { key: "body", type: "rich_text", content: "" },
        { key: "faqs", type: "faq_list", content: faqGroups },
      ],
    },
    {
      slug: "science-primer",
      title: "Science Primer",
      blocks: [
        ...scienceBlocks,
        { key: "reading_time", type: "rich_text", content: `<p>${escapeHtml(science.readingTime || "")}</p>` },
        { key: "references", type: "text_list", content: scienceReferences?.references || [] },
      ],
    },
    {
      slug: "interview",
      title: "CEO Interview",
      blocks: [
        {
          key: "body",
          type: "rich_text",
          content: "<p>In this conversation, Daniel and I discuss PST's origin story, the cryopreservation breakthrough, what the first-in-human trial will look like, and why they believe this therapy can reach millions of patients worldwide.</p>",
        },
      ],
    },
    {
      slug: "scenario-model",
      title: "Scenario Model",
      blocks: [
        {
          key: "series_a_description",
          type: "rich_text",
          content: "<p>PST plans to raise one additional round, approximately 12-18 months after the seed closes. This priced round will convert all outstanding SAFEs and ownership will be diluted by the Series A investors and employee option pool.</p>",
        },
        {
          key: "exit_description",
          type: "rich_text",
          content: "<p>Following the top line readout of their U.S. Phase I/II clinical trial, PST will pursue a strategic acquisition. The table below shows what your investment could return at different valuation assumptions.</p>",
        },
        {
          key: "disclosures",
          type: "rich_text",
          content:
            "<p><em>This scenario model is provided for illustrative purposes only.</em></p><p><em>Investment in early-stage companies involves a high degree of risk, including the potential for total loss of invested capital.</em></p><p><em>Nothing in this data room constitutes investment, legal, or tax advice.</em></p><p><em>This data room is provided for informational purposes to prospective investors who have been personally invited.</em></p>",
        },
        {
          key: "faqs",
          type: "faq_list",
          content: [
            {
              id: crypto.randomUUID(),
              title: "Additional Questions",
              order: 0,
              items: [
                {
                  id: crypto.randomUUID(),
                  question: "What if PST raises additional rounds beyond the Series A?",
                  answer: "<p>Additional rounds would introduce further dilution, but the SPV has pro-rata rights to maintain ownership.</p>",
                  order: 0,
                },
                {
                  id: crypto.randomUUID(),
                  question: "Are there tax benefits? (QSBS)",
                  answer: "<p>PST is structured as a Qualified Small Business. Please consult your tax advisor.</p>",
                  order: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "contact",
      title: "Chat with me",
      blocks: [
        {
          key: "contact",
          type: "key_value_table",
          content: [
            { label: "schedule_url", value: "" },
            { label: "phone_display", value: "425-503-6634" },
            { label: "phone_e164", value: "4255036634" },
          ],
        },
      ],
    },
  ];
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const sections = buildContentSeed();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .upsert({ slug: DEAL_SLUG, title: DEAL_TITLE }, { onConflict: "slug" })
    .select("id, slug")
    .single();
  if (dealError) throw dealError;

  const report = {
    deal: deal.slug,
    imported_sections: 0,
    imported_blocks: 0,
    warnings: [],
    generated_at: new Date().toISOString(),
  };

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const { data: upsertedSection, error: sectionError } = await supabase
      .from("content_sections")
      .upsert(
        {
          deal_id: deal.id,
          slug: section.slug,
          title: section.title,
          display_order: sectionIndex,
          is_visible: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "deal_id,slug" }
      )
      .select("id, slug, title")
      .single();
    if (sectionError) throw sectionError;
    report.imported_sections += 1;

    for (let blockIndex = 0; blockIndex < section.blocks.length; blockIndex += 1) {
      const block = section.blocks[blockIndex];
      const { error: blockError } = await supabase
        .from("content_blocks")
        .upsert(
          {
            deal_id: deal.id,
            section_id: upsertedSection.id,
            key: block.key,
            type: block.type,
            content: block.content,
            display_order: blockIndex,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "section_id,key" }
        );
      if (blockError) throw blockError;
      report.imported_blocks += 1;
    }
  }

  await supabase.from("content_changelog").insert({
    deal_id: deal.id,
    block_id: null,
    section_slug: "system",
    section_title: "System",
    action: "migration_import",
    description: `Imported existing dataroom content for ${DEAL_SLUG}`,
    previous_content: null,
    new_content: { imported_sections: report.imported_sections, imported_blocks: report.imported_blocks },
    changed_by: null,
    changed_by_email: "system-migration",
    changed_at: new Date().toISOString(),
  });

  const reportPath = path.join(ROOT, "cms-migration-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log("Migration complete:", report);
  console.log("Report written:", reportPath);
}

main().catch((err) => {
  console.error("CMS migration failed:", err);
  process.exit(1);
});

