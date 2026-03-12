"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { COLORS, SERIF, SANS } from "../constants/theme";
import { NAV_ITEMS } from "../constants/tabs";
import { extractContactSettings } from "../lib/cms/contact";
import useTracker from "../hooks/useTracker";
import AdminTopNav from "./admin/AdminTopNav";

import OverviewSection from "./OverviewSection";
import TermsSection from "./TermsSection";
import ModelSection from "./ModelSection";
import MemoSection from "./MemoSection";
import InterviewSection from "./InterviewSection";
import FAQSection from "./FAQSection";
import ScienceSection from "./ScienceSection";
import CallSection from "./CallSection";
import DeckSection from "./DeckSection";
import { SectionHeader } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";
import CitationsRenderer from "./CitationsRenderer";

function getInitialTab() {
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search).get("tab") || "overview";
  }
  return "overview";
}

function toShortLabel(label) {
  if (!label) return "";
  const normalized = label.trim().toLowerCase();
  if (normalized === "letter from cam" || normalized === "gp letter") return "Letter";
  if (normalized === "call with cam" || normalized === "chat with cam") return "Call";
  return label.length <= 12 ? label : label.split(" ").slice(0, 2).join(" ");
}

const SUPPORTING_DOCUMENT_IDS = new Set(["science", "model", "interview", "biotech"]);
const SUPPORTING_DOCUMENT_LABELS = new Set([
  "science primer",
  "biotech primer",
  "ceo interview",
  "scenario model",
]);

function isSupportingDocument(item) {
  const knownId = (item?.knownTabId || item?.id || "").toLowerCase();
  const label = (item?.navLabel || "").trim().toLowerCase();
  return SUPPORTING_DOCUMENT_IDS.has(knownId) || SUPPORTING_DOCUMENT_LABELS.has(label);
}

const DECK_SECTION = {
  id: "deck",
  knownTabId: "deck",
  section: { title: "Investor Deck" },
  blocks: {},
  navLabel: "Investor Deck",
  shortLabel: "Deck",
};

function injectDeckTab(sections) {
  if (sections.some((s) => s.knownTabId === "deck" || s.id === "deck")) return sections;
  const memoIdx = sections.findIndex((s) => s.knownTabId === "memo");
  const result = [...sections];
  result.splice(memoIdx >= 0 ? memoIdx + 1 : 2, 0, DECK_SECTION);
  return result;
}

function normalizeSections(cmsContent, isMobile) {
  if (Array.isArray(cmsContent?.orderedSections) && cmsContent.orderedSections.length > 0) {
    const sections = isMobile
      ? cmsContent.orderedSections
      : cmsContent.orderedSections.filter((item) => item.knownTabId !== "chat");
    const withLabels = sections.map((item) => ({
      ...item,
      navLabel: item.section?.title || item.id,
      shortLabel: toShortLabel(item.section?.title || item.id),
    }));
    return injectDeckTab(withLabels);
  }

  const base = isMobile ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.id !== "chat");
  return base.map((item) => {
    const section = cmsContent?.[item.id]?.section;
    return {
      id: item.id,
      knownTabId: item.id,
      section,
      blocks: cmsContent?.[item.id]?.blocks || {},
      navLabel: section?.title || item.label,
      shortLabel: toShortLabel(section?.title || item.short),
    };
  });
}

function GenericSection({ isMobile, title, bodyHtml, citations }) {
  return (
    <div>
      <SectionHeader title={title} isMobile={isMobile} />
      <RichTextRenderer html={bodyHtml} />
      <CitationsRenderer citations={citations} />
    </div>
  );
}

