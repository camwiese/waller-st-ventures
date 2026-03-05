/**
 * apply-faq-citations.js
 *
 * Applies text corrections, inserts superscript citation markers, and populates
 * the citations block for the FAQ section in Supabase.
 *
 * Usage: node scripts/apply-faq-citations.js
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars
 */

const { createClient } = require("@supabase/supabase-js");

const DEAL_SLUG = process.env.DEFAULT_DEAL_SLUG || "pst";

function cite(n) {
  return `<sup><a href="#ref-${n}">${n}</a></sup>`;
}

// ─── FAQ CITATIONS (numbered 1–30) ─────────────────────────────────────────

const FAQ_CITATIONS = [
  "Jiang Y, et al. Predictors of Health Care Disparities in Fuchs Dystrophy Treatment Using the IRIS Registry. Cornea. 2026;45(1):3–12. https://pmc.ncbi.nlm.nih.gov/articles/PMC12234801/",
  "NHS Blood and Transplant / NHS Organ Donation. New NHS and Specsavers Partnership. April 2024. https://www.organdonation.nhs.uk/get-involved/news/new-nhs-and-specsavers-partnership/",
  "Moriyama AS, et al. Corneal transplantation in Brazil. Cornea. 2022. See also: ABTO annual reports. https://pmc.ncbi.nlm.nih.gov/articles/PMC12914147/",
  "Gain P, et al. Global Survey of Corneal Transplantation and Eye Banking. JAMA Ophthalmology. 2016;134(2):167–173. https://pubmed.ncbi.nlm.nih.gov/26633035/",
  "Dhaliwal DK, et al. Cost Burden of Endothelial Keratoplasty in Fuchs Endothelial Dystrophy. Clinical Ophthalmology. 2022;16:1055–1067. https://pmc.ncbi.nlm.nih.gov/articles/PMC8995174/",
  "Jeyalakshmi B, et al. Rebubbling After DMEK and DSAEK. Survey of Ophthalmology. 2017;62(5):649–680. See also: Ołdak M, et al. Acta Ophthalmologica. 2021. https://pmc.ncbi.nlm.nih.gov/articles/PMC7936678/",
  "Srikumaran D, et al. Trends in Early Graft Failure Leading to Regrafting After Endothelial Keratoplasty in the United States. Cornea. 2022;41(8):965–972. https://pubmed.ncbi.nlm.nih.gov/34369391/",
  "Schaub F, et al. Ten-Year Outcomes After DMEK, DSAEK, and PK. Scientific Reports. 2025;15:1883. https://www.nature.com/articles/s41598-025-85138-4",
  "Kinoshita S, et al. Injection of Cultured Cells with a ROCK Inhibitor for Bullous Keratopathy. N Engl J Med. 2018;378(11):995–1003. https://pubmed.ncbi.nlm.nih.gov/29539291/",
  "Kinoshita S, et al. Long-term Corneal Rejuvenation after Transplantation of Cultured Human Corneal Endothelial Cells. Ophthalmology. 2025;132(10):1105–1113. https://pubmed.ncbi.nlm.nih.gov/40447112/",
  "Aurion Biotech. Aurion Biotech Receives Approval from Japan's PMDA for New Drug Application. Press release. March 28, 2023. https://aurionbiotech.com/aurion-biotech-receives-approval-from-japans-pmda-for-new-drug-application/",
  "Aurion Biotech. Aurion Biotech Achieves All Primary, Secondary, and Exploratory Endpoints in AURN001 Phase 1/2 CLARA Trial at 12 Months. BusinessWire. October 18, 2025. https://www.businesswire.com/news/home/20251018009011/en/Aurion-Biotech-Achieves-All-Primary-Secondary-and-Exploratory-Endpoints-in-AURN001-Phase-12-CLARA-Trial-at-12-Months",
  "Eye Bank Association of America (EBAA). 2024 Eye Banking Statistical Report. https://restoresight.org/members/publications/statistical-report/",
  "EBAA 2024 Statistical Report (US data); global figure estimated from Gain et al. (2016) and national eye bank registry data from top transplant markets. Estimate.",
  "Advancing Sight Network. ASC Coding and Reimbursement Considerations for Keratoplasty Surgery. Kirk Mack, COMT, COE, CPC, CPMA. 2025. https://advancingsight.org/wp-content/themes/advancing-sight-network/images/ASC-Coding-White-Paper.pdf",
  "Internal PST manufacturing data. Supporting documentation available upon request.",
  "Aurion Biotech. Aurion Biotech Expands Leadership Team. Press release. September 2025. https://aurionbiotech.com/aurion-biotech-expands-leadership-team-promoting-andrew-torres-ph-d-to-chief-manufacturing-officer-and-sterling-chung-to-chief-regulatory-quality-officer/",
  "Emmecell. Positive Topline Results from Randomized, Double-masked Trial of Non-surgical Cell Therapy for Corneal Edema. PR Newswire. November 18, 2024. https://www.prnewswire.com/news-releases/emmecell-announces-positive-topline-results-from-randomized-double-masked-trial-of-groundbreaking-non-surgical-cell-therapy-for-corneal-edema-302307751.html",
  "ActualEyes Inc. Company overview and AE101 program. https://www.actualeyes.co.jp/en/vision/",
  "Aurion Biotech, Inc. Form S-1 Registration Statement. Filed January 24, 2025. SEC File No. 333-284471. https://www.sec.gov/Archives/edgar/data/1924356/000095017025008763/aurion_s-1.htm",
  "Aurion Biotech. Aurion Biotech Receives Breakthrough Therapy Designation and RMAT Designation for AURN001. Press release. June 18, 2024. https://aurionbiotech.com/aurion-biotech-receives-breakthrough-therapy-designation-and-regenerative-medicine-advanced-therapy-designation-2/",
  "EY. 2026 EY M&A Firepower Report. January 12, 2026. https://www.ey.com/en_gl/firepower-report",
  "Rein DB, et al. The Economic Burden of Vision Loss and Blindness in the United States. Ophthalmology. 2022;129(4):369–378. https://pubmed.ncbi.nlm.nih.gov/34560128/",
  "Frick KD, et al. Direct Costs of Blindness Experienced by Patients Enrolled in Managed Care. Ophthalmology. 2008;115(1):11–17. https://pubmed.ncbi.nlm.nih.gov/17475331/",
  "Javitt JC, et al. Association Between Vision Loss and Higher Medical Care Costs in Medicare Beneficiaries. Ophthalmology. 2007;114(2):238–245. https://pubmed.ncbi.nlm.nih.gov/17270673/",
  "Ehrlich JR, et al. Addition of Vision Impairment to a Life-Course Model of Potentially Modifiable Dementia Risk Factors in the US. JAMA Neurology. 2022;79(8):767–778. https://pmc.ncbi.nlm.nih.gov/articles/PMC9039828/",
  "Lewin Group / EBAA. Vision-Restoring Corneal Transplants Performed in 2023 Have a Lifetime Net Benefit of Nearly $8 Billion. 2024. https://restoresight.org/news/vision-restoring-corneal-transplants-performed-in-2023-have-a-lifetime-net-benefit-of-nearly-8-billion/",
  "Vupparaboina KK, et al. Clinical Profile and Demographic Distribution of Fuchs' Endothelial Dystrophy. Indian Journal of Ophthalmology. 2022;70(7). https://pmc.ncbi.nlm.nih.gov/articles/PMC9426146/. See also: Nalley C. Fuchs': When Is It Time for a Transplant? Review of Ophthalmology. December 2024. https://www.reviewofophthalmology.com/article/fuchs-when-is-it-time-for-a-transplant",
  "Deshmukh R, et al. Fuchs Dystrophy and Cataract. Ophthalmology and Therapy. 2023;12(2):391–406. https://pmc.ncbi.nlm.nih.gov/articles/PMC10011243/. See also: Mehta JS, et al. Current Ophthalmology Reports. 2020. https://pmc.ncbi.nlm.nih.gov/articles/PMC7708572/",
  "Schein OD, et al. Cataract Surgery Among Medicare Beneficiaries. Ophthalmic Epidemiology. 2012;19(5):257–264. https://pmc.ncbi.nlm.nih.gov/articles/PMC4313376/. See also: Erie JC, et al. J Cataract Refract Surg. 2013;39(9):1383–1389. https://pmc.ncbi.nlm.nih.gov/articles/PMC4539250/",
];


