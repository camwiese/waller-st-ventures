import { COLORS, SANS } from "../constants/theme";
import { SectionHeader, bodyP, h3Style } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";
import CitationsRenderer from "./CitationsRenderer";

import memoData from "../content/memo.json";

export default function MemoSection({ isMobile, content, sectionTitle }) {
  const P = ({ children }) => <p style={bodyP}>{children}</p>;
  const H = ({ children }) => <h3 style={{ ...h3Style, marginBottom: 20 }}>{children}</h3>;
  const hasCmsSummary = typeof content?.summary === "string" && content.summary.trim().length > 0;
  const hasCmsBody = typeof content?.body === "string" && content.body.trim().length > 0;

  return (
    <div>
      <SectionHeader title={sectionTitle || "Investment Memo"} isMobile={isMobile} />
      <div style={{ padding: 0 }}>
        {hasCmsSummary && (
          <div style={{ borderLeft: `4px solid ${COLORS.green600}`, paddingLeft: 16, marginBottom: 24 }}>
            <RichTextRenderer html={content.summary} />
          </div>
        )}
        {hasCmsBody ? (
          <RichTextRenderer html={content.body} />
        ) : memoData.memo.map((sec, idx) => {
          if (sec.section === "TLDR") {
            return (
              <div key={idx} style={{ borderLeft: `4px solid ${COLORS.green600}`, paddingLeft: 16, marginBottom: 28 }}>
                {sec.paragraphs.map((para, pidx) => (
                  <p key={pidx} style={{ ...bodyP, textIndent: 24, marginBottom: pidx < sec.paragraphs.length - 1 ? 20 : 0 }}>{para}</p>
                ))}
              </div>
            );
          }
          if (sec.section === "Intro") {
            return (
              <div key={idx} style={{ marginBottom: 28 }}>
                {sec.paragraphs.map((para, pidx) => (
                  <p key={pidx} style={{ ...bodyP, marginBottom: pidx < sec.paragraphs.length - 1 ? 20 : 0 }}>{para}</p>
                ))}
              </div>
            );
          }
          return (
            <div key={idx} style={{ marginBottom: idx < memoData.memo.length - 1 ? 28 : 0 }}>
              <H>{sec.section}</H>
              {sec.paragraphs.map((para, pidx) => (
                <P key={pidx}>{para}</P>
              ))}
            </div>
          );
        })}
        <CitationsRenderer citations={content?.citations} />
      </div>
    </div>
  );
}