function DataRoomClient({ cmsContent = {}, initialTab, isAdmin = false, userEmail }) {
  const contentRef = useRef(null);
  const bottomNavRef = useRef(null);

  const [activeTab, setActiveTab] = useState(() => initialTab ?? getInitialTab());
  const [isMobile, setIsMobile] = useState(false);
  const [visible, setVisible] = useState(true);
  const [investAmount, setInvestAmount] = useState(50000);
  const [hoveredTab, setHoveredTab] = useState(null);

  const contactSettings = useMemo(
    () => {
      const section = Array.isArray(cmsContent?.orderedSections)
        ? cmsContent.orderedSections.find((item) => item.knownTabId === "chat" || item.section?.slug === "contact")
        : null;
      return extractContactSettings(section?.blocks || cmsContent?.chat?.blocks || {});
    },
    [cmsContent]
  );

  const sections = useMemo(() => normalizeSections(cmsContent, isMobile), [cmsContent, isMobile]);
  const desktopPrimarySections = useMemo(
    () => sections.filter((item) => !isSupportingDocument(item)),
    [sections]
  );
  const desktopSupportingSections = useMemo(
    () => sections.filter((item) => isSupportingDocument(item)),
    [sections]
  );
  const validTabs = useMemo(() => new Set(sections.map((item) => item.id)), [sections]);
  const sectionById = useMemo(
    () =>
      sections.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [sections]
  );
  const activeSection = sectionById[activeTab] || sections[0] || null;

  useTracker("pst", activeSection?.knownTabId || activeSection?.section?.slug || activeTab);

  useEffect(() => {
    if (!sections.length) return;
    if (!validTabs.has(activeTab)) {
      const next = sections[0].id;
      setActiveTab(next);
      window.history.replaceState(null, "", `?tab=${next}`);
      return;
    }
    if (!isMobile && activeSection?.knownTabId === "chat") {
      const next = sections[0].id;
      setActiveTab(next);
      window.history.replaceState(null, "", `?tab=${next}`);
    }
  }, [isMobile, activeTab, validTabs, sections, activeSection]);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 839px)");
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const navigate = useCallback((id) => {
    if (id === activeTab) return;
    setVisible(false);
    setTimeout(() => {
      setActiveTab(id);
      window.history.replaceState(null, "", `?tab=${id}`);
      if (contentRef.current) contentRef.current.scrollTop = 0;
      setVisible(true);
    }, 70);
  }, [activeTab]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!bottomNavRef.current) return;
    const activeEl = bottomNavRef.current.querySelector("[data-active='true']");
    if (activeEl) activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    function handleCitationClick(e) {
      const link = e.target.closest('a[href^="#ref-"]');
      if (!link) return;
      e.preventDefault();
      const targetId = link.getAttribute("href").slice(1);
      const target = container.querySelector(`#${CSS.escape(targetId)}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    container.addEventListener("click", handleCitationClick);
    return () => container.removeEventListener("click", handleCitationClick);
  }, []);

  const blockContent = activeSection?.blocks || {};
  const sectionTitle = activeSection?.section?.title;

  const renderSection = () => {
    const props = { isMobile, content: blockContent, sectionTitle };
    switch (activeSection?.knownTabId || activeTab) {
      case "overview": return <OverviewSection {...props} />;
      case "terms": return <TermsSection {...props} />;
      case "model": return <ModelSection {...props} investAmount={investAmount} setInvestAmount={setInvestAmount} />;
      case "memo": return <MemoSection {...props} />;
      case "deck": return <DeckSection {...props} userEmail={userEmail} />;
      case "interview": return <InterviewSection {...props} />;
      case "faq": return <FAQSection {...props} />;
      case "science": return <ScienceSection {...props} />;
      case "chat": return <CallSection isMobile={isMobile} contactSettings={contactSettings} sectionTitle={sectionTitle} />;
      default:
        return (
          <GenericSection
            isMobile={isMobile}
            title={sectionTitle || "Section"}
            bodyHtml={typeof blockContent.body === "string" ? blockContent.body : "<p>Content coming soon.</p>"}
            citations={blockContent.citations}
          />
        );
    }
  };
  const shellHeight = isAdmin ? "calc(100dvh - 56px)" : "100dvh";

  return (
    <div style={{ minHeight: "100dvh", fontFamily: SANS, background: COLORS.cream50 }}>
      {isAdmin && <AdminTopNav />}
      <div style={{ display: "flex", height: shellHeight, overflow: "hidden" }}>
      {isMobile && (
        <div role="tablist" aria-label="Data room sections" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: COLORS.green900, zIndex: 1000, borderTop: "1px solid rgba(240, 237, 230, 0.15)", display: "flex", alignItems: "center", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div ref={bottomNavRef} style={{ display: "flex", gap: 6, padding: "0 12px", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", width: "100%", height: 64, alignItems: "center" }}>
            {sections.map((item) => {
              const isActive = activeTab === item.id;
              const isHovered = hoveredTab === item.id;
              const showHover = !isActive && isHovered;
              return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                data-active={isActive ? "true" : "false"}
                onClick={() => navigate(item.id)}
                onMouseEnter={() => setHoveredTab(item.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  flexShrink: 0,
                  padding: "12px 16px",
                  borderRadius: 3,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? "rgba(240, 237, 230, 0.10)" : showHover ? "rgba(240, 237, 230, 0.08)" : "transparent",
                  color: isActive ? "#ffffff" : showHover ? COLORS.green200 : COLORS.green300,
                  transition: "background 0.15s ease, color 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {item.shortLabel}
              </button>
              );
            })}
          </div>
        </div>
      )}

      {!isMobile && (
        <div style={{ width: 260, minWidth: 260, background: COLORS.green900, display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ padding: "32px 24px 0 24px" }}>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: COLORS.cream50, textTransform: "uppercase", letterSpacing: "0.06em" }}>Waller Street Ventures</div>
          </div>
          <div style={{ width: "calc(100% - 48px)", height: 1, background: "rgba(240, 237, 230, 0.15)", margin: "20px 24px 16px 24px" }} />
          <div style={{ padding: "0 24px", marginBottom: 20 }}>
            <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: COLORS.cream50, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.85, marginBottom: 4 }}>Puget Sound Therapeutics</div>
            <div style={{ fontFamily: SANS, fontSize: 11, color: COLORS.green500, letterSpacing: "0.02em" }}>Seed Round · SPV Data Room</div>
          </div>
          <div style={{ width: "calc(100% - 48px)", height: 1, background: "rgba(240, 237, 230, 0.15)", margin: "0 24px 16px 24px" }} />
          <nav role="tablist" aria-label="Data room sections" style={{ flex: 1, padding: "0 12px" }}>
            {desktopPrimarySections.map((item) => {
              const isActive = activeTab === item.id;
              const isHovered = hoveredTab === item.id;
              const showHover = !isActive && isHovered;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => navigate(item.id)}
                  onMouseEnter={() => setHoveredTab(item.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{ width: "100%", display: "flex", alignItems: "center", padding: "10px 14px", borderRadius: 3, background: isActive ? "rgba(240, 237, 230, 0.10)" : showHover ? "rgba(240, 237, 230, 0.08)" : "transparent", border: "none", cursor: "pointer", marginBottom: 2, transition: "background 0.15s ease" }}
                >
                  <span style={{ fontFamily: SANS, fontSize: 13, color: isActive ? "#ffffff" : showHover ? COLORS.green200 : COLORS.green300, fontWeight: isActive ? 500 : 400 }}>{item.navLabel}</span>
                </button>
              );
            })}
            {desktopSupportingSections.length > 0 && (
              <div style={{ padding: "12px 14px 6px 14px" }}>
                <div style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: COLORS.green500, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Supporting Documents
                </div>
              </div>
            )}
            {desktopSupportingSections.map((item) => {
              const isActive = activeTab === item.id;
              const isHovered = hoveredTab === item.id;
              const showHover = !isActive && isHovered;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => navigate(item.id)}
                  onMouseEnter={() => setHoveredTab(item.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{ width: "100%", display: "flex", alignItems: "center", padding: "10px 14px 10px 26px", borderRadius: 3, background: isActive ? "rgba(240, 237, 230, 0.10)" : showHover ? "rgba(240, 237, 230, 0.08)" : "transparent", border: "none", cursor: "pointer", marginBottom: 2, transition: "background 0.15s ease" }}
                >
                  <span style={{ fontFamily: SANS, fontSize: 13, color: isActive ? "#ffffff" : showHover ? COLORS.green200 : COLORS.green300, fontWeight: isActive ? 500 : 400 }}>{item.navLabel}</span>
                </button>
              );
            })}
          </nav>
          <div style={{ padding: "16px", borderTop: "1px solid rgba(240, 237, 230, 0.15)" }}>
            {contactSettings.schedule_url ? (
              <a href={contactSettings.schedule_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "transparent", color: COLORS.green200, padding: "13px 16px", borderRadius: 3, border: "1px solid rgba(240, 237, 230, 0.25)", fontFamily: SANS, fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center", marginBottom: 10 }}>Schedule a Call</a>
            ) : (
              <div style={{ display: "block", background: "transparent", color: COLORS.green200, padding: "13px 16px", borderRadius: 3, border: "1px solid rgba(240, 237, 230, 0.25)", fontFamily: SANS, fontSize: 13, fontWeight: 600, textAlign: "center", marginBottom: 10, cursor: "not-allowed", opacity: 0.4, pointerEvents: "none" }}>Schedule a Call</div>
            )}
            <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.green300, textAlign: "center" }}>
              Text/call anytime · {contactSettings.phone_e164 ? (
                <a href={`tel:${contactSettings.phone_e164}`} style={{ color: COLORS.green200, textDecoration: "none", fontWeight: 500 }}>{contactSettings.phone_display || contactSettings.phone_e164}</a>
              ) : (
                <span style={{ color: COLORS.green200 }}>{contactSettings.phone_display || "—"}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        ref={contentRef}
        role="tabpanel"
        style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: isMobile ? "48px 20px calc(64px + env(safe-area-inset-bottom, 0px) + 56px) 20px" : "44px 52px", WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease" }}>
            {renderSection()}
          </div>
          {!isMobile && (
            <div style={{ marginTop: 48, paddingTop: 20, borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ fontFamily: SANS, fontSize: 11, color: COLORS.text400 }}>© 2026 Waller Street Ventures · Confidential</div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default DataRoomClient;
