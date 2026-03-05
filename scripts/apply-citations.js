/**
 * apply-citations.js
 *
 * Applies text corrections, inserts superscript citation markers, and populates
 * citations blocks for the Investment Memo and Science Primer in Supabase.
 *
 * Usage: node scripts/apply-citations.js
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars
 */

const { createClient } = require("@supabase/supabase-js");

const DEAL_SLUG = process.env.DEFAULT_DEAL_SLUG || "pst";

// Helper: create a superscript citation anchor
function cite(n) {
  return `<sup><a href="#ref-${n}">${n}</a></sup>`;
}

// ─── MEMO CITATIONS (numbered 1–11 within the memo) ───────────────────────

const MEMO_CITATIONS = [
  "Gain P, Jullienne R, He Z, et al. Global Survey of Corneal Transplantation and Eye Banking. JAMA Ophthalmology. 2016;134(2):167–173. https://pubmed.ncbi.nlm.nih.gov/26633035/",
  "Numa K, Kinoshita S. Corneal Endothelial Cell Transplantation Comes to Fruition. Presentation at ESCRS 2025. Healio Ophthalmology News. September 18, 2025. https://www.healio.com/news/ophthalmology/20250918/after-years-of-research-corneal-endothelial-cell-transplantation-comes-to-fruition. See also: Mishan MA et al. Nature Biotechnology. 2025;43:1401–1404. https://www.nature.com/articles/s41587-025-02808-4",
  "Aurion Biotech. Aurion Biotech Receives Approval from Japan's PMDA for New Drug Application. Press release. March 28, 2023. https://aurionbiotech.com/aurion-biotech-receives-approval-from-japans-pmda-for-new-drug-application/",
  "Alcon. Alcon Acquires Majority Interest in Aurion Biotech, Inc. to Advance Innovative Cell Therapy for Corneal Endothelial Disease. Investor press release. March 26, 2025. https://investor.alcon.com/news-and-events/press-releases/news-details/2025/Alcon-Acquires-Majority-Interest-in-Aurion-Biotech-Inc--to-Advance-Innovative-Cell-Therapy-for-Corneal-Endothelial-Disease/default.aspx",
  "Internal estimate based on industry manufacturing cost modeling. Supporting documentation available upon request.",
  "Jiang Y, et al. Predictors of Health Care Disparities in Fuchs' Dystrophy Treatment Using the IRIS® Registry. Cornea. 2025;45(1):3–12. https://pmc.ncbi.nlm.nih.gov/articles/PMC12234801/",
  "EY. 2026 EY M&A Firepower Report. January 2026. https://www.ey.com/en_gl/firepower-report",
  "Regeneron acquired Oxular Ltd. for retinal disease delivery technology. December 2024. Fierce Biotech. https://www.fiercebiotech.com/biotech/regeneron-acquires-uk-biotech-adding-oxulars-eye-disease-delivery-tech-portfolio",
  "Eli Lilly. Lilly to Acquire Adverum Biotechnologies. Press release. October 2025. https://www.prnewswire.com/news-releases/lilly-to-acquire-adverum-biotechnologies-302593482.html. See also: EyeWire News. https://eyewire.news/news/eli-lilly-enters-ophthalmology-sector-with-acquisition-of-adverum-biotechnologies",
  "FDA. Increased Flexibility on Requirements for Cell and Gene Therapies. January 11, 2026. The ASCO Post. https://ascopost.com/news/january-2026/fda-increases-flexibility-on-requirements-for-cell-and-gene-therapies/",
  "Aurion Biotech. Aurion Biotech Achieves All Primary, Secondary, and Exploratory Endpoints in AURN001 Phase 1/2 CLARA Trial at 12 Months. BusinessWire. October 18, 2025. https://www.businesswire.com/news/home/20251018009011/en/Aurion-Biotech-Achieves-All-Primary-Secondary-and-Exploratory-Endpoints-in-AURN001-Phase-12-CLARA-Trial-at-12-Months",
];

