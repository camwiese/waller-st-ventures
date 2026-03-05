import memoData from "../../content/memo.json";
import summaryData from "../../content/summary.json";
import scienceData from "../../content/science-primer.json";
import { COLORS } from "../../constants/theme";
import {
  MODEL_DEFAULTS,
  clampInvestment,
  calcSeedOwnership,
  calcSeriesAPostMoney,
  calcNewInvestorDilution,
  calcDilutionFactor,
  calcPostSeriesAOwnership,
  calcNetAfterCarry,
  calcMOIC,
  fmtDollarShort,
  fmtFull,
} from "../model/calc";

const FALLBACK_ROUND_DETAILS = [
  { l: "Instrument", v: "Post-Money SAFE" },
  { l: "Valuation Cap", v: "$25,000,000", highlight: true },
  { l: "Round Size", v: "$5,000,000" },
  { l: "SPV Allocation", v: "$250,000" },
  { l: "Check Size", v: "$25k minimum", highlight: true },
];

const FALLBACK_SPV_TERMS = [
  "20% carry on profits",
  "No management / placement fees",
  "Pro rata included",
  "This SPV will be administered by AngelList",
];

function htmlFromParagraphs(paragraphs) {
  if (!Array.isArray(paragraphs)) return "";
  return paragraphs.map((text) => `<p>${text}</p>`).join("");
}

function htmlFromMemoSections(sections) {
  if (!Array.isArray(sections)) return "";
  return sections.map((sec) => {
    if (sec.section === "TLDR") {
      return `
        <div class="memo-tldr">
          ${sec.paragraphs.map((p) => `<p class="tldr">${p}</p>`).join("")}
        </div>
      `;
    }
    if (sec.section === "Intro") {
      return `
        <div class="memo-intro">
          ${sec.paragraphs.map((p) => `<p>${p}</p>`).join("")}
        </div>
      `;
    }
    return `
      <div class="memo-section">
        <h3>${sec.section}</h3>
        ${sec.paragraphs.map((p) => `<p>${p}</p>`).join("")}
      </div>
    `;
  }).join("");
}

