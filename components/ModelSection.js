"use client";

import { useState } from "react";
import { COLORS, SERIF, SANS } from "../constants/theme";
import { SectionHeader, InfoTooltip, Accordion } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";
import {
  MODEL_DEFAULTS,
  clampInvestment,
  calcSeedOwnership,
  calcSeriesAPostMoney,
  calcNewInvestorDilution,
  calcDilutionFactor,
  calcPostSeriesAOwnership,
  calcNetAfterCarry,
  calcMOIC,
  fmtDollarShort,
  fmtFull,
  fmtPct,
} from "../lib/model/calc";

const STEP_LABEL = { fontFamily: SANS, fontSize: 11, fontWeight: 700, color: COLORS.green600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 };

function fmtShortValue(value) {
  if (!value || value === 0) return "";
  if (value >= 1000000000) {
    const b = value / 1000000000;
    return b % 1 === 0 ? `${b}B` : `${b.toFixed(2).replace(/\.?0+$/, "")}B`;
  }
  if (value >= 1000000) {
    const m = value / 1000000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1).replace(/\.?0+$/, "")}M`;
  }
  if (value >= 1000) {
    const k = value / 1000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1).replace(/\.?0+$/, "")}K`;
  }
  return value.toLocaleString();
}

function mapFaqItemsFromGroups(groups) {
  if (!Array.isArray(groups)) return null;
  const mapped = groups
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .flatMap((group) => (group.items || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((item) => ({
        q: item.question,
        a: <div className="cms-prose-sm" dangerouslySetInnerHTML={{ __html: item.answer || "" }} />,
      })));
  return mapped.length > 0 ? mapped : null;
}

export default function ModelSection({ isMobile, investAmount, setInvestAmount, content, sectionTitle }) {
  const [customExit, setCustomExit] = useState(750000000);
  const [customExitInput, setCustomExitInput] = useState("");
  const [isEditingCustomExit, setIsEditingCustomExit] = useState(false);

  const amt = clampInvestment(investAmount || 50000);
  const seedOwnership = calcSeedOwnership(amt, MODEL_DEFAULTS.safeCap);
  const seriesAPostMoney = calcSeriesAPostMoney(MODEL_DEFAULTS.seriesAPreMoney, MODEL_DEFAULTS.seriesARaise);
  const newInvestorDilution = calcNewInvestorDilution(MODEL_DEFAULTS.seriesARaise, seriesAPostMoney);
  const dilutionFactor = calcDilutionFactor(newInvestorDilution, MODEL_DEFAULTS.optionPool);
  const postSeriesAOwnership = calcPostSeriesAOwnership(seedOwnership, dilutionFactor);

  const parseExitValue = (input) => {
    const cleaned = input.trim().toUpperCase();
    if (cleaned === "" || cleaned === "$") return 0;

    // Parse abbreviated values like "750M", "1.25B", "1.5B", "2B", "500K"
    const match = cleaned.match(/^[$]?(\d*\.?\d+)\s*([BMK]?)$/i);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      const suffix = match[2].toUpperCase();
      if (!isNaN(num) && num > 0) {
        let value = num;
        if (suffix === "B") value = num * 1000000000;
        else if (suffix === "M") value = num * 1000000;
        else if (suffix === "K") value = num * 1000;
        return Math.round(value);
      }
    }
    return 0;
  };

  const handleCustomExitChange = (e) => {
    // Allow typing freely - store raw input
    setCustomExitInput(e.target.value);
  };

  const handleCustomExitFocus = () => {
    setIsEditingCustomExit(true);
    // Show current value in editable format when focusing
    setCustomExitInput(customExit > 0 ? fmtShortValue(customExit) : "");
  };

  const handleCustomExitBlur = () => {
    setIsEditingCustomExit(false);
    const parsed = parseExitValue(customExitInput);
    setCustomExit(parsed);
    setCustomExitInput("");
  };

  const handleInvestChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw === "") { setInvestAmount(0); return; }
    const n = parseInt(raw, 10);
    if (!isNaN(n)) setInvestAmount(n);
  };
  const handleInvestBlur = () => setInvestAmount((prev) => {
    if (!prev) return 50000;
    return Math.max(MODEL_DEFAULTS.minInvestment, prev);
  });

  const phaseScenarios = [{ label: "Conservative", value: 500000000 }, { label: "Target", value: 750000000 }, { label: "Strong", value: 1000000000 }, { label: "Home Run", value: 1250000000 }];
  const earlyScenarios = [{ label: "$75M", value: 75000000 }, { label: "$100M", value: 100000000 }, { label: "$125M", value: 125000000 }];
  const customExitValue = Math.max(0, customExit || 0);
  const customGross = customExitValue * postSeriesAOwnership;
  const customNet = calcNetAfterCarry(customGross, amt);
  const customMoic = calcMOIC(customNet, amt);

  const staticRow = (i, total, rounded) => {
    const base = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: i < total - 1 ? `1px solid ${COLORS.border}` : "none", background: i % 2 === 0 ? COLORS.cream50 : COLORS.white };
    if (rounded) {
      if (i === 0) return { ...base, borderTopLeftRadius: 3, borderTopRightRadius: 3 };
      if (i === total - 1) return { ...base, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 };
    }
    return base;
  };

  // Dilution math
  const newInvestorPct = (newInvestorDilution * 100).toFixed(2);
  const optionPoolPct = MODEL_DEFAULTS.optionPool.toFixed(2);
  const totalDilutionPct = ((newInvestorDilution + MODEL_DEFAULTS.optionPool / 100) * 100).toFixed(2);
  const retentionPct = (dilutionFactor * 100).toFixed(2);
  const seedPctStr = (seedOwnership * 100).toFixed(2);
  const postAPctStr = (postSeriesAOwnership * 100).toFixed(3);
  const hasSeriesADescription = typeof content?.series_a_description === "string" && content.series_a_description.trim().length > 0;
  const hasExitDescription = typeof content?.exit_description === "string" && content.exit_description.trim().length > 0;
  const hasDisclosures = typeof content?.disclosures === "string" && content.disclosures.trim().length > 0;
  const cmsFaqItems = mapFaqItemsFromGroups(content?.faqs);

  return (
    <div>
      <SectionHeader title={sectionTitle || "Scenario Model"} isMobile={isMobile} />

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.cream100, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "10px 14px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
            <path d="M12 3L2 21h20L12 3z" fill={COLORS.green600} />
            <rect x="11" y="9" width="2" height="6" fill={COLORS.cream50} />
            <rect x="11" y="17" width="2" height="2" fill={COLORS.cream50} />
          </svg>
          <div style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700, lineHeight: 1.5, fontStyle: "italic" }}>
            {typeof content?.top_disclaimer === "string" && content.top_disclaimer.trim().length > 0 ? (
              <RichTextRenderer html={content.top_disclaimer} />
            ) : (
              <>
                This model is illustrative and based on company-provided assumptions.{" "}
                <a href="#model-disclosures" style={{ color: COLORS.green700, textDecoration: "underline", fontStyle: "italic" }}>See full disclosures below.</a>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.green700, marginBottom: 6 }}>How much are you considering investing?</div>
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontFamily: SERIF, fontSize: isMobile ? 36 : 44, fontWeight: 600, color: COLORS.text900, lineHeight: 1 }}>$</span>
            <input type="text" inputMode="numeric" value={investAmount === 0 ? "" : investAmount.toLocaleString()} onChange={handleInvestChange} onBlur={handleInvestBlur} placeholder="50,000" aria-label="Investment amount" style={{ fontFamily: SERIF, fontSize: isMobile ? 36 : 44, fontWeight: 600, color: COLORS.text900, background: "transparent", border: "none", outline: "none", width: isMobile ? "100%" : 160, paddingBottom: 4, lineHeight: 1 }} />
          </div>
          <div style={{ width: isMobile ? 150 : 130, height: 2, background: COLORS.fern, marginTop: -2 }} />
        </div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400 }}>Minimum $25,000</div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={STEP_LABEL}>YOUR SEED INVESTMENT</div>
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
          {[{ l: "SAFE Valuation Cap", v: "$25,000,000" }, { l: "Your Investment", v: fmtFull(amt) }, { l: "Your Ownership at Seed", v: fmtPct(seedOwnership), bold: true }].map((r, i) => (
            <div key={i} style={staticRow(i, 3)}><span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700 }}>{r.l}</span><span style={{ fontFamily: SANS, fontSize: 14, color: r.bold ? COLORS.green700 : COLORS.text900, fontWeight: r.bold ? 700 : 600 }}>{r.v}</span></div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={STEP_LABEL}>SERIES A DILUTION</div>
        {hasSeriesADescription ? (
          <RichTextRenderer html={content.series_a_description} style={{ marginBottom: 16 }} />
        ) : (
          <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text700, margin: "0 0 16px 0", lineHeight: 1.7 }}>
            PST plans to raise one additional round, approximately 12–18 months after the seed closes. This priced round will convert all outstanding SAFEs and ownership will be diluted by the Series A investors and employee option pool.
          </p>
        )}

        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
          {/* Section: Series A Assumptions */}
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.cream100 }}>
            <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: COLORS.text400, textTransform: "uppercase", letterSpacing: "0.06em" }}>Series A Assumptions</span>
          </div>
          {[
            { l: "Pre-Money Valuation", v: "$100,000,000" },
            { l: "Series A Raise", v: "$35,000,000" },
            { l: "Post-Money Valuation", v: fmtFull(seriesAPostMoney) },
          ].map((r, i) => (
            <div key={`a-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, background: i % 2 === 0 ? COLORS.cream50 : COLORS.white }}>
              <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700 }}>{r.l}</span>
              <span style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text900, fontWeight: 600 }}>{r.v}</span>
            </div>
          ))}

          {/* Section: Dilution Breakdown */}
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.cream100 }}>
            <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: COLORS.text400, textTransform: "uppercase", letterSpacing: "0.06em" }}>Dilution Breakdown</span>
          </div>
          {[
            { l: "New Series A investors", v: `${newInvestorPct}%` },
            { l: "Employee option pool", v: `${optionPoolPct}%` },
            { l: `Total Dilution (${newInvestorPct}% + ${optionPoolPct}%)`, v: `${totalDilutionPct}%`, summary: true },
          ].map((r, i) => (
            <div key={`d-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, background: i % 2 === 0 ? COLORS.cream50 : COLORS.white }}>
              <span style={{ fontFamily: SANS, fontSize: 13, color: r.summary ? COLORS.text900 : COLORS.text700, fontWeight: r.summary ? 600 : 400 }}>{r.l}</span>
              <span style={{ fontFamily: SANS, fontSize: 14, color: r.summary ? COLORS.green700 : COLORS.text900, fontWeight: r.summary ? 700 : 600 }}>{r.v}</span>
            </div>
          ))}

          {/* Section: Your Ownership */}
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.cream100 }}>
            <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: COLORS.text400, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Ownership</span>
          </div>
          {[
            { l: "Ownership at seed", v: `${seedPctStr}%` },
            { l: "Dilution from Series A", v: `${totalDilutionPct}%` },
            { l: `Ownership after Series A (${seedPctStr}% × ${retentionPct}%)`, v: `${postAPctStr}%`, accent: true },
          ].map((r, i, arr) => (
            <div key={`o-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : "none", background: i % 2 === 0 ? COLORS.cream50 : COLORS.white }}>
              <span style={{ fontFamily: SANS, fontSize: 13, color: r.accent ? COLORS.text900 : COLORS.text700, fontWeight: r.accent ? 600 : 400 }}>{r.l}</span>
              <span style={{ fontFamily: SANS, fontSize: 14, color: r.accent ? COLORS.green700 : COLORS.text900, fontWeight: r.accent ? 700 : 600 }}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={STEP_LABEL}>EXIT SCENARIOS</div>
        {hasExitDescription ? (
          <RichTextRenderer html={content.exit_description} style={{ marginBottom: 16 }} />
        ) : (
          <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text700, margin: "0 0 16px 0", lineHeight: 1.7 }}>
            Following the top line readout of their U.S. Phase I/II clinical trial, PST will pursue a strategic acquisition. The table below shows what your investment could return at different valuation assumptions.
          </p>
        )}

        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {phaseScenarios.map((s) => {
              const gross = s.value * postSeriesAOwnership;
              const net = calcNetAfterCarry(gross, amt);
              const moic = calcMOIC(net, amt);
              return (
                <div key={s.label} style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}`, fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLORS.text900 }}>{s.label}</div>
                  {[
                    { l: "Exit Valuation‡", v: fmtDollarShort(s.value) },
                    { l: "Gross Value", v: fmtFull(gross) },
                    { l: "Net to You*", v: fmtFull(net) },
                    { l: "MOIC", v: `${moic.toFixed(1)}x` },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 20px", borderBottom: i < 3 ? `1px solid ${COLORS.border}` : "none", background: i % 2 === 0 ? COLORS.cream50 : COLORS.white }}>
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700 }}>{row.l}</span>
                      <span style={{ fontFamily: SANS, fontSize: 14, color: COLORS.green700, fontWeight: 600 }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}`, fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLORS.text900 }}>Custom</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 20px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.cream50 }}>
                <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700 }}>Exit Valuation‡</span>
                <span style={{ fontFamily: SANS, fontSize: 14, color: COLORS.green700, fontWeight: 600, display: "inline-flex", alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", borderBottom: `1px solid ${COLORS.green600}`, paddingBottom: 2 }}>
                    <span style={{ marginRight: 2 }}>$</span>
                    <input
                      type="text"
                      inputMode="text"
                      value={isEditingCustomExit ? customExitInput : (customExitValue === 0 ? "" : fmtShortValue(customExitValue))}
                      onChange={handleCustomExitChange}
                      onFocus={handleCustomExitFocus}
                      onBlur={handleCustomExitBlur}
                      placeholder="750M"
                      aria-label="Custom exit valuation"
                      style={{ width: 70, background: "transparent", border: "none", outline: "none", textAlign: "right", fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.green700 }}
                    />
                  </span>
                </span>
              </div>
              {[
                { l: "Gross Value", v: fmtFull(customGross), muted: true },
                { l: "Net to You*", v: fmtFull(customNet) },
                { l: "MOIC", v: `${customMoic.toFixed(1)}x` },
              ].map((row, i) => (
                <div key={row.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 20px", borderBottom: i < 2 ? `1px solid ${COLORS.border}` : "none", background: i % 2 === 0 ? COLORS.white : COLORS.cream50 }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700 }}>{row.l}</span>
                  <span style={{ fontFamily: SANS, fontSize: 14, color: row.muted ? COLORS.text500 : COLORS.green700, fontWeight: row.muted ? 500 : 600 }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden", minWidth: 600 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1.1fr 0.9fr", padding: "14px 20px", borderBottom: `2px solid ${COLORS.border}`, background: COLORS.cream100 }}>
              {["Scenario", "Exit Valuation‡", "Gross Value", "Net to You*", "MOIC"].map((h) => (
                <span key={h} style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: COLORS.text400, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: h === "Scenario" ? "left" : "right" }}>{h}</span>
              ))}
            </div>
            {phaseScenarios.map((s, idx) => {
              const gross = s.value * postSeriesAOwnership;
              const net = calcNetAfterCarry(gross, amt);
              const moic = calcMOIC(net, amt);
              return (
                <div key={s.label} style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1.1fr 0.9fr", padding: "11px 20px", borderBottom: `1px solid ${COLORS.border}`, alignItems: "center", background: idx % 2 === 0 ? COLORS.cream50 : COLORS.white }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900 }}>{s.label}</span>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700, textAlign: "right" }}>{fmtDollarShort(s.value)}</span>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500, textAlign: "right" }}>{fmtFull(gross)}</span>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900, textAlign: "right", fontWeight: 600 }}>{fmtFull(net)}</span>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900, textAlign: "right", fontWeight: 600 }}>{moic.toFixed(1)}x</span>
                </div>
              );
            })}
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr 1.1fr 0.9fr", padding: "11px 20px", borderBottom: `1px solid ${COLORS.border}`, alignItems: "center", background: phaseScenarios.length % 2 === 0 ? COLORS.cream50 : COLORS.white }}>
              <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900 }}>Custom</span>
              <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700, textAlign: "right", display: "inline-flex", justifyContent: "flex-end", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", borderBottom: `1px solid ${COLORS.green600}`, paddingBottom: 2 }}>
                  <span style={{ marginRight: 2 }}>$</span>
                  <input
                    type="text"
                    inputMode="text"
                    value={isEditingCustomExit ? customExitInput : (customExitValue === 0 ? "" : fmtShortValue(customExitValue))}
                    onChange={handleCustomExitChange}
                    onFocus={handleCustomExitFocus}
                    onBlur={handleCustomExitBlur}
                    placeholder="750M"
                    aria-label="Custom exit valuation"
                    style={{ width: 70, background: "transparent", border: "none", outline: "none", textAlign: "right", fontFamily: SANS, fontSize: 13, fontWeight: 600, color: COLORS.text700 }}
                  />
                </span>
              </span>
              <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500, textAlign: "right" }}>{fmtFull(customGross)}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900, textAlign: "right", fontWeight: 600 }}>{fmtFull(customNet)}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900, textAlign: "right", fontWeight: 600 }}>{customMoic.toFixed(1)}x</span>
            </div>
            </div>
          </div>
        )}
        <div style={{ paddingLeft: 20, marginTop: 12 }}>
        <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400, margin: "0 0 4px 0", lineHeight: 1.6 }}>
          ‡Exit valuation ranges based on industry exits for similar therapies 2010–2022. Data available upon request.
        </p>
        <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400, margin: "0 0 4px 0", lineHeight: 1.6 }}>
          *Net to You reflects 20% carry on profits. If the investment does not generate a profit, no carry is charged.
        </p>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ ...STEP_LABEL, marginBottom: 16 }}>ADDITIONAL QUESTIONS</div>
        <Accordion items={cmsFaqItems || [
          {
            q: "What if PST raises additional rounds beyond the Series A?",
            a: "While PST intends for a single round of dilution (the Series A), additional rounds would introduce further dilution. However, the SPV holds pro-rata rights, which means you would have the opportunity to invest in subsequent rounds to maintain your ownership percentage. I will communicate any changes to the financing plan as they develop.",
          },
          {
            q: "What if PST is acquired before the Series A?",
            a: (
              <div>
                <p style={{ fontFamily: SANS, fontSize: 14, lineHeight: 1.7, color: COLORS.text700, margin: "0 0 12px 0" }}>
                  This is not the primary plan, but early acquisition offers do happen in biotech. At your seed ownership of {fmtPct(seedOwnership)}, here&apos;s what your undiluted returns might look like:
                </p>
                <div style={{ background: COLORS.cream50, border: `1px solid ${COLORS.border}`, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "11px 20px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.cream100, fontFamily: SANS, fontSize: 11, fontWeight: 700, color: COLORS.text400, textTransform: "uppercase" }}>
                    <span>Scenario</span><span style={{ textAlign: "right" }}>Exit Valuation</span><span style={{ textAlign: "right" }}>Net to You</span><span style={{ textAlign: "right" }}>MOIC</span>
                  </div>
                  {earlyScenarios.map((s) => {
                    const gross = s.value * seedOwnership;
                    const net = calcNetAfterCarry(gross, amt);
                    const moic = calcMOIC(net, amt);
                    return (
                      <div key={s.label} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "11px 20px", borderBottom: `1px solid ${COLORS.border}`, alignItems: "center" }}>
                        <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700 }}>{s.label}</span>
                        <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700, textAlign: "right" }}>{fmtDollarShort(s.value)}</span>
                        <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900, textAlign: "right", fontWeight: 600 }}>{fmtFull(net)}</span>
                        <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.green700, textAlign: "right", fontWeight: 700 }}>{moic.toFixed(1)}x</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          },
          {
            q: "Are there tax benefits? (QSBS)",
            a: "PST is structured as a Qualified Small Business. Investments may qualify for 50–75% federal capital gains exclusion (3 or 4-year hold) per the One Big Beautiful Bill QSBS changes. This stuff is complicated so please consult your tax advisor.",
          },
        ]} />
      </div>

      <div id="model-disclosures" style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${COLORS.stone}`, paddingBottom: 24 }}>
        <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLORS.text700, marginBottom: 10 }}>Important Disclosures</div>
        {hasDisclosures ? (
          <div
            className="cms-prose-disclosure"
            style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, lineHeight: 1.6, fontStyle: "italic" }}
            dangerouslySetInnerHTML={{ __html: content.disclosures }}
          />
        ) : (
          <>
            <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, margin: "0 0 8px 0", lineHeight: 1.6, fontStyle: "italic" }}>
              This scenario model is provided for illustrative purposes only and is intended to help prospective investors understand the potential mechanics of this investment under various hypothetical outcomes. All figures — including anticipated Series A terms, exit valuations, and return multiples — are hypothetical, forward-looking, and based on assumptions provided by the company that may not materialize. Actual results may differ materially.
            </p>
            <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, margin: "0 0 8px 0", lineHeight: 1.6, fontStyle: "italic" }}>
              Investment in early-stage companies involves a high degree of risk, including the potential for total loss of invested capital. There is no guarantee that PST will raise a Series A, reach clinical milestones, or achieve any exit. Past performance of comparable companies, including Aurion Biotech, is not indicative of future results for PST.
            </p>
            <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, margin: "0 0 8px 0", lineHeight: 1.6, fontStyle: "italic" }}>
              The carry structure, QSBS eligibility, and tax implications described in this data room are subject to change and depend on individual circumstances. Nothing in this data room constitutes investment, legal, or tax advice. Prospective investors should consult their own legal, tax, and financial advisors before making any investment decision.
            </p>
            <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>
              This data room is provided for informational purposes to prospective investors who have been personally invited to review this opportunity. All materials are confidential.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
