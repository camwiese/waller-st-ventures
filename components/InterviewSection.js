import { COLORS, SANS } from "../constants/theme";
import { SectionHeader } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";

export default function InterviewSection({ isMobile, content, sectionTitle }) {
  const hasCmsBody = typeof content?.body === "string" && content.body.trim().length > 0;
  return (
    <div>
      <SectionHeader title={sectionTitle || "CEO Interview"} isMobile={isMobile} />
      <div style={{ padding: 0 }}>
        {hasCmsBody ? (
          <RichTextRenderer html={content.body} style={{ marginBottom: 24 }} />
        ) : (
          <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: COLORS.text700, margin: "0 0 24px 0" }}>In this conversation, Daniel and I discuss PST&apos;s origin story, the cryopreservation breakthrough, what the first-in-human trial will look like, and why they believe this therapy can reach millions of patients worldwide.</p>
        )}
        <div style={{ width: "100%", aspectRatio: "16/9", background: COLORS.cream100, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.border}` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: COLORS.green600, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px auto" }}><span style={{ color: COLORS.white, fontSize: 24, marginLeft: 3 }}>▶</span></div>
            <div style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text400 }}>Video coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
