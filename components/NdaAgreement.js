"use client";

import { useState, useRef, useCallback } from "react";
import { COLORS, SERIF, SANS } from "../constants/theme";

export const NDA_PREAMBLE = `By accessing this data room, you ("Recipient") agree to the following terms with Puget Sound Therapeutics, Inc., a Delaware corporation ("Company"):`;

export const NDA_TEXT = [
  {
    heading: "CONFIDENTIAL INFORMATION",
    body: `"Confidential Information" means all materials, documents, data, financial information, projections, business plans, trade secrets, and other information contained in this data room relating to the Company's business, operations, financial condition, technology, intellectual property, customers, suppliers, or strategic plans.`,
  },
  {
    heading: "OBLIGATIONS",
    body: `Recipient agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose any Confidential Information to any third party without the Company's prior written consent; (c) use the Confidential Information solely to evaluate a potential investment in the Company; (d) protect the Confidential Information with at least the same degree of care used to protect Recipient's own confidential information, but no less than reasonable care; (e) limit access to those employees, advisors, or representatives with a need to know who are bound by comparable confidentiality obligations; and (f) not copy, screenshot, download (except where expressly permitted), or share any Confidential Information or data room access credentials with any unauthorized person.`,
  },
  {
    heading: "NON-SOLICITATION AND NON-COMPETITION",
    body: `For a period of twelve (12) months following access to the data room, Recipient agrees not to: (a) directly or indirectly solicit, recruit, or hire any employee, contractor, or consultant of the Company; or (b) use any Confidential Information to develop, market, or sell any product or service that competes with the Company's business.`,
  },
  {
    heading: "NO OBLIGATION OR WARRANTY",
    body: `Nothing herein obligates the Company to proceed with any transaction. Confidential Information is provided "as is" without warranty of any kind as to accuracy or completeness, and the Company shall not be liable for errors, omissions, or actions taken in reliance thereon.`,
  },
  {
    heading: "TERM AND REMEDIES",
    body: `These obligations survive for three (3) years from the date of acceptance, or until the Confidential Information becomes publicly available through no fault of Recipient, whichever is first. Recipient acknowledges that breach may cause irreparable harm and that the Company may seek injunctive relief in addition to any other available remedies.`,
  },
  {
    heading: "GOVERNING LAW",
    body: `This agreement is governed by the laws of the State of Delaware, without regard to conflict of laws principles. Any disputes shall be resolved in the state or federal courts located in Delaware.`,
  },
];

export function getNdaFullText() {
  return `Non-Disclosure Agreement\nPuget Sound Therapeutics, Inc.\n\n${NDA_PREAMBLE}\n\n${NDA_TEXT.map((s, i) => `${i + 1}. ${s.heading}\n${s.body}`).join("\n\n")}`;
}

