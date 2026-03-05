import { SANS } from "../constants/theme";

export default function RichTextRenderer({ html, className, style }) {
  if (!html || typeof html !== "string") return null;

  return (
    <div
      className={`cms-prose${className ? ` ${className}` : ""}`}
      style={{ fontFamily: SANS, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

