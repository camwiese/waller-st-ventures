import { COLORS, SANS } from "../constants/theme";
import { SectionHeader, Accordion } from "./Shared";


const DIVIDER_STYLE = { borderTop: `1px solid ${COLORS.border}`, marginTop: 24, marginBottom: 24 };
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
const FALLBACK_FAQ_ITEMS = [
  {
    q: "What is an SPV?",
    a: "An SPV pools capital from multiple investors into a single entity, which then invests directly into PST's seed round on the same SAFE terms as all other seed investors. You are investing in the SPV; the SPV holds the position in PST.",
  },
  {
    q: "How do fees and carry work?",
    a: "No management or placement fees are charged on this deal beyond slight administrative setup costs for the SPV, split proportionally among LPs.",
  },
  {
    q: "What are pro-rata rights?",
    a: "Pro-rata rights allow the SPV to invest in the future to maintain ownership. PST has provided this SPV with pro-rata and during the next financing round you will be contacted first to maintain ownership.",
  },
  {
    q: "Will I get updates?",
    a: "Yes, updates are provided 2-4 times per year summarizing progress and major developments.",
  },
];

function toFaqAccordionItems(groups) {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  return groups
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .flatMap((group) => (group.items || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((item) => ({
        q: item.question,
        a: <div className="cms-prose-sm" dangerouslySetInnerHTML={{ __html: item.answer || "" }} />,
      })));
}

export default function TermsSection({ isMobile, content, sectionTitle }) {
  const roundDetails = Array.isArray(content?.round_details)
    ? content.round_details.map((row) => ({
        l: row.label,
        v: row.label === "Check Size" ? "$25k minimum" : row.value,
        highlight: row.highlight,
      }))
    : FALLBACK_ROUND_DETAILS;
  const spvTerms = Array.isArray(content?.spv_terms)
    ? content.spv_terms
    : FALLBACK_SPV_TERMS;
  const faqItems = toFaqAccordionItems(content?.faqs) || FALLBACK_FAQ_ITEMS;
  const hasCmsSummary = typeof content?.summary === "string" && content.summary.trim().length > 0;

  return (
    <div>
      <SectionHeader title={sectionTitle || "Investment Terms"} isMobile={isMobile} />
      <div style={{ borderLeft: `4px solid ${COLORS.green600}`, paddingLeft: 16, marginBottom: 24 }}>
        {hasCmsSummary ? (
          <div
            style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, color: COLORS.ink }}
            dangerouslySetInnerHTML={{ __html: content.summary }}
          />
        ) : (
          <p style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, color: COLORS.ink, margin: 0 }}>PST is raising a $5M seed round at $25M post-money via SAFE</p>
        )}
      </div>

      <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "18px 20px 14px 20px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.cream100 }}>
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: COLORS.text500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Round Details</span>
        </div>
        {roundDetails.map((t, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < roundDetails.length - 1 ? `1px solid ${COLORS.border}` : "none", background: i % 2 === 0 ? COLORS.cream50 : COLORS.white }}>
            <span style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text500, fontWeight: 500 }}>{t.l}</span>
            <span style={{ fontFamily: SANS, fontSize: 14, color: t.highlight ? COLORS.green700 : COLORS.text900, fontWeight: 600 }}>{t.v}</span>
          </div>
        ))}
      </div>

      <div style={DIVIDER_STYLE} />
      <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLORS.green700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>SPV Terms</div>
      <ul style={{ fontFamily: SANS, fontSize: 14, fontWeight: 400, color: COLORS.charcoal, margin: "0 0 20px 0", lineHeight: 1.6, paddingLeft: 20 }}>
        {spvTerms.map((term, index) => (
          <li key={term} style={{ marginBottom: index < spvTerms.length - 1 ? 8 : 0 }}>{term}</li>
        ))}
      </ul>

      <div style={DIVIDER_STYLE} />
      <h3 style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLORS.green700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>Common SPV Questions</h3>
      <Accordion items={faqItems} />
    </div>
  );
}