export default function NdaAgreement({ onAgree, loading }) {
  const scrollRef = useRef(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Use a ref callback to check if content fits without scrolling on mount
  const scrollCallbackRef = useCallback((el) => {
    scrollRef.current = el;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 40) {
      setHasScrolledToBottom(true);
      setShowScrollHint(false);
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom) {
      setHasScrolledToBottom(true);
      setShowScrollHint(false);
    } else {
      // Only show hint if user hasn't reached bottom yet
      setShowScrollHint(!hasScrolledToBottom);
    }
  }, [hasScrolledToBottom]);

  const canAgree = hasScrolledToBottom && checked && signerName.trim().length > 0;

  return (
    <div>
      {/* NDA Document */}
      <div style={{ position: "relative", marginBottom: 24 }}>
        <div
          ref={scrollCallbackRef}
          onScroll={handleScroll}
          style={{
            maxHeight: 380,
            overflowY: "auto",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            padding: "28px 24px",
            background: COLORS.cream50,
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 16,
              fontWeight: 700,
              color: COLORS.green900,
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            Non-Disclosure Agreement
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 11,
              color: COLORS.text400,
              textAlign: "center",
              marginBottom: 24,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Puget Sound Therapeutics, Inc.
          </div>

          <p
            style={{
              fontFamily: SANS,
              fontSize: 13,
              color: COLORS.text700,
              margin: "0 0 20px 0",
              lineHeight: 1.75,
            }}
          >
            {NDA_PREAMBLE}
          </p>

          {NDA_TEXT.map((section, i) => (
            <div key={i} style={{ marginBottom: i < NDA_TEXT.length - 1 ? 20 : 0 }}>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 700,
                  color: COLORS.green700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                {`${i + 1}. ${section.heading}`}
              </div>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  color: COLORS.text700,
                  margin: 0,
                  lineHeight: 1.75,
                }}
              >
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        {showScrollHint && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 56,
              background: `linear-gradient(transparent, ${COLORS.cream50})`,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: 8,
              pointerEvents: "none",
              borderRadius: "0 0 3px 3px",
            }}
          >
            <div
              style={{
                fontFamily: SANS,
                fontSize: 11,
                color: COLORS.text400,
                display: "flex",
                alignItems: "center",
                gap: 4,
                animation: "ndaPulse 2s ease-in-out infinite",
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>&#8595;</span>
              Scroll to read full agreement
            </div>
          </div>
        )}
      </div>

      {/* Agreement checkbox */}
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          cursor: hasScrolledToBottom ? "pointer" : "not-allowed",
          opacity: hasScrolledToBottom ? 1 : 0.45,
          marginBottom: 20,
          padding: "4px 0",
          transition: "opacity 0.3s ease",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => hasScrolledToBottom && setChecked(e.target.checked)}
          disabled={!hasScrolledToBottom}
          style={{
            width: 18,
            height: 18,
            marginTop: 1,
            accentColor: COLORS.green700,
            cursor: hasScrolledToBottom ? "pointer" : "not-allowed",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: SANS,
            fontSize: 13,
            color: COLORS.text700,
            lineHeight: 1.5,
          }}
        >
          I have read and agree to the terms of this Non-Disclosure Agreement
          with Puget Sound Therapeutics, Inc. I consent to signing this agreement
          electronically.
        </span>
      </label>

      {/* Full name input */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontFamily: SANS,
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.text500,
            marginBottom: 6,
          }}
        >
          Full Legal Name
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Enter your full name"
          disabled={!hasScrolledToBottom || !checked}
          style={{
            width: "100%",
            padding: "12px 14px",
            fontFamily: SANS,
            fontSize: 14,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            boxSizing: "border-box",
            opacity: hasScrolledToBottom && checked ? 1 : 0.45,
            transition: "opacity 0.3s ease",
          }}
        />
      </div>

      {/* Hint text when not yet scrolled */}
      {!hasScrolledToBottom && (
        <p
          style={{
            fontFamily: SANS,
            fontSize: 12,
            color: COLORS.text400,
            textAlign: "center",
            margin: "0 0 16px 0",
            fontStyle: "italic",
          }}
        >
          Please scroll through the entire agreement to continue
        </p>
      )}

      {/* Agree button */}
      <button
        type="button"
        onClick={() => canAgree && !loading && onAgree({ signerName: signerName.trim() })}
        disabled={!canAgree || loading}
        style={{
          width: "100%",
          padding: "14px 20px",
          fontFamily: SERIF,
          fontSize: 16,
          fontWeight: 600,
          color: COLORS.white,
          background: canAgree && !loading ? COLORS.green800 : COLORS.gray200,
          border: "none",
          borderRadius: 3,
          cursor: canAgree && !loading ? "pointer" : "not-allowed",
          transition: "background 0.2s ease, transform 0.1s ease",
        }}
      >
        {loading ? "Processing..." : "I Agree & Continue"}
      </button>

      {/* Pulse animation */}
      <style>{`
        @keyframes ndaPulse {
          0%, 100% { opacity: 0.6; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(3px); }
        }
      `}</style>
    </div>
  );
}