function safeHtml(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasAnyContent(...values) {
  return values.some((value) => {
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
}

function normalizeSignature(signature) {
  if (Array.isArray(signature)) {
    const map = Object.fromEntries(signature.map((entry) => [entry.label, entry.value]));
    return {
      name: map.name || "",
      email: map.email || "",
      phone: map.phone || "",
    };
  }
  return signature || {};
}

function buildLetterSection(cmsSection) {
  const bodyHtml = safeHtml(cmsSection?.blocks?.body);
  const signature = normalizeSignature(cmsSection?.blocks?.signature || summaryData.signature || {});
  if (!hasAnyContent(bodyHtml)) {
    const fallback = htmlFromParagraphs(summaryData.paragraphs);
    if (!hasAnyContent(fallback)) return null;
    return {
      title: cmsSection?.section?.title || "GP Letter",
      bodyHtml: `${fallback}${signatureHtml(signature)}`,
    };
  }

  return {
    title: cmsSection?.section?.title || "GP Letter",
    bodyHtml: `${bodyHtml}${signatureHtml(signature)}`,
  };
}

function signatureHtml(signature) {
  const name = signature?.name || "";
  const email = signature?.email || "";
  const phone = signature?.phone || "";
  if (!hasAnyContent(name, email, phone)) return "";
  return `
    <div class="signature">
      <div>${name}</div>
      <div>${email}</div>
      <div>${phone}</div>
    </div>
  `;
}

function buildMemoSection(cmsSection) {
  const summaryHtml = safeHtml(cmsSection?.blocks?.summary);
  const bodyHtml = safeHtml(cmsSection?.blocks?.body);
  if (hasAnyContent(bodyHtml)) {
    return {
      title: cmsSection?.section?.title || "Investment Memo",
      bodyHtml: `${summaryHtml ? `<div class="memo-summary">${summaryHtml}</div>` : ""}${bodyHtml}`,
    };
  }

  const fallback = htmlFromMemoSections(memoData.memo);
  if (!hasAnyContent(fallback)) return null;
  return {
    title: cmsSection?.section?.title || "Investment Memo",
    bodyHtml: fallback,
  };
}

function buildTermsSection(cmsSection) {
  const summaryHtml = safeHtml(cmsSection?.blocks?.summary);
  const roundDetails = Array.isArray(cmsSection?.blocks?.round_details)
    ? cmsSection.blocks.round_details.map((row) => ({
        l: row.label,
        v: row.label === "Check Size" ? "$25k minimum" : row.value,
        highlight: row.highlight,
      }))
    : FALLBACK_ROUND_DETAILS;
  const spvTerms = Array.isArray(cmsSection?.blocks?.spv_terms)
    ? cmsSection.blocks.spv_terms
    : FALLBACK_SPV_TERMS;

  if (!hasAnyContent(summaryHtml, roundDetails, spvTerms)) return null;

  const summaryBlock = summaryHtml
    ? `<div class="terms-summary">${summaryHtml}</div>`
    : `<div class="terms-summary"><p>PST is raising a $5M seed round at $25M post-money via SAFE</p></div>`;
  const roundRows = roundDetails.map((row) => `
    <div class="table-row">
      <span>${row.l}</span>
      <span class="${row.highlight ? "accent" : ""}">${row.v}</span>
    </div>
  `).join("");
  const spvList = spvTerms.map((term) => `<li>${term}</li>`).join("");

  return {
    title: cmsSection?.section?.title || "Investment Terms",
    bodyHtml: `
      ${summaryBlock}
      <div class="table">
        <div class="table-header">Round Details</div>
        ${roundRows}
      </div>
      <div class="subhead">SPV Terms</div>
      <ul class="bullet-list">${spvList}</ul>
    `,
  };
}

function buildScienceSection(cmsSection) {
  const cmsBlocks = cmsSection?.blocks || {};
  const hasCmsContent = Object.values(cmsBlocks).some((value) => hasAnyContent(value));

  const sectionsHtml = scienceData.sections.map((sec) => {
    const key = `section_${String(sec.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const cmsHtml = safeHtml(cmsBlocks[key]);
    if (cmsHtml) {
      return `<div class="science-section"><h3>${sec.title}</h3>${cmsHtml}</div>`;
    }
    if (!sec.paragraphs && !sec.table && !sec.references) return "";
    if (sec.title === "Supporting References") {
      const refs = Array.isArray(cmsBlocks.references) ? cmsBlocks.references : sec.references || [];
      if (!hasAnyContent(refs)) return "";
      return `
        <div class="science-section">
          <h4>Supporting References</h4>
          <div class="references">
            ${refs.map((ref) => `<p>${ref}</p>`).join("")}
          </div>
        </div>
      `;
    }
    const paragraphs = sec.paragraphs ? sec.paragraphs.map((p) => `<p>${p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`).join("") : "";
    const table = sec.table ? `
      <table class="science-table">
        <thead>
          <tr>${sec.table.headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${sec.table.rows.map((row) => `
            <tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    ` : "";
    return `
      <div class="science-section">
        <h3>${sec.title}</h3>
        ${paragraphs}
        ${table}
      </div>
    `;
  }).join("");

  if (!hasCmsContent && !hasAnyContent(sectionsHtml)) return null;

  return {
    title: cmsSection?.section?.title || "Science Primer",
    bodyHtml: sectionsHtml,
  };
}

function buildBiotechSection(cmsSection) {
  const bodyHtml = safeHtml(cmsSection?.blocks?.body);
  if (!hasAnyContent(bodyHtml)) return null;
  return {
    title: cmsSection?.section?.title || "Biotech Primer",
    bodyHtml,
  };
}

function fmtPct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function buildScenarioSection(investmentAmount = 50000) {
  const amount = clampInvestment(investmentAmount);
  const seedOwnership = calcSeedOwnership(amount, MODEL_DEFAULTS.safeCap);
  const seriesAPostMoney = calcSeriesAPostMoney(MODEL_DEFAULTS.seriesAPreMoney, MODEL_DEFAULTS.seriesARaise);
  const newInvestorDilution = calcNewInvestorDilution(MODEL_DEFAULTS.seriesARaise, seriesAPostMoney);
  const dilutionFactor = calcDilutionFactor(newInvestorDilution, MODEL_DEFAULTS.optionPool);
  const postSeriesAOwnership = calcPostSeriesAOwnership(seedOwnership, dilutionFactor);

  const newInvestorPct = (newInvestorDilution * 100).toFixed(2);
  const optionPoolPct = MODEL_DEFAULTS.optionPool.toFixed(2);
  const totalDilutionPct = ((newInvestorDilution + MODEL_DEFAULTS.optionPool / 100) * 100).toFixed(2);
  const retentionPct = (dilutionFactor * 100).toFixed(2);
  const seedPctStr = (seedOwnership * 100).toFixed(2);
  const postAPctStr = (postSeriesAOwnership * 100).toFixed(3);

  const scenarios = [
    { label: "Conservative", value: 500000000 },
    { label: "Target", value: 750000000 },
    { label: "Strong", value: 1000000000 },
    { label: "Home Run", value: 1250000000 },
  ];

  const exitRows = scenarios.map((scenario) => {
    const gross = scenario.value * postSeriesAOwnership;
    const net = calcNetAfterCarry(gross, amount);
    const moic = calcMOIC(net, amount);
    return `
      <div class="table-row">
        <span>${scenario.label}</span>
        <span>${fmtDollarShort(scenario.value)}</span>
        <span class="muted">${fmtFull(gross)}</span>
        <span class="accent">${fmtFull(net)}</span>
        <span class="accent">${moic.toFixed(1)}x</span>
      </div>
    `;
  }).join("");

  return {
    title: "Scenario Model",
    bodyHtml: `
      <div class="callout">
        <svg class="callout-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L2 21h20L12 3z" fill="${COLORS.green600}" />
          <rect x="11" y="9" width="2" height="6" fill="#fff" />
          <rect x="11" y="17" width="2" height="2" fill="#fff" />
        </svg>
        <p>This model is illustrative and based on assumptions. See full disclosures below.</p>
      </div>

      <h4 style="margin-top: 0;">Your Seed Investment</h4>
      <div class="table" style="margin-bottom: 16px;">
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>SAFE Valuation Cap</span>
          <span class="accent">$25,000,000</span>
        </div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>Your Investment</span>
          <span class="accent">${fmtFull(amount)}</span>
        </div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>Your Ownership at Seed</span>
          <span class="accent" style="font-weight: 700;">${fmtPct(seedOwnership)}</span>
        </div>
      </div>

      <h4>Series A Dilution</h4>
      <p>PST plans to raise one additional round, approximately 12–18 months after the seed closes. This priced round will convert all outstanding SAFEs and ownership will be diluted by the Series A investors and employee option pool.</p>

      <div class="table" style="margin-bottom: 16px;">
        <div class="table-header">Series A Assumptions</div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>Pre-Money Valuation</span>
          <span class="accent">$100,000,000</span>
        </div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>Series A Raise</span>
          <span class="accent">$35,000,000</span>
        </div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>Post-Money Valuation</span>
          <span class="accent">${fmtFull(seriesAPostMoney)}</span>
        </div>
        <div class="table-header">Dilution Breakdown</div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>New Series A investors</span>
          <span>${newInvestorPct}%</span>
        </div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>Employee option pool</span>
          <span>${optionPoolPct}%</span>
        </div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span style="font-weight: 600;">Total Dilution (${newInvestorPct}% + ${optionPoolPct}%)</span>
          <span class="accent" style="font-weight: 700;">${totalDilutionPct}%</span>
        </div>
        <div class="table-header">Your Ownership</div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>Ownership at seed</span>
          <span>${seedPctStr}%</span>
        </div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span>Dilution from Series A</span>
          <span>${totalDilutionPct}%</span>
        </div>
        <div class="table-row" style="grid-template-columns: 1fr 1fr;">
          <span style="font-weight: 600;">Ownership after Series A (${seedPctStr}% × ${retentionPct}%)</span>
          <span class="accent" style="font-weight: 700;">${postAPctStr}%</span>
        </div>
      </div>

      <h4>Exit Scenarios</h4>
      <p>Following the top line readout of their U.S. Phase I/II clinical trial, PST will pursue a strategic acquisition. The table below shows what your investment could return at different valuation assumptions.</p>

      <div class="table">
        <div class="table-header">Exit Scenarios (Investment: ${fmtFull(amount)})</div>
        <div class="table-columns">
          <span>Scenario</span>
          <span>Exit Valuation</span>
          <span>Gross Value</span>
          <span>Net to You</span>
          <span>MOIC</span>
        </div>
        ${exitRows}
      </div>
      <p class="note" style="margin-top: 12px;">
        ‡Exit valuation ranges based on industry exits for similar therapies 2010–2022. Data available upon request.<br/>
        *Net to You reflects 20% carry on profits. If the investment does not generate a profit, no carry is charged.
      </p>

      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border);">
        <h4 style="font-size: 9px; font-weight: 700; color: var(--text700); margin: 0 0 8px 0; text-transform: none; letter-spacing: 0;">Important Disclosures</h4>
        <p style="font-size: 9px; color: var(--text500); font-style: italic; line-height: 1.5; margin-bottom: 6px;">
          This scenario model is provided for illustrative purposes only and is intended to help prospective investors understand the potential mechanics of this investment under various hypothetical outcomes. All figures — including anticipated Series A terms, exit valuations, and return multiples — are hypothetical, forward-looking, and based on assumptions provided by the company that may not materialize. Actual results may differ materially.
        </p>
        <p style="font-size: 9px; color: var(--text500); font-style: italic; line-height: 1.5; margin-bottom: 6px;">
          Investment in early-stage companies involves a high degree of risk, including the potential for total loss of invested capital. There is no guarantee that PST will raise a Series A, reach clinical milestones, or achieve any exit. Past performance of comparable companies, including Aurion Biotech, is not indicative of future results for PST.
        </p>
        <p style="font-size: 9px; color: var(--text500); font-style: italic; line-height: 1.5; margin-bottom: 6px;">
          The carry structure, QSBS eligibility, and tax implications described in this data room are subject to change and depend on individual circumstances. Nothing in this data room constitutes investment, legal, or tax advice. Prospective investors should consult their own legal, tax, and financial advisors before making any investment decision.
        </p>
        <p style="font-size: 9px; color: var(--text500); font-style: italic; line-height: 1.5; margin: 0;">
          This data room is provided for informational purposes to prospective investors who have been personally invited to review this opportunity. All materials are confidential.
        </p>
      </div>
    `,
  };
}

export function buildPacketSections(cmsContent, investmentAmount = 50000) {
  const byId = cmsContent?.byId || {};
  const orderedSections = cmsContent?.orderedSections || [];

  const sections = [];

  // 1. GP Letter (cover page with signature)
  const letter = buildLetterSection(byId.overview);
  if (letter) sections.push(letter);

  // 2. Investment Memo
  const memo = buildMemoSection(byId.memo);
  if (memo) sections.push(memo);

  // 3. Investment Terms
  const terms = buildTermsSection(byId.terms);
  if (terms) sections.push(terms);

  // 4. Scenario Model (with exit scenarios and disclosures)
  sections.push(buildScenarioSection(investmentAmount));

  // 5. Science Primer
  const science = buildScienceSection(byId.science);
  if (science) sections.push(science);

  // 6. Biotech Primer
  const biotechSection = byId.biotech || orderedSections.find((item) => {
    const slug = (item?.section?.slug || "").toLowerCase();
    const title = (item?.section?.title || "").toLowerCase();
    return slug === "biotech-primer" || title === "biotech primer";
  });
  const biotech = buildBiotechSection(biotechSection);
  if (biotech) sections.push(biotech);

  return sections;
}