function applyMemoCitations(html) {
  let h = html;

  // ── Problem & Breakthrough section ──

  // Citation 1: 13 million people (Gain et al.)
  h = h.replace(
    "corneal endothelial disease – a condition",
    `corneal endothelial disease${cite(1)} – a condition`
  );

  // Citation 1: 1:70 ratio (same source)
  h = h.replace(
    "every 70 people who need one; over 50%",
    `every 70 people who need one${cite(1)}; over 50%`
  );

  // Citation 1: 50% no access (same source)
  h = h.replace(
    "has no access at all, and the current system",
    `has no access at all${cite(1)}, and the current system`
  );

  // Citation 2: 1,000 doses (Numa/Kinoshita ESCRS 2025)
  h = h.replace(
    "produce over 1,000 doses of a therapy",
    `produce over 1,000 doses${cite(2)} of a therapy`
  );

  // Citation 4: Alcon acquisition (first occurrence — Problem section)
  h = h.replace(
    "at a billion-plus-dollar valuation. That acquisition",
    `at a billion-plus-dollar valuation${cite(4)}. That acquisition`
  );

  // Citation 5: $60,000 per dose (internal estimate)
  h = h.replace(
    "$60,000 per dose. The first generation",
    `$60,000 per dose${cite(5)}. The first generation`
  );

  // ── Market Opportunity section ──

  // Citation 6: 21% treatment rate (Jiang et al.)
  h = h.replace(
    "only ~21% actually receive surgery. This means",
    `only ~21% actually receive surgery${cite(6)}. This means`
  );

  // Citation 4: Alcon acquisition (second occurrence — Market section)
  h = h.replace(
    "at a billion-plus valuation, despite",
    `at a billion-plus valuation${cite(4)}, despite`
  );

  // ── Why Now section ──

  // Citation 7: $2 trillion M&A (EY report)
  h = h.replace(
    "over $2 trillion in M&amp;A capacity as",
    `over $2 trillion in M&amp;A capacity${cite(7)} as`
  );

  // Citation 8: J&J, Regeneron, Lilly acquiring (Regeneron/Oxular)
  h = h.replace(
    "actively acquiring in ophthalmology, with Lilly",
    `actively acquiring in ophthalmology${cite(8)}, with Lilly`
  );

  // Citation 9: Lilly first eye care acquisitions (Lilly/Adverum)
  h = h.replace(
    "eye care acquisitions in 2025. Meanwhile",
    `eye care acquisitions in 2025${cite(9)}. Meanwhile`
  );

  // Correction 7: "cell therapies" → "cell and gene therapies"
  // + Citation 10: FDA flexibility
  h = h.replace(
    "requirements for cell therapies in early 2026",
    `requirements for cell and gene therapies in early 2026${cite(10)}`
  );

  // ── Investment Thesis section ──

  // Correction 6: "US trial" → "US and Canadian trial"
  h = h.replace(
    "a 97-patient US trial that met every endpoint",
    "a 97-patient US and Canadian trial that met every endpoint"
  );

  // Citations 3, 11, 4: approval in Japan, CLARA trial, acquisition
  h = h.replace(
    "regulatory approval in Japan, a 97-patient US and Canadian trial that met every endpoint, and a billion-dollar acquisition behind it",
    `regulatory approval in Japan${cite(3)}, a 97-patient US and Canadian trial that met every endpoint${cite(11)}, and a billion-dollar acquisition${cite(4)} behind it`
  );

  return h;
}


// ─── SCIENCE PRIMER CITATIONS (numbered 1–15 within the science primer) ────