// ─── PER-FAQ ANSWER TRANSFORMATIONS ────────────────────────────────────────

function applyByQuestion(question, answer) {
  let h = answer;

  // ── Why are so many patients going untreated? ──
  if (question.includes("Why are so many patients going untreated")) {
    // Correction A: 28,000 → 16,000
    h = h.replace(
      "over 28,000 patients sit on Brazil's wait list",
      "approximately 16,000 patients sit on Brazil's wait list"
    );
    // Citation 1
    h = h.replace(
      "actually receive surgery. Outside",
      `actually receive surgery${cite(1)}. Outside`
    );
    // Citation 2
    h = h.replace(
      "18 months or more in the UK,",
      `18 months or more in the UK${cite(2)},`
    );
    // Citation 3
    h = h.replace(
      "sit on Brazil's wait list, and",
      `sit on Brazil's wait list${cite(3)}, and`
    );
    // Citation 4
    h = h.replace(
      "no access to corneal transplantation at all.</p>",
      `no access to corneal transplantation at all${cite(4)}.</p>`
    );
  }

  // ── What does a corneal transplant cost the healthcare system today? ──
  if (question.includes("What does a corneal transplant cost the healthcare system today")) {
    // Correction B: "about 16%" → "approximately 10–20%"
    h = h.replace(
      "about 16% of patients require a rebubbling procedure for graft dislocation",
      "approximately 10–20% of patients require a rebubbling procedure for graft dislocation"
    );
    // Correction C: "11-17% need a second transplant within eight years" → "15–22% need a second transplant within ten years"
    h = h.replace(
      "11-17% need a second transplant within eight years",
      "15–22% need a second transplant within ten years"
    );
    // Citation 5
    h = h.replace(
      "total medical costs exceeding $41,000. Complications",
      `total medical costs exceeding $41,000${cite(5)}. Complications`
    );
    // Citation 6
    h = h.replace(
      "rebubbling procedure for graft dislocation, 2%",
      `rebubbling procedure for graft dislocation${cite(6)}, 2%`
    );
    // Citation 7
    h = h.replace(
      "requiring an early repeat transplant, and",
      `requiring an early repeat transplant${cite(7)}, and`
    );
    // Citation 8
    h = h.replace(
      "second transplant within ten years. A cell",
      `second transplant within ten years${cite(8)}. A cell`
    );
  }

  // ── What clinical evidence supports the cell therapy approach? ──
  if (question.includes("What clinical evidence supports the cell therapy approach")) {
    // Citation 9
    h = h.replace(
      "New England Journal of Medicine in 2018, showed",
      `New England Journal of Medicine in 2018${cite(9)}, showed`
    );
    // Citation 10
    h = h.replace(
      "published in Ophthalmology in 2025, now covering",
      `published in Ophthalmology in 2025${cite(10)}, now covering`
    );
    // Citation 11
    h = h.replace(
      "commercial approval in Japan and successfully",
      `commercial approval in Japan${cite(11)} and successfully`
    );
    // Correction: Phase II → Phase 1/2, US → US and Canada + Citation 12
    h = h.replace(
      "completed its Phase II trial in the US",
      `completed its Phase 1/2 trial in the US and Canada${cite(12)}`
    );
  }

  // ── What is treatment like for a patient? ──
  if (question.includes("What is treatment like for a patient")) {
    // Correction D: "11-17% of patients within 8 years" → "15–22% of patients within ten years"
    h = h.replace(
      "in 11-17% of patients within 8 years",
      "in 15–22% of patients within ten years"
    );
    // Correction F: "roughly 16% of cases" → "roughly 10–20% of cases"
    h = h.replace(
      "roughly 16% of cases",
      "roughly 10–20% of cases"
    );
    // Citation 6
    h = h.replace(
      "10–20% of cases), graft",
      `10–20% of cases${cite(6)}), graft`
    );
    // Citation 8
    h = h.replace(
      "within ten years.</p>",
      `within ten years${cite(8)}.</p>`
    );
  }

  // ── How do you size the market opportunity? ──
  if (question.includes("How do you size the market opportunity")) {
    // Citation 13
    h = h.replace(
      "procedures are performed each year. At PST",
      `procedures are performed each year${cite(13)}. At PST`
    );
    // Citation 14
    h = h.replace(
      "roughly 100,000 procedures per year. </p>",
      `roughly 100,000 procedures per year${cite(14)}. </p>`
    );
    // Citation 1
    h = h.replace(
      "21% of eligible patients receive surgery. A cryo",
      `21% of eligible patients receive surgery${cite(1)}. A cryo`
    );
  }

  // ── What does reimbursement look like? ──
  if (question.includes("What does reimbursement look like")) {
    // Citation 15 (first occurrence)
    h = h.replace(
      "$3,750–$5,200 per case, and total",
      `$3,750–$5,200 per case${cite(15)}, and total`
    );
    // Citation 15 (second occurrence)
    h = h.replace(
      "$6,800–$8,500 per procedure. A manufactured",
      `$6,800–$8,500 per procedure${cite(15)}. A manufactured`
    );
  }

  // ── What are the expected unit economics of PST's cell therapy? ──
  if (question.includes("What are the expected unit economics")) {
    // Citation 16
    h = h.replace(
      "over 10,000 treatment doses, and",
      `over 10,000 treatment doses${cite(16)}, and`
    );
    // Citation 15
    h = h.replace(
      "$3,750–$5,200 per case and serves",
      `$3,750–$5,200 per case${cite(15)} and serves`
    );
  }

  // ── Who are the competitors? ──
  if (question.includes("Who are the competitors")) {
    // Citation 11
    h = h.replace(
      "cell therapy in Japan, using fresh",
      `cell therapy in Japan${cite(11)}, using fresh`
    );
    // Citation 17
    h = h.replace(
      "entering US Phase 3 trials. Aurion has",
      `entering US Phase 3 trials${cite(17)}. Aurion has`
    );
    // Citation 18
    h = h.replace(
      "Phase 1 extension results in late 2024 and",
      `Phase 1 extension results in late 2024${cite(18)} and`
    );
    // Citation 19
    h = h.replace(
      "research from Doshisha University. They have",
      `research from Doshisha University${cite(19)}. They have`
    );
  }

  // ── Why can't a competitor add cryopreservation? ──
  if (question.includes("Why can't a competitor add cryopreservation") || question.includes("Why can\u2019t a competitor add cryopreservation")) {
    // Citation 20
    h = h.replace(
      "shelf life of 24-48 hours. Transitioning",
      `shelf life of 24-48 hours${cite(20)}. Transitioning`
    );
  }

  // ── What does PST still need to prove? ──
  if (question.includes("What does PST still need to prove")) {
    // Citation 10
    h = h.replace(
      "published in 2025, confirms",
      `published in 2025${cite(10)}, confirms`
    );
  }

  // ── Could PST receive accelerated regulatory designations? ──
  if (question.includes("Could PST receive accelerated regulatory")) {
    // Citation 21
    h = h.replace(
      "validated these pathways, and PST",
      `validated these pathways${cite(21)}, and PST`
    );
  }

  // ── Why would a pharmaceutical company acquire PST? ──
  if (question.includes("Why would a pharmaceutical company acquire")) {
    // Correction E: $2 trillion → $2.1 trillion
    h = h.replace(
      "With $2 trillion in capital for acquisitions",
      "With $2.1 trillion in capital for acquisitions"
    );
    // Citation 22
    h = h.replace(
      "$2.1 trillion in capital for acquisitions and",
      `$2.1 trillion in capital for acquisitions${cite(22)} and`
    );
  }

  // ── What are the manufacturing and regulatory risks? ──
  if (question.includes("What are the manufacturing and regulatory risks")) {
    // Citation 21
    h = h.replace(
      "RMAT designations. PST is executing",
      `RMAT designations${cite(21)}. PST is executing`
    );
  }

  // ── NEW FAQ: Cost of corneal blindness ──
  if (question.includes("What does corneal blindness cost")) {
    // Citation 23
    h = h.replace(
      "$134 billion per year, including",
      `$134 billion per year${cite(23)}, including`
    );
    // Citation 24
    h = h.replace(
      "$7,400 more per year in total",
      `$7,400 more per year${cite(24)} in total`
    );
    // Citation 25
    h = h.replace(
      "90% of that excess spending is on",
      `90% of that excess spending${cite(25)} is on`
    );
    // Citation 26
    h = h.replace(
      "modifiable risk factor for dementia, a condition",
      `modifiable risk factor for dementia${cite(26)}, a condition`
    );
    // Citation 5 (reuse)
    h = h.replace(
      "$41,000 in the first year, about",
      `$41,000 in the first year${cite(5)}, about`
    );
    // Citation 27
    h = h.replace(
      "nearly $8 billion, demonstrating",
      `nearly $8 billion${cite(27)}, demonstrating`
    );
  }

  // ── NEW FAQ: Simpler therapy expansion ──
  if (question.includes("Could a simpler, lower-cost therapy")) {
    // Citation 28
    h = h.replace(
      "managed conservatively because",
      `managed conservatively${cite(28)} because`
    );
    // Add missing phrase + Citation 29
    h = h.replace(
      "offering surgery to earlier-stage patients.</p>",
      `offering surgery to earlier-stage patients — a threshold shift that has been explicitly documented in the clinical literature${cite(29)}.</p>`
    );
    // Citation 30
    h = h.replace(
      "4.4-fold over 15 years —",
      `4.4-fold over 15 years${cite(30)} —`
    );
  }

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

  // Fetch FAQ block
  const { data: faqBlock, error: faqError } = await sb.from("content_blocks")
    .select("id, content, content_sections!inner(slug)")
    .eq("deal_id", deal.id)
    .eq("key", "faqs")
    .eq("content_sections.slug", "faq")
    .single();
  if (faqError || !faqBlock) {
    console.error("FAQ block not found:", faqError?.message);
    process.exit(1);
  }

  console.log("── Applying FAQ corrections and citations ──\n");

  const groups = faqBlock.content;
  let totalModified = 0;
  let totalSups = 0;

  for (const group of groups) {
    for (const item of group.items) {
      const original = item.answer;
      const updated = applyByQuestion(item.question, original);
      if (updated !== original) {
        const supCount = (updated.match(/<sup>/g) || []).length - (original.match(/<sup>/g) || []).length;
        totalSups += supCount;
        totalModified++;
        item.answer = updated;
        console.log(`  ✓ ${item.question.substring(0, 55)}... (+${supCount} sups)`);
      }
    }
  }

  console.log(`\n  Total: ${totalModified} FAQ answers modified, ${totalSups} superscripts added`);

  // Update FAQ block
  const { error: updateError } = await sb.from("content_blocks")
    .update({ content: groups, updated_at: new Date().toISOString() })
    .eq("id", faqBlock.id);
  if (updateError) {
    console.error("  ERROR updating FAQ block:", updateError.message);
    process.exit(1);
  }
  console.log("  ✓ FAQ block updated in Supabase");

  // Update FAQ citations block
  const { data: citBlock, error: citError } = await sb.from("content_blocks")
    .select("id, content_sections!inner(slug)")
    .eq("deal_id", deal.id)
    .eq("key", "citations")
    .eq("content_sections.slug", "faq")
    .single();
  if (citError || !citBlock) {
    console.error("FAQ citations block not found:", citError?.message);
    process.exit(1);
  }
  const { error: citUpdateError } = await sb.from("content_blocks")
    .update({ content: FAQ_CITATIONS, updated_at: new Date().toISOString() })
    .eq("id", citBlock.id);
  if (citUpdateError) {
    console.error("  ERROR updating citations:", citUpdateError.message);
  } else {
    console.log(`  ✓ FAQ citations updated (${FAQ_CITATIONS.length} entries)`);
  }

  console.log("\nDone.");
}

main().catch((err) => { console.error(err); process.exit(1); });
