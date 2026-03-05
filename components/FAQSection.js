import { COLORS, SANS } from "../constants/theme";
import { SectionHeader, Accordion } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";
import CitationsRenderer from "./CitationsRenderer";

import faqData from "../content/faq.json";

const pStyle = { fontFamily: SANS, fontSize: 14, lineHeight: 1.75, color: COLORS.text700, margin: "0 0 12px 0" };
const pLastStyle = { ...pStyle, marginBottom: 0 };

function renderAnswer(answer) {
  if (typeof answer === "string") {
    return <p style={pLastStyle}>{answer}</p>;
  }
  if (answer.paragraphs) {
    return (
      <div>
        {answer.paragraphs.map((para, i) => (
          <p key={i} style={i < answer.paragraphs.length - 1 ? pStyle : pLastStyle}>{para}</p>
        ))}
      </div>
    );
  }
  if (answer.intro && answer.list) {
    return (
      <div>
        <p style={pStyle}>{answer.intro}</p>
        <ul style={{ fontFamily: SANS, fontSize: 14, lineHeight: 1.75, color: COLORS.text700, margin: "0 0 12px 0", paddingLeft: 20 }}>
          {answer.list.map((item, i) => (
            <li key={i} style={{ marginBottom: 6 }}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (answer.intro && answer.numberedList) {
    const listStyle = { fontFamily: SANS, fontSize: 14, lineHeight: 1.75, color: COLORS.text700, margin: "0 0 12px 0", paddingLeft: 20 };
    return (
      <div>
        <p style={pStyle}>{answer.intro}</p>
        <ol style={listStyle}>
          {answer.numberedList.map((item, i) => (
            <li key={i} style={{ marginBottom: 12 }}>{item}</li>
          ))}
        </ol>
      </div>
    );
  }
  return null;
}

function groupedFaqFromCms(groups = []) {
  return groups
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((group) => ({
      title: group.title,
      items: (group.items || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((item) => ({
          q: item.question,
          a: <div className="cms-prose-sm" dangerouslySetInnerHTML={{ __html: item.answer || "" }} />,
        })),
    }));
}

export default function FAQSection({ isMobile, content, sectionTitle }) {
  const cmsGroups = Array.isArray(content?.faqs) ? groupedFaqFromCms(content.faqs) : null;
  const cats = cmsGroups || faqData.faq.sections.map((sec) => ({
    title: sec.section,
    items: sec.questions.map((q) => ({
      q: q.question,
      a: renderAnswer(q.answer),
    })),
  }));

  return (
    <div>
      <SectionHeader title={sectionTitle || "Frequently Asked Questions"} isMobile={isMobile} />
      {typeof content?.body === "string" && content.body.trim().length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <RichTextRenderer html={content.body} />
        </div>
      )}
      {cats.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: ci < cats.length - 1 ? 40 : 0, paddingBottom: ci < cats.length - 1 ? 32 : 0, borderBottom: ci < cats.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
          <h3 style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: COLORS.green600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>{cat.title}</h3>
          <Accordion items={cat.items} />
        </div>
      ))}
      <CitationsRenderer citations={content?.citations} />
    </div>
  );
}