const SCIENCE_CITATIONS = [
  "Gain P, Jullienne R, He Z, et al. Global Survey of Corneal Transplantation and Eye Banking. JAMA Ophthalmology. 2016;134(2):167–173. https://pubmed.ncbi.nlm.nih.gov/26633035/",
  "Bourne WM. Biology of the corneal endothelium in health and disease. Eye. 2003;17:912–918. https://www.nature.com/articles/6700559. See also: Vaiciuliene R, et al. Medicina. 2022;58(1):21. https://pmc.ncbi.nlm.nih.gov/articles/PMC8713183/",
  "Aiello F, et al. Global Prevalence of Fuchs Endothelial Corneal Dystrophy (FECD) in Adult Population: A Systematic Review and Meta-Analysis. Journal of Ophthalmology. 2022;2022:3091695. https://pubmed.ncbi.nlm.nih.gov/35462618/",
  "Aurion Biotech market data. EyeWire News. https://eyewire.news/news/aurion-biotech-receives-approval-in-japan-for-first-allogeneic-cell-therapy-to-treat-corneal-endothelial-disease. See also: Lass JH, et al. Expert Review of Ophthalmology. 2012;7(2):113–124.",
  "Melles GRJ. How DMEK is Changing Corneal Surgery. Ophthalmology Times. https://www.ophthalmologytimes.com/view/how-dmek-changing-corneal-surgery. See also: Birbal RS, et al. Cornea. 2020;39(11):1421–1427.",
  "Anshu A, Price MO, Price FW. Risk of Corneal Transplant Rejection Significantly Reduced with DMEK. Ophthalmology. 2012;119(3):536–540. https://pubmed.ncbi.nlm.nih.gov/22218143/",
  "Dunker SL, et al. Long-term Outcomes of DMEK: 10-year Graft Survival and Clinical Outcomes. Scientific Reports. 2025. https://www.nature.com/articles/s41598-025-85138-4",
  "Numa K, Imai K, Ueno M, et al. Five-Year Follow-up of First Eleven Patients Undergoing Injection of Cultured Corneal Endothelial Cells for Corneal Endothelial Failure. Ophthalmology. 2021;128(4):504–514. https://pubmed.ncbi.nlm.nih.gov/32898516/",
  "Kinoshita S, Koizumi N, Ueno M, et al. Injection of Cultured Cells with a ROCK Inhibitor for Bullous Keratopathy. N Engl J Med. 2018;378(11):995–1003. https://pubmed.ncbi.nlm.nih.gov/29539291/",
  "Kinoshita S, et al. Long-term Corneal Rejuvenation after Transplantation of Cultured Human Corneal Endothelial Cells. Ophthalmology. 2025;132(10):1105–1113. https://pubmed.ncbi.nlm.nih.gov/40447112/",
  "Numa K, Kinoshita S. Corneal Endothelial Cell Transplantation Comes to Fruition. Presentation at ESCRS 2025. Healio. September 18, 2025. https://www.healio.com/news/ophthalmology/20250918/after-years-of-research-corneal-endothelial-cell-transplantation-comes-to-fruition. See also: Mishan MA et al. Nature Biotechnology. 2025;43:1401–1404. https://www.nature.com/articles/s41587-025-02808-4",
  "Aurion Biotech. Aurion Biotech Receives Approval from Japan's PMDA for New Drug Application. Press release. March 28, 2023. https://aurionbiotech.com/aurion-biotech-receives-approval-from-japans-pmda-for-new-drug-application/",
  "Aurion Biotech. Aurion Biotech Expands Leadership Team. Press release. September 2025. https://aurionbiotech.com/aurion-biotech-expands-leadership-team-promoting-andrew-torres-ph-d-to-chief-manufacturing-officer-and-sterling-chung-to-chief-regulatory-quality-officer/",
  "Review of Ophthalmology. Transplant Techniques in the Pipeline. 2024. https://www.reviewofophthalmology.com/article/transplant-techniques-in-the-pipeline. See also: EyeWorld. Corneal Cell Therapy: Current Status and Looking to the Future. 2024. https://www.eyeworld.org/2024/corneal-cell-therapy-current-status-and-looking-to-the-future/",
  "Internal estimate based on industry manufacturing cost modeling. Supporting documentation available upon request.",
];

