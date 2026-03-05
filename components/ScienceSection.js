"use client";

import Image from "next/image";
import { COLORS, SANS } from "../constants/theme";
import { SectionHeader, bodyP, h3Style } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";
import CitationsRenderer from "./CitationsRenderer";

import scienceData from "../content/science-primer.json";

const linkStyle = { color: COLORS.green700, textDecoration: "underline" };
const stripTags = (value) => (typeof value === "string" ? value.replace(/<[^>]*>/g, "").trim() : "");
const toSlug = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function renderParagraph(text, links = []) {
  let content = text;
  const parts = [];

  if (links.length > 0) {
    for (const link of links) {
      const idx = content.indexOf(link.text);
      if (idx >= 0) {
        if (idx > 0) parts.push(content.slice(0, idx));
        parts.push(
          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {link.text}
          </a>
        );
        content = content.slice(idx + link.text.length);
      }
    }
  }
  if (content) parts.push(content);

  const fullText = parts.length > 0 ? parts : [text];
  const withBold = [];
  fullText.forEach((segment, i) => {
    if (typeof segment === "string" && segment.includes("**")) {
      const segs = segment.split(/\*\*(.+?)\*\*/g);
      segs.forEach((s, j) => {
        if (j % 2 === 1) withBold.push(<strong key={`${i}-${j}`}>{s}</strong>);
        else if (s) withBold.push(s);
      });
    } else {
      withBold.push(segment);
    }
  });

  return <p style={bodyP}>{withBold}</p>;
}

export default function ScienceSection({ isMobile, content, sectionTitle }) {
  const H = ({ children }) => <h3 style={{ ...h3Style, marginBottom: 20 }}>{children}</h3>;
  const cellStyle = { fontFamily: SANS, fontSize: 12, lineHeight: 1.6, color: COLORS.text700, padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}`, verticalAlign: "top", wordWrap: "break-word", overflowWrap: "break-word" };
  const headerCellStyle = { fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLORS.text900, padding: "10px 12px", borderBottom: `2px solid ${COLORS.text900}`, textAlign: "left" };
  const labelCellStyle = { ...cellStyle, fontWeight: 600, color: COLORS.text900, width: isMobile ? 100 : 140 };
  const readingTimeLabel = stripTags(content?.reading_time) || scienceData.readingTime;

  return (
    <div style={{ overflow: "hidden", minWidth: 0 }}>
      <SectionHeader title={sectionTitle || "Science Primer"} isMobile={isMobile} compact />
      <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 400, color: COLORS.ash, margin: "24px 0 20px 0" }}>Reading time: {readingTimeLabel}</p>
      <div style={{ borderTop: `1px solid ${COLORS.stone}`, marginTop: 20, marginBottom: 32 }} />
      <div style={{ padding: 0, overflow: "hidden", maxWidth: "100%" }}>
        {scienceData.sections.map((sec, secIdx) => (
          <div key={secIdx}>
            {sec.title === "Supporting References" ? null : (
              <>
                <H>{sec.title}</H>
                {(() => {
                  const sectionKey = `section_${toSlug(sec.title)}`;
                  const cmsHtml = typeof content?.[sectionKey] === "string" ? content[sectionKey].trim() : "";
                  const hasCmsHtml = cmsHtml.length > 0;

                  if (sec.image && sec.image.src === "/images/Structure_of_the_Cornea.png") {
                    return (
                      <div style={{ overflow: "auto", marginBottom: 20 }}>
                        <Image
                          src={sec.image.src}
                          alt={sec.image.alt}
                          width={340}
                          height={250}
                          style={{
                            float: isMobile ? "none" : "right",
                            marginLeft: isMobile ? 0 : 24,
                            marginBottom: 12,
                            marginTop: 4,
                            maxWidth: isMobile ? "100%" : "58%",
                            width: isMobile ? "100%" : 340,
                            height: "auto",
                            borderRadius: 8,
                            border: `1px solid ${COLORS.border}`,
                            display: "block",
                          }}
                        />
                        {hasCmsHtml ? (
                          <RichTextRenderer html={cmsHtml} />
                        ) : (
                          sec.paragraphs.slice(0, 2).map((para, i) => (
                            <div key={i}>{renderParagraph(para, sec.links)}</div>
                          ))
                        )}
                      </div>
                    );
                  }

                  if (hasCmsHtml) {
                    return <RichTextRenderer html={cmsHtml} style={{ marginBottom: sec.table ? 16 : 20 }} />;
                  }

                  if (sec.paragraphs && !sec.table) {
                    return (
                      <>
                        {sec.paragraphs.map((para, i) => (
                          <div key={i}>{renderParagraph(para, sec.links)}</div>
                        ))}
                      </>
                    );
                  }

                  return null;
                })()}
                {sec.image && sec.image.src === "/images/Structure_of_the_Cornea.png" && (
                  <div style={{ marginTop: 8 }} />
                )}
                {sec.table && (
                  <div style={{ overflowX: "auto", margin: "24px 0", minWidth: 0, maxWidth: "100%" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, tableLayout: "fixed" }}>
                      <thead>
                        <tr>
                          {sec.table.headers.map((h, i) => (
                            <th key={i} style={i === 0 ? { ...headerCellStyle, width: isMobile ? 100 : 140 } : headerCellStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sec.table.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                style={
                                  ri === sec.table.rows.length - 1
                                    ? { ...(ci === 0 ? labelCellStyle : cellStyle), borderBottom: "none" }
                                    : ci === 0 ? labelCellStyle : cellStyle
                                }
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {sec.image && sec.image.src !== "/images/Structure_of_the_Cornea.png" && (
                  <div style={{ margin: "24px 0", textAlign: "center" }}>
                    <Image
                      src={sec.image.src}
                      alt={sec.image.alt}
                      width={560}
                      height={400}
                      style={{ maxWidth: "100%", width: 560, height: "auto", borderRadius: 8, border: `1px solid ${COLORS.border}` }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <CitationsRenderer citations={content?.citations} />
      </div>
    </div>
  );
}
