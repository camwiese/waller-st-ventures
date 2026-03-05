import { COLORS, SANS } from "../constants/theme";

const linkStyle = {
  color: COLORS.green700,
  textDecoration: "none",
  fontWeight: 500,
};

function urlToLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function renderCitation(text) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      const url = part.replace(/[.,;]+$/, "");
      return (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {urlToLabel(url)}
        </a>
      );
    }
    return part;
  });
}

export default function CitationsRenderer({ citations, title = "References" }) {
  if (!Array.isArray(citations) || citations.length === 0) return null;

  return (
    <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 32, paddingTop: 24 }}>
      <h4 style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLORS.text500, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>
        {title}
      </h4>
      <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400, lineHeight: 1.8 }}>
        {citations.map((citation, i) => (
          <p key={i} id={`ref-${i + 1}`} style={{ margin: i < citations.length - 1 ? "0 0 6px 0" : 0 }}>
            {i + 1}. {renderCitation(citation)}
          </p>
        ))}
      </div>
    </div>
  );
}