// Updated science primer references list (replaces old 5-entry list)
const SCIENCE_REFERENCES = [
  'Gain P, et al. (2016). "Global Survey of Corneal Transplantation and Eye Banking." JAMA Ophthalmology, 134(2), 167–173. https://pubmed.ncbi.nlm.nih.gov/26633035/',
  'Bourne WM. (2003). "Biology of the corneal endothelium in health and disease." Eye, 17, 912–918. https://www.nature.com/articles/6700559',
  'Aiello F, et al. (2022). "Global Prevalence of Fuchs Endothelial Corneal Dystrophy." Journal of Ophthalmology, 2022:3091695. https://pubmed.ncbi.nlm.nih.gov/35462618/',
  'Kinoshita S, et al. (2018). "Injection of Cultured Cells with a ROCK Inhibitor for Bullous Keratopathy." NEJM, 378(11), 995–1003. https://pubmed.ncbi.nlm.nih.gov/29539291/',
  'Numa K, et al. (2021). "Five-Year Follow-up of First Eleven Patients." Ophthalmology, 128(4), 504–514. https://pubmed.ncbi.nlm.nih.gov/32898516/',
  'Kinoshita S, et al. (2025). "Long-term Corneal Rejuvenation after Transplantation of Cultured Human Corneal Endothelial Cells." Ophthalmology, 132(10), 1105–1113. https://pubmed.ncbi.nlm.nih.gov/40447112/',
  'Anshu A, et al. (2012). "Risk of Corneal Transplant Rejection Significantly Reduced with DMEK." Ophthalmology, 119(3), 536–540. https://pubmed.ncbi.nlm.nih.gov/22218143/',
  'Dunker SL, et al. (2025). "Long-term Outcomes of DMEK: 10-year Graft Survival." Scientific Reports. https://www.nature.com/articles/s41598-025-85138-4',
  'Melles GRJ. "How DMEK is Changing Corneal Surgery." Ophthalmology Times. https://www.ophthalmologytimes.com/view/how-dmek-changing-corneal-surgery',
  'Aurion Biotech. PMDA Approval Press Release. March 2023. https://aurionbiotech.com/aurion-biotech-receives-approval-from-japans-pmda-for-new-drug-application/',
  'Review of Ophthalmology. "Transplant Techniques in the Pipeline." 2024. https://www.reviewofophthalmology.com/article/transplant-techniques-in-the-pipeline',
  'Numa K, Kinoshita S. "Corneal Endothelial Cell Transplantation Comes to Fruition." ESCRS 2025. Healio. https://www.healio.com/news/ophthalmology/20250918/after-years-of-research-corneal-endothelial-cell-transplantation-comes-to-fruition',
  "PST Internal Data — available upon request.",
];


// ── Science Primer: The Big Picture ──

function applyScienceBigPicture(html) {
  let h = html;
  // Citation 1: 13 million waiting (Gain et al.)
  h = h.replace(
    "Over 13 million worldwide are waiting for corneal transplants, but",
    `Over 13 million worldwide are waiting for corneal transplants${cite(1)}, but`
  );
  return h;
}

// ── Science Primer: Corneas 101 ──

function applyScienceCorneas101(html) {
  let h = html;

  // Correction 1: cell density 3000-4000 → 2,500–3,000
  h = h.replace(
    "there are about 3000-4000 of these cells packed into every square millimeter",
    `there are about 2,500–3,000 of these cells packed into every square millimeter${cite(2)}`
  );

  // Correction 2: "do not regenerate" → "have very limited ability to regenerate"
  // + Citation 2 (same Bourne source)
  h = h.replace(
    "corneal endothelial cells do not regenerate",
    `corneal endothelial cells have very limited ability to regenerate${cite(2)}`
  );

  // Citation 3: 300 million Fuchs' prevalence (Aiello 2022)
  h = h.replace(
    "roughly 300 million adults worldwide have some form of Fuchs'",
    `roughly 300 million adults worldwide have some form of Fuchs'${cite(3)}`
  );

  // Correction 3: Remove "that's progressed to the point of needing intervention"
  // + Citation 4 (Aurion/Lass)
  h = h.replace(
    "an estimated 4% of adults over 40 have some form of corneal endothelial disease that's progressed to the point of needing intervention – roughly 16 million people.",
    `an estimated 4% of adults over 40 have some form of corneal endothelial disease${cite(4)} – roughly 16 million people in the US, Europe, and Japan alone.`
  );

  return h;
}

