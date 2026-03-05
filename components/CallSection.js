import { COLORS, SANS } from "../constants/theme";
import { SectionHeader } from "./Shared";

const DEFAULT_CONTACT = {
  schedule_url: "https://calendar.app.google/asdgEY3xfoLCNyWJ9",
  phone_display: "360-318-4480",
  phone_e164: "3603184480",
};

export default function CallSection({ isMobile, contactSettings = {}, sectionTitle }) {
  const contact = { ...DEFAULT_CONTACT, ...contactSettings };
  const hasSchedule = !!contact.schedule_url?.trim();
  const phoneHref = contact.phone_e164 ? `tel:${contact.phone_e164}` : null;
  const smsHref = contact.phone_e164 ? `sms:${contact.phone_e164}` : null;
  const displayPhone = contact.phone_display || contact.phone_e164 || "—";

  return (
    <div>
      <SectionHeader title={sectionTitle || "Chat with me"} isMobile={isMobile} />
      <div style={{ padding: 0 }}>
        <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.8, color: COLORS.text700, margin: "0 0 24px 0" }}>
          Want to talk through the investment or ready to move forward? Text me or grab some time on my calendar
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {hasSchedule ? (
            <a href={contact.schedule_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: COLORS.green800, color: COLORS.cream50, padding: "14px 20px", borderRadius: 6, fontFamily: SANS, fontSize: 15, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
              Book a Call
            </a>
          ) : (
            <div style={{ display: "block", background: COLORS.text400, color: COLORS.cream50, padding: "14px 20px", borderRadius: 6, fontFamily: SANS, fontSize: 15, fontWeight: 600, textAlign: "center", cursor: "not-allowed", opacity: 0.6, pointerEvents: "none" }}>
              Book a Call
            </div>
          )}
          {smsHref ? (
            <a href={smsHref} style={{ display: "block", background: COLORS.green800, color: COLORS.cream50, padding: "14px 20px", borderRadius: 6, fontFamily: SANS, fontSize: 15, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
              Text Me — {displayPhone}
            </a>
          ) : null}
          {phoneHref ? (
            <a href={phoneHref} style={{ display: "block", color: COLORS.green700, padding: "12px 0", fontFamily: SANS, fontSize: 14, textDecoration: "underline", textAlign: "center" }}>
              Or, give me a call →
            </a>
          ) : displayPhone !== "—" ? (
            <div style={{ fontFamily: SANS, fontSize: 14, color: COLORS.green700, padding: "12px 0", textAlign: "center" }}>{displayPhone}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
