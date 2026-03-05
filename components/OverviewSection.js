import Image from "next/image";
import { COLORS, SANS } from "../constants/theme";
import { SectionHeader, bodyP } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";

import summaryData from "../content/summary.json";

function signatureFromContent(contentSignature) {
  if (Array.isArray(contentSignature)) {
    const map = Object.fromEntries(contentSignature.map((entry) => [entry.label, entry.value]));
    return {
      name: map.name || "",
      email: map.email || "",
      phone: map.phone || "",
    };
  }
  return null;
}

export default function OverviewSection({ isMobile, content, sectionTitle }) {
  const { paragraphs, signature } = summaryData;
  const cmsSignature = signatureFromContent(content?.signature);
  const hasCmsBody = typeof content?.body === "string" && content.body.trim().length > 0;

  return (
    <div>
      <SectionHeader title={sectionTitle || "GP Letter"} isMobile={isMobile} />
      <div style={{ padding: isMobile ? "0 0" : "0 0" }}>
        {hasCmsBody ? (
          <RichTextRenderer html={content.body} />
        ) : (
          paragraphs.map((text, i) => (
            <p key={i} style={i < paragraphs.length - 1 ? bodyP : { ...bodyP, marginBottom: 0 }}>{text}</p>
          ))
        )}
        <div style={{ paddingTop: 32 }}>
          <Image src="/images/signature.png" alt="Signature" width={126} height={48} style={{ display: "block", maxWidth: 126, height: "auto", marginBottom: 10 }} />
          <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 400, color: COLORS.text500, lineHeight: 1.4 }}>
            {(cmsSignature?.name || signature.name)}<br />
            {(cmsSignature?.email || signature.email)}<br />
            {(cmsSignature?.phone || signature.phone)}
          </div>
        </div>
      </div>
    </div>
  );
}
