"use client";

import dynamic from "next/dynamic";
import { COLORS, SANS } from "../constants/theme";
import { SectionHeader } from "./Shared";

const DeckViewer = dynamic(() => import("./DeckViewer"), {
  ssr: false,
  loading: () => (
    <div style={{
      fontFamily: SANS,
      fontSize: 14,
      color: COLORS.text500,
      padding: "48px 24px",
      textAlign: "center",
    }}>
      Loading deck…
    </div>
  ),
});

export default function DeckSection({ isMobile, sectionTitle, userEmail }) {
  return (
    <div>
      <SectionHeader title={sectionTitle || "PST Deck"} isMobile={isMobile} />
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
      >
        <DeckViewer isMobile={isMobile} userEmail={userEmail} />
      </div>
    </div>
  );
}
