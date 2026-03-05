"use client";

import { useState } from "react";
import { COLORS, SERIF, SANS } from "../constants/theme";

export const bodyP = { fontFamily: SANS, fontSize: 15, lineHeight: 1.8, color: COLORS.text700, margin: "0 0 20px 0" };
export const h3Style = { fontFamily: SERIF, fontSize: 24, fontWeight: 600, color: COLORS.text900, margin: "0 0 14px 0", letterSpacing: "-0.01em" };

export function SectionHeader({ title, subtitle, isMobile, compact }) {
  return (
    <div style={{ marginBottom: compact ? 10 : 36 }}>
      <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: COLORS.green600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Puget Sound Therapeutics</div>
      <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 28 : 34, fontWeight: 600, color: COLORS.text900, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</h2>
      {subtitle && <p style={{ fontFamily: SANS, fontSize: 15, color: COLORS.text500, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>{subtitle}</p>}
      <div style={{ width: 36, height: 3, background: COLORS.green600, borderRadius: 2, marginTop: 18 }} />
    </div>
  );
}

export function InfoTooltip({ text, isMobile, compact, icon = "i", circle = true }) {
  const [show, setShow] = useState(false);
  const size = compact ? 20 : 44;
  const iconSize = compact ? 14 : 18;
  const tooltipStyle = {
    position: "absolute",
    left: isMobile ? "50%" : "auto",
    right: isMobile ? "auto" : 0,
    transform: isMobile ? "translateX(-50%)" : "none",
    ...(isMobile ? { top: "calc(100% + 8px)" } : { bottom: "calc(100% + 8px)" }),
    background: COLORS.text900,
    color: COLORS.cream50,
    fontFamily: SANS,
    fontSize: 12,
    lineHeight: 1.6,
    padding: "12px 16px",
    borderRadius: 8,
    width: 280,
    maxWidth: "calc(100vw - 40px)",
    zIndex: 10000,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  };
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="More information"
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: Math.max(size, 44), height: Math.max(size, 44), cursor: "help", marginLeft: compact ? -2 : -5 }}
      onMouseEnter={() => !isMobile && setShow(true)}
      onMouseLeave={() => !isMobile && setShow(false)}
      onClick={() => setShow(!show)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShow(!show); } }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: iconSize,
          height: iconSize,
          borderRadius: circle ? "50%" : 0,
          background: circle ? COLORS.green600 : "transparent",
          fontFamily: SANS,
          fontSize: compact ? 12 : 12,
          fontWeight: 700,
          color: circle ? COLORS.cream50 : COLORS.green600,
          lineHeight: 1,
        }}
      >
        {icon}
      </span>
      {show && <div role="tooltip" style={tooltipStyle}>{text}</div>}
    </span>
  );
}

export function MobileContactBar({ contactSettings = {} }) {
  const phoneE164 = contactSettings.phone_e164 || (contactSettings.phone_display || "").replace(/\D/g, "") || "3603184480";
  const displayPhone = contactSettings.phone_display || contactSettings.phone_e164 || "360-318-4480";

  return (
    <div style={{ marginTop: 32, marginBottom: 24 }}>
      <div style={{ height: 1, background: COLORS.border, marginBottom: 16 }} />
      <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.ash, margin: 0 }}>
        Questions or ready to move forward? Text me{" "}
        <a href={`sms:${phoneE164}`} style={{ color: COLORS.ash, textDecoration: "underline" }}>{displayPhone}</a>
      </p>
    </div>
  );
}

export function Accordion({ items }) {
  const [open, setOpen] = useState({});
  const toggle = (k) => setOpen((p) => ({ ...p, [k]: !p[k] }));
  return (
    <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
          <button aria-expanded={!!open[i]} aria-controls={`accordion-panel-${i}`} onClick={() => toggle(i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text900, fontWeight: 500, paddingRight: 16 }}>{item.q}</span>
            <span aria-hidden="true" style={{ fontFamily: SANS, fontSize: 18, color: COLORS.text400, transform: open[i] ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}>+</span>
          </button>
          {open[i] && <div id={`accordion-panel-${i}`} role="region" style={{ padding: "0 22px 18px 22px" }}>{typeof item.a === "string" ? <p style={{ fontFamily: SANS, fontSize: 14, lineHeight: 1.75, color: COLORS.text700, margin: 0 }}>{item.a}</p> : item.a}</div>}
        </div>
      ))}
    </div>
  );
}