// ── Science Primer: Current Treatment ──

function applyScienceCurrentTreatment(html) {
  let h = html;

  // Citation 5: 75% achieve 20/25 (Melles/DMEK)
  h = h.replace(
    "75% of patients achieve 20/25 vision or better –",
    `75% of patients achieve 20/25 vision or better${cite(5)} –`
  );

  // Citation 5: lie on back for 3 days (same source)
  h = h.replace(
    "require patients to lie on their back for up to three days, and",
    `require patients to lie on their back for up to three days${cite(5)}, and`
  );

  // Citations 6 & 7: rejection and failure rates
  h = h.replace(
    "(~5% of grafts are rejected acutely, and 20% fail within 10 years)",
    `(~5% of grafts are rejected acutely${cite(6)}, and 20% fail within 10 years${cite(7)})`
  );

  // Citation 1: 1:70 ratio (Gain et al.)
  h = h.replace(
    "there is only one donor cornea for every 70 people who need one. Even",
    `there is only one donor cornea for every 70 people who need one${cite(1)}. Even`
  );

  // Citation 1: 53% lacking access (Gain et al.)
  h = h.replace(
    "an estimated 53% of the global population lacks access",
    `an estimated 53% of the global population lacks access${cite(1)}`
  );

  return h;
}

// ── Science Primer: The Breakthrough: Cell Therapy ──

function applyScienceBreakthrough(html) {
  let h = html;

  // Citation 8: Kinoshita 2013 enrollment (Numa 2021 five-year paper)
  h = h.replace(
    "began enrolling patients in the first clinical study demonstrating",
    `began enrolling patients in the first clinical study${cite(8)} demonstrating`
  );

  // Correction 4: Remove "with up to 2 years of follow-up"
  // + Citation 9: Kinoshita NEJM 2018
  h = h.replace(
    "Initial results from 11 patients with up to 2 years of follow-up, published in 2018, showed",
    `Initial results from 11 patients, published in 2018${cite(9)}, showed`
  );

  // Citation 10: 10-year follow-up (Kinoshita 2025)
  h = h.replace(
    "A comprehensive 10-year follow-up study",
    `A comprehensive 10-year follow-up study${cite(10)}`
  );

  // Citation 11: 1,000 doses (Numa/Kinoshita ESCRS)
  h = h.replace(
    "scientists can produce over 1,000 treatment doses",
    `scientists can produce over 1,000 treatment doses${cite(11)}`
  );

  // Citation 9: face-down 1-3 hours (Kinoshita 2018)
  h = h.replace(
    "Patients lie face-down for 1-3 hours",
    `Patients lie face-down for 1-3 hours${cite(9)}`
  );

  // Correction 5: soften 95% claim
  h = h.replace(
    "with 95% of vision recovery achieved by three months",
    "with substantial vision recovery by three months"
  );

  return h;
}

// ── Science Primer: The First Generation: Fresh Cells ──

function applyScienceFirstGen(html) {
  let h = html;

  // Citation 12: Aurion PMDA approval
  h = h.replace(
    "received regulatory approval in Japan in early 2023",
    `received regulatory approval in Japan in early 2023${cite(12)}`
  );

  // Citation 13: Aurion Phase III
  h = h.replace(
    "preparing for its Phase 3 clinical trial in the US",
    `preparing for its Phase 3 clinical trial in the US${cite(13)}`
  );

  // Citation 14: viability window (Review of Ophthalmology)
  h = h.replace(
    "a viability window of roughly 24-96 hours",
    `a viability window of roughly 24-96 hours${cite(14)}`
  );

  // Correction 8: check for typo "This is because tThat"
  if (h.includes("This is because tThat")) {
    h = h.replace("This is because tThat", "That");
  }

  // Citation 15: $60,000 cost (internal estimate)
  h = h.replace(
    "cost per dose for a fresh corneal cell therapy is $60,000",
    `cost per dose for a fresh corneal cell therapy is $60,000${cite(15)}`
  );

  return h;
}


// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    process.exit(1);
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);
  const { data: deal } = await sb.from("deals").select("id").eq("slug", DEAL_SLUG).single();
  if (!deal) { console.error("Deal not found"); process.exit(1); }
  console.log(`Deal: ${deal.id}\n`);

  // Helper to fetch a block
  async function getBlock(sectionSlug, key) {
    const { data, error } = await sb.from("content_blocks")
      .select("id, content, content_sections!inner(slug)")
      .eq("deal_id", deal.id)
      .eq("key", key)
      .eq("content_sections.slug", sectionSlug)
      .maybeSingle();
    if (error) { console.error(`Error fetching ${sectionSlug}/${key}:`, error.message); return null; }
    return data;
  }

  // Helper to update a block
  async function updateBlock(blockId, content, label) {
    const { error } = await sb.from("content_blocks")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", blockId);
    if (error) {
      console.error(`  ERROR updating ${label}:`, error.message);
    } else {
      console.log(`  ✓ Updated ${label}`);
    }
  }

  // ── 1. INVESTMENT MEMO ──────────────────────────────────────────────────

  console.log("── Investment Memo ──");

  const memoBody = await getBlock("deal-memo", "body");
  if (memoBody) {
    const updated = applyMemoCitations(memoBody.content);
    const changeCount = (updated !== memoBody.content)
      ? updated.split("<sup>").length - memoBody.content.split("<sup>").length
      : 0;
    console.log(`  Superscripts added to memo body: ${changeCount}`);
    await updateBlock(memoBody.id, updated, "memo body");
  }

  const memoCitations = await getBlock("deal-memo", "citations");
  if (memoCitations) {
    await updateBlock(memoCitations.id, MEMO_CITATIONS, "memo citations");
  }

  // ── 2. SCIENCE PRIMER ──────────────────────────────────────────────────

  console.log("\n── Science Primer ──");

  // The Big Picture
  const bigPicture = await getBlock("science-primer", "section_the-big-picture");
  if (bigPicture && typeof bigPicture.content === "string" && bigPicture.content.length > 0) {
    const updated = applyScienceBigPicture(bigPicture.content);
    await updateBlock(bigPicture.id, updated, "The Big Picture");
  }

  // Corneas 101
  const corneas = await getBlock("science-primer", "section_corneas-101");
  if (corneas && typeof corneas.content === "string" && corneas.content.length > 0) {
    const updated = applyScienceCorneas101(corneas.content);
    await updateBlock(corneas.id, updated, "Corneas 101");
  }

  // Current Treatment
  const treatment = await getBlock("science-primer", "section_current-treatment");
  if (treatment && typeof treatment.content === "string" && treatment.content.length > 0) {
    const updated = applyScienceCurrentTreatment(treatment.content);
    await updateBlock(treatment.id, updated, "Current Treatment");
  }

  // The Breakthrough: Cell Therapy
  const breakthrough = await getBlock("science-primer", "section_the-breakthrough-cell-therapy");
  if (breakthrough && typeof breakthrough.content === "string" && breakthrough.content.length > 0) {
    const updated = applyScienceBreakthrough(breakthrough.content);
    await updateBlock(breakthrough.id, updated, "The Breakthrough");
  }

  // The First Generation: Fresh Cells
  const firstGen = await getBlock("science-primer", "section_the-first-generation-fresh-cells");
  if (firstGen && typeof firstGen.content === "string" && firstGen.content.length > 0) {
    const updated = applyScienceFirstGen(firstGen.content);
    await updateBlock(firstGen.id, updated, "The First Generation");
  }

  // Science Primer citations block
  const sciCitations = await getBlock("science-primer", "citations");
  if (sciCitations) {
    await updateBlock(sciCitations.id, SCIENCE_CITATIONS, "science primer citations");
  }

  // Science Primer references block (update to comprehensive list)
  const sciReferences = await getBlock("science-primer", "references");
  if (sciReferences) {
    await updateBlock(sciReferences.id, SCIENCE_REFERENCES, "science primer references");
  }

  console.log("\nDone.");
}

main().catch((err) => { console.error(err); process.exit(1); });
