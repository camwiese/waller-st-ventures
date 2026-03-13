"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { COLORS, SERIF, SANS } from "../../constants/theme";

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// --- Shared styles ---

const th = {
  fontFamily: SANS, fontSize: 11, fontWeight: 700, color: COLORS.text400,
  textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left",
  padding: "12px 16px", borderBottom: `2px solid ${COLORS.border}`, cursor: "pointer",
  userSelect: "none",
};

const td = {
  fontFamily: SANS, fontSize: 14, color: COLORS.text700,
  padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`,
};

const btnBase = {
  fontFamily: SANS, fontWeight: 600, border: "none", borderRadius: 6,
  cursor: "pointer", transition: "background 0.15s ease",
};

const btnPrimary = (loading) => ({
  ...btnBase,
  fontSize: 14, padding: "12px 20px", minHeight: 44,
  color: COLORS.white, background: loading ? COLORS.green600 : COLORS.green800,
  cursor: loading ? "not-allowed" : "pointer",
});

const btnSmall = (loading) => ({
  ...btnBase,
  fontSize: 12, padding: "8px 14px", minHeight: 44,
  color: COLORS.white, background: loading ? COLORS.green600 : COLORS.green800,
  cursor: loading ? "not-allowed" : "pointer",
});

const btnDanger = (loading) => ({
  ...btnBase,
  fontSize: 12, padding: "8px 14px", minHeight: 44,
  color: COLORS.white, background: loading ? COLORS.text400 : COLORS.error,
  cursor: loading ? "not-allowed" : "pointer",
});

const btnOutline = {
  ...btnBase,
  fontSize: 14, padding: "10px 16px", minHeight: 44,
  color: COLORS.text700, background: "transparent",
  border: `1px solid ${COLORS.border}`,
};

const iconButtonBase = {
  ...btnBase,
  width: 36,
  height: 36,
  minHeight: 36,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: `1px solid ${COLORS.border}`,
  background: COLORS.white,
  color: COLORS.text500,
};

const cardStyle = {
  background: COLORS.white, border: `1px solid ${COLORS.border}`,
  borderRadius: 10, padding: 16, marginBottom: 10,
};

const sectionLabel = {
  fontFamily: SANS, fontSize: 11, fontWeight: 700, color: COLORS.text400,
  textTransform: "uppercase", letterSpacing: "0.05em",
};

const inputStyle = {
  width: "100%", padding: "12px 14px", fontFamily: SANS, fontSize: 16,
  border: `1px solid ${COLORS.border}`, borderRadius: 6, boxSizing: "border-box",
};

const fieldLabel = {
  display: "block", fontFamily: SANS, fontSize: 12, fontWeight: 600,
  color: COLORS.text500, marginBottom: 4,
};

// --- Shared small components ---

function IntentBadge({ score, heatingUp }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        display: "inline-block", padding: "3px 10px", borderRadius: 12,
        fontWeight: 700, fontSize: 13,
        background: score >= 50 ? COLORS.green100 : score >= 20 ? COLORS.cream200 : COLORS.gray100,
        color: score >= 50 ? COLORS.green800 : COLORS.text700,
      }}>{score}</span>
      {heatingUp && (
        <span style={{
          display: "inline-block", padding: "2px 8px", borderRadius: 10,
          fontWeight: 600, fontSize: 11, background: COLORS.green200, color: COLORS.green800,
        }}>Heating up</span>
      )}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    sent: { bg: COLORS.green100, color: COLORS.green800 },
    rate_limited: { bg: COLORS.cream200, color: COLORS.text700 },
    error: { bg: COLORS.errorLight, color: COLORS.error },
    delivered: { bg: COLORS.green100, color: COLORS.green800 },
    bounced: { bg: COLORS.errorLight, color: COLORS.error },
    complained: { bg: COLORS.errorLight, color: COLORS.error },
    pending: { bg: COLORS.cream200, color: COLORS.text700 },
    approved: { bg: COLORS.green100, color: COLORS.green800 },
    denied: { bg: COLORS.errorLight, color: COLORS.error },
    active: { bg: COLORS.green100, color: COLORS.green800 },
    pending_login: { bg: COLORS.gray100, color: COLORS.text500 },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{
      display: "inline-flex", padding: "3px 10px", borderRadius: 12,
      fontWeight: 600, fontSize: 12, background: s.bg, color: s.color,
      whiteSpace: "nowrap", lineHeight: 1.2,
    }}>
      {status === "active" ? "Active" : status === "pending_login" ? "Pending login" : status.replace(/_/g, " ")}
    </span>
  );
}

function BarChart({ seconds, maxSeconds }) {
  const pct = maxSeconds > 0 ? (seconds / maxSeconds) * 100 : 0;
  return (
    <div style={{ flex: 1, height: 8, background: COLORS.border, borderRadius: 4, overflow: "hidden", margin: "0 12px" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: COLORS.green600, borderRadius: 4 }} />
    </div>
  );
}

function formatRequestDate(dateStr) {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function upsertContactRows(existingRows, patch) {
  const rows = Array.isArray(existingRows) ? [...existingRows] : [];
  for (const [label, value] of Object.entries(patch)) {
    const idx = rows.findIndex((row) => row?.label === label);
    const nextRow = { ...(idx >= 0 ? rows[idx] : {}), label, value };
    if (idx >= 0) rows[idx] = nextRow;
    else rows.push(nextRow);
  }
  return rows;
}

function readContactValue(rows, label) {
  const row = Array.isArray(rows) ? rows.find((item) => item?.label === label) : null;
  return typeof row?.value === "string" ? row.value : "";
}

function EmptyState({ title, description }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: COLORS.text900, marginBottom: 8 }}>{title}</div>
      {description && <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text500, margin: 0 }}>{description}</p>}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="7" y="3" width="10" height="12" rx="2" />
      <path d="M5 7H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

function CopyLinkButton({ copied, disabled = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={copied ? "Invite link copied" : "Copy invite link"}
      title={copied ? "Invite link copied" : "Copy invite link"}
      style={{
        ...iconButtonBase,
        color: copied ? COLORS.green800 : COLORS.text500,
        borderColor: copied ? COLORS.green300 : COLORS.border,
        background: copied ? COLORS.green100 : COLORS.white,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <CopyIcon />
    </button>
  );
}

function ShareLinkButton({ type, copied, loading, onClick }) {
  const isPodcast = type === "podcast";
  const label = isPodcast ? "Copy podcast share link" : "Copy deck share link";
  const copiedLabel = isPodcast ? "Podcast link copied" : "Deck link copied";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      style={{
        ...iconButtonBase,
        color: copied ? COLORS.green800 : loading ? COLORS.text400 : COLORS.text500,
        borderColor: copied ? COLORS.green300 : COLORS.border,
        background: copied ? COLORS.green100 : COLORS.white,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {isPodcast ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      )}
    </button>
  );
}

function SummaryCard({ value, label }) {
  return (
    <div style={{ flex: 1, minWidth: 140, background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 3, padding: "18px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, color: COLORS.green900, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

// --- Mobile Investor Card ---

function InvestorCard({ inv, isOpen, onToggle, onRevoke, revoking }) {
  const maxTabSeconds = inv.tabs.length > 0 ? inv.tabs[0].seconds : 1;
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", padding: 16, cursor: "pointer", background: isOpen ? COLORS.cream50 : COLORS.white,
          border: "none", textAlign: "left", transition: "background 0.1s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.text900, wordBreak: "break-all", flex: 1, marginRight: 8 }}>
            {inv.email}
            {inv.shareOnly && (
              <span style={{ display: "inline-block", marginLeft: 6, padding: "2px 6px", borderRadius: 8, fontWeight: 600, fontSize: 10, background: COLORS.cream200, color: COLORS.text500, verticalAlign: "middle" }}>Share only</span>
            )}
          </span>
          <IntentBadge score={inv.intentScore} heatingUp={inv.heatingUp} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <MetricPill label="Visits" value={inv.visits} />
          <MetricPill label="Time" value={inv.timeSpent} />
          <MetricPill label="Last" value={inv.lastActive} />
        </div>
        {(inv.invitedByName || inv.invitedByEmail) && (
          <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400, marginTop: 6 }}>
            Invited by {inv.invitedByName || inv.invitedByEmail}
          </div>
        )}
        <div style={{ fontFamily: SANS, fontSize: 13, color: inv.intentScore >= 50 ? COLORS.green700 : COLORS.text500, marginTop: 8 }}>
          {inv.suggestedNextStep}
        </div>
      </button>
      {isOpen && (
        <div style={{ padding: "0 16px 16px", background: COLORS.cream50, borderTop: `1px solid ${COLORS.border}` }}>
          {inv.shareEngagement && (
            <>
              <div style={{ ...sectionLabel, marginTop: 14, marginBottom: 10 }}>Share link activity</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                {inv.shareEngagement.deck && (
                  <>
                    <MetricPill label="Deck views" value={inv.shareEngagement.deck.sessions} />
                    <MetricPill label="Deck time" value={inv.shareEngagement.deck.totalViewTime} />
                  </>
                )}
                {inv.shareEngagement.podcast && (
                  <>
                    <MetricPill label="Podcast" value={`${inv.shareEngagement.podcast.percentWatched}%`} />
                    <MetricPill label="Play time" value={inv.shareEngagement.podcast.totalPlayTime} />
                  </>
                )}
              </div>
            </>
          )}
          {inv.tabs.length > 0 && (
            <>
              <div style={{ ...sectionLabel, marginTop: 14, marginBottom: 10 }}>Tab breakdown</div>
              {inv.tabs.map(tab => (
                <div key={tab.tabId} style={{ display: "flex", alignItems: "center", padding: "5px 0" }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700, width: 100, flexShrink: 0 }}>{tab.label}</span>
                  <BarChart seconds={tab.seconds} maxSeconds={maxTabSeconds} />
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900, fontWeight: 600, width: 60, textAlign: "right", flexShrink: 0 }}>{tab.time}</span>
                </div>
              ))}
            </>
          )}
          {inv.videoEngagement && (
            <>
              <div style={{ ...sectionLabel, marginTop: 16, marginBottom: 10 }}>Video engagement</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <MetricPill label="Play time" value={inv.videoEngagement.totalPlayTime} />
                <MetricPill label="Watched" value={`${inv.videoEngagement.percentWatched}%`} />
                <MetricPill label="Sessions" value={inv.videoEngagement.sessions} />
              </div>
            </>
          )}
          {inv.sessions.length > 0 && (
            <>
              <div style={{ ...sectionLabel, marginTop: 16, marginBottom: 10 }}>Visit timeline</div>
              {inv.sessions.slice(0, 5).map((session, si) => (
                <div key={si} style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: COLORS.text900 }}>{session.date}</div>
                  <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, marginTop: 2 }}>
                    {session.totalTime} viewed
                  </div>
                </div>
              ))}
            </>
          )}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 14, marginTop: 12 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onRevoke(inv.email); }}
              disabled={revoking === inv.email}
              style={{
                ...btnBase, fontSize: 12, padding: "8px 14px", minHeight: 44,
                color: revoking === inv.email ? COLORS.text400 : COLORS.error,
                background: "transparent",
                border: `1px solid ${revoking === inv.email ? COLORS.border : COLORS.error}`,
              }}
            >
              {revoking === inv.email ? "Revoking..." : "Revoke access"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricPill({ label, value }) {
  return (
    <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500 }}>
      <span style={{ color: COLORS.text400 }}>{label}</span>{" "}
      <span style={{ fontWeight: 600, color: COLORS.text700 }}>{value}</span>
    </span>
  );
}

// --- Desktop Investor Row (preserved from original) ---

function InvestorRow({ inv, isOpen, onToggle, onRevoke, revoking }) {
  const maxTabSeconds = inv.tabs.length > 0 ? inv.tabs[0].seconds : 1;
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: "pointer", background: isOpen ? COLORS.cream50 : COLORS.white, transition: "background 0.1s ease" }}>
        <td style={td}>
          <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text400, marginRight: 8 }}>{isOpen ? "\u25BE" : "\u25B8"}</span>
          <span style={{ fontWeight: 600, color: COLORS.text900 }}>{inv.email}</span>
          {inv.shareOnly && (
            <span style={{ display: "inline-block", marginLeft: 8, padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontSize: 11, background: COLORS.cream200, color: COLORS.text500 }}>Share only</span>
          )}
        </td>
        <td style={{ ...td, fontSize: 13, color: COLORS.text500 }}>
          {inv.invitedByName || inv.invitedByEmail || "\u2014"}
        </td>
        <td style={{ ...td, textAlign: "right" }}>{inv.visits}</td>
        <td style={{ ...td, textAlign: "right" }}>{inv.timeSpent}</td>
        <td style={{ ...td, textAlign: "right" }}>{inv.lastActive}</td>
        <td style={{ ...td, textAlign: "right" }}>
          <IntentBadge score={inv.intentScore} heatingUp={inv.heatingUp} />
        </td>
        <td style={{ ...td, fontSize: 13, color: inv.intentScore >= 50 ? COLORS.green700 : COLORS.text500 }}>
          {inv.suggestedNextStep}
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={7} style={{ padding: "16px 20px 20px 20px", background: COLORS.cream50, borderBottom: `1px solid ${COLORS.border}` }}>
            {inv.shareEngagement && (
              <>
                <div style={{ ...sectionLabel, marginBottom: 12 }}>Share Link Activity</div>
                <div style={{ display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
                  {inv.shareEngagement.deck && (
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLORS.text500, textTransform: "uppercase", letterSpacing: "0.04em" }}>Deck</span>
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500 }}>
                        <span style={{ color: COLORS.text400 }}>Views</span>{" "}
                        <span style={{ fontWeight: 600, color: COLORS.text700 }}>{inv.shareEngagement.deck.sessions}</span>
                      </span>
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500 }}>
                        <span style={{ color: COLORS.text400 }}>Time</span>{" "}
                        <span style={{ fontWeight: 600, color: COLORS.text700 }}>{inv.shareEngagement.deck.totalViewTime}</span>
                      </span>
                      {inv.shareEngagement.deck.lastViewedAt && (
                        <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400 }}>
                          Last: {new Date(inv.shareEngagement.deck.lastViewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  )}
                  {inv.shareEngagement.podcast && (
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLORS.text500, textTransform: "uppercase", letterSpacing: "0.04em" }}>Podcast</span>
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500 }}>
                        <span style={{ color: COLORS.text400 }}>Sessions</span>{" "}
                        <span style={{ fontWeight: 600, color: COLORS.text700 }}>{inv.shareEngagement.podcast.sessions}</span>
                      </span>
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500 }}>
                        <span style={{ color: COLORS.text400 }}>Play time</span>{" "}
                        <span style={{ fontWeight: 600, color: COLORS.text700 }}>{inv.shareEngagement.podcast.totalPlayTime}</span>
                      </span>
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500 }}>
                        <span style={{ color: COLORS.text400 }}>Listened</span>{" "}
                        <span style={{ fontWeight: 600, color: COLORS.text700 }}>{inv.shareEngagement.podcast.percentWatched}%</span>
                      </span>
                      {inv.shareEngagement.podcast.lastViewedAt && (
                        <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400 }}>
                          Last: {new Date(inv.shareEngagement.podcast.lastViewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {inv.tabs.length > 0 && (
              <>
                <div style={{ ...sectionLabel, marginBottom: 12 }}>Tab Breakdown</div>
                <div style={{ marginBottom: 24 }}>
                  {inv.tabs.map(tab => (
                    <div key={tab.tabId} style={{ display: "flex", alignItems: "center", padding: "6px 0" }}>
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700, width: 140, flexShrink: 0 }}>{tab.label}</span>
                      <BarChart seconds={tab.seconds} maxSeconds={maxTabSeconds} />
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900, fontWeight: 600, width: 70, textAlign: "right", flexShrink: 0 }}>{tab.time}</span>
                      {tab.weight > 1 && (
                        <span style={{ fontFamily: SANS, fontSize: 11, color: COLORS.green700, fontWeight: 600, marginLeft: 8, flexShrink: 0 }}>({tab.weight}x)</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {inv.videoEngagement && (
              <>
                <div style={{ ...sectionLabel, marginBottom: 12 }}>Video Engagement</div>
                <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500 }}>
                    <span style={{ color: COLORS.text400 }}>Play time</span>{" "}
                    <span style={{ fontWeight: 600, color: COLORS.text700 }}>{inv.videoEngagement.totalPlayTime}</span>
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500 }}>
                    <span style={{ color: COLORS.text400 }}>Watched</span>{" "}
                    <span style={{ fontWeight: 600, color: COLORS.text700 }}>{inv.videoEngagement.percentWatched}%</span>
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500 }}>
                    <span style={{ color: COLORS.text400 }}>Sessions</span>{" "}
                    <span style={{ fontWeight: 600, color: COLORS.text700 }}>{inv.videoEngagement.sessions}</span>
                  </span>
                </div>
              </>
            )}
            {inv.sessions.length > 0 && (
              <>
                <div style={{ ...sectionLabel, marginBottom: 12 }}>Visit Timeline</div>
                <div style={{ marginBottom: 20 }}>
                  {inv.sessions.map((session, si) => (
                    <div key={si} style={{ marginBottom: 12, paddingLeft: 4 }}>
                      <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: COLORS.text900 }}>{session.date}</span>
                      <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, marginLeft: 8 }}>
                        {"\u2014 "}{session.totalTime} viewed
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
              <button
                onClick={(e) => { e.stopPropagation(); onRevoke(inv.email); }}
                disabled={revoking === inv.email}
                style={{
                  ...btnBase, fontSize: 12, padding: "4px 12px",
                  color: revoking === inv.email ? COLORS.text400 : COLORS.error,
                  background: "transparent",
                  border: `1px solid ${revoking === inv.email ? COLORS.border : COLORS.error}`,
                }}
              >
                {revoking === inv.email ? "Revoking..." : "Revoke"}
              </button>
              <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400, marginLeft: 12 }}>Revokes access (analytics kept for reporting)</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// --- Mobile Request Card ---

function RequestCardMobile({ request, onApprove, onDeny, onCopyLink, approving, copiedEmail, onCopyShareLink, copiedShareEmail, generatingShareLink }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.text900, wordBreak: "break-all", marginBottom: 8 }}>{request.email}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500 }}>{formatRequestDate(request.requested_at)}</span>
        <StatusBadge status={request.status} />
      </div>
      {request.status === "pending" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onApprove(request.email)} disabled={approving === request.email} style={{ ...btnSmall(approving === request.email), flex: 1 }}>
            Approve
          </button>
          <button onClick={() => onDeny(request.email)} disabled={approving === request.email} style={{ ...btnDanger(approving === request.email), flex: 1 }}>
            Deny
          </button>
        </div>
      )}
      {request.status === "approved" && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <CopyLinkButton
            copied={copiedEmail === request.email}
            onClick={() => onCopyLink(request.email)}
          />
          <ShareLinkButton type="podcast" copied={copiedShareEmail === `podcast:${request.email}`} loading={generatingShareLink === `podcast:${request.email}`} onClick={() => onCopyShareLink(request.email, "podcast")} />
          <ShareLinkButton type="deck" copied={copiedShareEmail === `deck:${request.email}`} loading={generatingShareLink === `deck:${request.email}`} onClick={() => onCopyShareLink(request.email, "deck")} />
        </div>
      )}
    </div>
  );
}

// --- Mobile Invite Card ---

function InviteCardMobile({ item, onCopyLink, copiedEmail, onToggleNda, togglingNda, onCopyShareLink, copiedShareEmail, generatingShareLink }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.text900, wordBreak: "break-all", flex: 1, marginRight: 8 }}>{item.email}</span>
        <StatusBadge status={item.status} />
      </div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, marginBottom: 10 }}>
        {item.invited_at ? formatRequestDate(item.invited_at) : "Direct invite"}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <CopyLinkButton
          copied={copiedEmail === item.email}
          onClick={() => onCopyLink(item.email)}
        />
        <ShareLinkButton type="podcast" copied={copiedShareEmail === `podcast:${item.email}`} loading={generatingShareLink === `podcast:${item.email}`} onClick={() => onCopyShareLink(item.email, "podcast")} />
        <ShareLinkButton type="deck" copied={copiedShareEmail === `deck:${item.email}`} loading={generatingShareLink === `deck:${item.email}`} onClick={() => onCopyShareLink(item.email, "deck")} />
        <button
          type="button"
          onClick={() => onToggleNda(item.email, item.nda_required === false)}
          disabled={togglingNda === item.email}
          style={{
            ...btnBase,
            fontSize: 12, padding: "8px 14px",
            color: item.nda_required === false ? COLORS.text500 : COLORS.green800,
            background: item.nda_required === false ? COLORS.gray100 : COLORS.green100,
            border: `1px solid ${item.nda_required === false ? COLORS.border : COLORS.green300}`,
            opacity: togglingNda === item.email ? 0.6 : 1,
          }}
        >
          NDA {item.nda_required === false ? "Off" : "On"}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Main Component
// ==========================================

export default function AnalyticsTable({
  summary,
  investors,
  totalInvestors,
  allowedEmails = [],
  accessRequestsNew = [],
  notificationRecipients = [],
  initialShareTokens = [],
  actionGroups = { activeNow: [], followUpNow: [], heatingUpList: [], staleHighIntent: [] },
  adminContext = null,
}) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState({});
  const [view, setView] = useState("investors");
  const [sortKey, setSortKey] = useState("intentScore");
  const [sortDir, setSortDir] = useState("desc");
  const [revoking, setRevoking] = useState(null);
  const [revoked, setRevoked] = useState(new Set());
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNotify, setInviteNotify] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [inviteStatus, setInviteStatus] = useState("idle");
  const [inviteError, setInviteError] = useState(null);
  const [reminding, setReminding] = useState(null);
  const [approving, setApproving] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [recipientStatus, setRecipientStatus] = useState("idle");
  const [recipientError, setRecipientError] = useState(null);
  const [removingRecipient, setRemovingRecipient] = useState(null);
  const [allowedEmailsState, setAllowedEmailsState] = useState(allowedEmails);
  const [accessRequestsState, setAccessRequestsState] = useState(accessRequestsNew);
  const [notificationRecipientsState, setNotificationRecipientsState] =
    useState(notificationRecipients);
  const [accessDataLoaded, setAccessDataLoaded] = useState(
    allowedEmails.length > 0 || accessRequestsNew.length > 0 || notificationRecipients.length > 0
  );
  const [accessDataLoading, setAccessDataLoading] = useState(false);
  const [accessDataError, setAccessDataError] = useState(null);
  const [partners, setPartners] = useState([]);
  const [partnersLoaded, setPartnersLoaded] = useState(false);
  const [newPartnerEmail, setNewPartnerEmail] = useState("");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [partnerAddStatus, setPartnerAddStatus] = useState("idle");
  const [partnerError, setPartnerError] = useState(null);
  const [removingPartner, setRemovingPartner] = useState(null);
  const [notifyPref, setNotifyPref] = useState(adminContext?.partner?.notify_on_own_invites ?? true);
  const [notifyPrefSaving, setNotifyPrefSaving] = useState(false);
  const [togglingContentEdit, setTogglingContentEdit] = useState(null);
  const [togglingNda, setTogglingNda] = useState(null);
  const [ndaAuditLog, setNdaAuditLog] = useState([]);
  const [ndaAuditLoaded, setNdaAuditLoaded] = useState(false);
  const [ndaAuditLoading, setNdaAuditLoading] = useState(false);
  const [generatingShareLink, setGeneratingShareLink] = useState(null);
  const [copiedShareEmail, setCopiedShareEmail] = useState(null);
  const [shareTokens, setShareTokens] = useState(initialShareTokens);
  const [shareTokensLoaded, setShareTokensLoaded] = useState(initialShareTokens.length > 0);
  const [togglingShareToken, setTogglingShareToken] = useState(null);

  const toggle = (email) => setExpanded(prev => ({ ...prev, [email]: !prev[email] }));

  useEffect(() => {
    if (!approveModal) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setApproveModal(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [approveModal]);

  const fetchAccessSnapshot = useCallback(async () => {
    if (accessDataLoading) return;
    setAccessDataLoading(true);
    setAccessDataError(null);
    try {
      const res = await fetch("/api/admin/access-snapshot");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAccessDataError(data.error || "Failed to load access data");
        return;
      }
      setAllowedEmailsState(data.allowedEmails || []);
      setAccessRequestsState(data.accessRequests || []);
      setNotificationRecipientsState(data.notificationRecipients || []);
      if (data.shareTokens) {
        setShareTokens(data.shareTokens);
        setShareTokensLoaded(true);
      }
      setAccessDataLoaded(true);
    } catch {
      setAccessDataError("Network error");
    } finally {
      setAccessDataLoading(false);
    }
  }, [accessDataLoading]);

  useEffect(() => {
    if ((view === "access" || view === "settings") && !accessDataLoaded) {
      fetchAccessSnapshot();
    }
    if (view === "access" && !shareTokensLoaded) {
      fetchShareTokens();
    }
  }, [view, accessDataLoaded, fetchAccessSnapshot, shareTokensLoaded]);

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/partners");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPartners(data.partners || []);
        setPartnersLoaded(true);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (view === "settings" && !partnersLoaded) {
      fetchPartners();
    }
  }, [view, partnersLoaded, fetchPartners]);

  const handleAddPartner = async (e) => {
    e.preventDefault();
    const email = newPartnerEmail.trim();
    if (!email || !email.includes("@")) { setPartnerError("Valid email is required"); return; }
    setPartnerError(null);
    setPartnerAddStatus("loading");
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: newPartnerName.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNewPartnerEmail("");
        setNewPartnerName("");
        setPartnerAddStatus("idle");
        if (data.partner) {
          setPartners((prev) => [...prev, data.partner]);
        }
        toast.success(`${email} added as partner admin`);
      } else {
        setPartnerError(data.error || "Failed to add partner");
        setPartnerAddStatus("idle");
        toast.error(data.error || "Failed to add partner");
      }
    } catch {
      setPartnerError("Network error");
      setPartnerAddStatus("idle");
      toast.error("Network error");
    }
  };

  const handleRemovePartner = async (email) => {
    if (!confirm(`Remove ${email} as a partner admin? They will lose admin access.`)) return;
    setRemovingPartner(email);
    try {
      const res = await fetch(`/api/admin/partners?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      if (res.ok) {
        setPartners((prev) => prev.filter((p) => p.email !== email));
        toast.success(`${email} removed as partner admin`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to remove partner");
      }
    } catch {
      toast.error("Network error");
    }
    setRemovingPartner(null);
  };

  const handleToggleNotifyPref = async (checked) => {
    setNotifyPref(checked);
    setNotifyPrefSaving(true);
    try {
      const res = await fetch("/api/admin/partners/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyOnOwnInvites: checked }),
      });
      if (res.ok) {
        toast.success(checked ? "Notifications enabled" : "Notifications disabled");
      } else {
        setNotifyPref(!checked);
        toast.error("Failed to update preference");
      }
    } catch {
      setNotifyPref(!checked);
      toast.error("Network error");
    }
    setNotifyPrefSaving(false);
  };

  const handleToggleContentEdit = async (partnerEmail, checked) => {
    setTogglingContentEdit(partnerEmail);
    // Optimistic update
    setPartners((prev) => prev.map((p) => p.email === partnerEmail ? { ...p, can_edit_content: checked } : p));
    try {
      const res = await fetch("/api/admin/partners/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerEmail, canEditContent: checked }),
      });
      if (res.ok) {
        toast.success(checked ? "Content editing enabled" : "Content editing disabled");
      } else {
        setPartners((prev) => prev.map((p) => p.email === partnerEmail ? { ...p, can_edit_content: !checked } : p));
        toast.error("Failed to update permission");
      }
    } catch {
      setPartners((prev) => prev.map((p) => p.email === partnerEmail ? { ...p, can_edit_content: !checked } : p));
      toast.error("Network error");
    }
    setTogglingContentEdit(null);
  };

  const handleToggleNda = useCallback(async (email, newValue) => {
    setTogglingNda(email);
    try {
      const res = await fetch("/api/admin/nda-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nda_required: newValue }),
      });
      if (res.ok) {
        setAllowedEmailsState((prev) =>
          prev.map((a) => a.email?.toLowerCase() === email.toLowerCase() ? { ...a, nda_required: newValue } : a)
        );
        toast.success(`NDA ${newValue ? "required" : "not required"} for ${email}`);
      } else {
        toast.error("Failed to update NDA setting");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setTogglingNda(null);
    }
  }, []);

  const fetchNdaAuditLog = useCallback(async () => {
    setNdaAuditLoading(true);
    try {
      const res = await fetch("/api/admin/nda-audit");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNdaAuditLog(data.agreements || []);
        setNdaAuditLoaded(true);
      }
    } catch { /* ignore */ } finally {
      setNdaAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "settings" && !ndaAuditLoaded) {
      fetchNdaAuditLog();
    }
  }, [view, ndaAuditLoaded, fetchNdaAuditLog]);

  const handleAddRecipient = async (e) => {
    e.preventDefault();
    const email = newRecipientEmail.trim();
    if (!email || !email.includes("@")) { setRecipientError("Valid email is required"); return; }
    setRecipientError(null);
    setRecipientStatus("loading");
    try {
      const res = await fetch("/api/admin/notification-recipients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNewRecipientEmail("");
        setRecipientStatus("idle");
        if (data.recipient) {
          setNotificationRecipientsState((prev) => {
            if (prev.some((recipient) => recipient.id === data.recipient.id)) return prev;
            return [...prev, data.recipient];
          });
        }
        toast.success("Notification email added");
      }
      else { setRecipientError(data.error || "Failed to add email"); setRecipientStatus("idle"); toast.error(data.error || "Failed to add email"); }
    } catch { setRecipientError("Network error"); setRecipientStatus("idle"); toast.error("Network error"); }
  };

  const handleRemoveRecipient = async (id) => {
    setRemovingRecipient(id);
    try {
      const res = await fetch(`/api/admin/notification-recipients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotificationRecipientsState((prev) => prev.filter((r) => r.id !== id));
        toast.success("Notification email removed");
      }
      else { const data = await res.json().catch(() => ({})); toast.error(data.error || "Failed to remove"); }
    } catch { toast.error("Network error"); }
    setRemovingRecipient(null);
  };

  const handleRevoke = async (email) => {
    if (!confirm(`Revoke access for ${email}? They will lose access immediately. Analytics are kept for reporting.`)) return;
    setRevoking(email);
    setRevoked(prev => new Set([...prev, email]));
    try {
      const res = await fetch("/api/admin/revoke", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (res.ok) { toast.success("Access revoked"); }
      else { const data = await res.json().catch(() => ({})); setRevoked(prev => { const s = new Set(prev); s.delete(email); return s; }); toast.error(data.error || "Failed to revoke access"); }
    } catch { setRevoked(prev => { const s = new Set(prev); s.delete(email); return s; }); toast.error("Network error \u2014 please try again"); }
    setRevoking(null);
  };

  const handleInvite = async (e) => {
    e?.preventDefault();
    if (!inviteEmail?.trim() || !inviteEmail.includes("@")) return;
    setInviteError(null);
    setInviteStatus("loading");
    const email = inviteEmail.trim();
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, notify: inviteNotify }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInviteEmail("");
        setInviteStatus("idle");
        setAllowedEmailsState((prev) => {
          if (prev.some((row) => row.email?.toLowerCase() === email.toLowerCase())) return prev;
          return [
            {
              id: `local-${email}-${Date.now()}`,
              email,
              source: "admin_added",
              invited_at: new Date().toISOString(),
              invited_by_email: adminContext?.email || null,
            },
            ...prev,
          ];
        });
        toast.success(inviteNotify ? `Invite sent to ${email}` : `Invite added for ${email}`);
      }
      else { setInviteError(data.error || "Failed to add email"); setInviteStatus("idle"); toast.error(data.error || "Failed to add email"); }
    } catch { setInviteError("Network error"); setInviteStatus("idle"); toast.error("Network error"); }
  };

  const handleSaveContact = async (e) => {
    e?.preventDefault();
    if (!contactSettingsBlock?.blockId) {
      setContactError("Contact block not configured in CMS.");
      return;
    }

    setContactError(null);
    setContactSaveStatus("loading");
    const nextRows = upsertContactRows(contactRows, {
      schedule_url: scheduleUrl.trim(),
      phone_display: phoneDisplay.trim(),
      phone_e164: phoneE164.trim(),
    });

    try {
      const res = await fetch("/api/admin/content/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealSlug: contactSettingsBlock.dealSlug,
          changes: [
            {
              block_id: contactSettingsBlock.blockId,
              previous_content: contactRows,
              new_content: nextRows,
              action: "edit",
              description: "Updated contact settings",
              section_slug: contactSettingsBlock.sectionSlug,
              section_title: contactSettingsBlock.sectionTitle,
            },
          ],
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setContactSaveStatus("idle");
        setContactError(data?.error || "Failed to save contact settings");
        toast.error(data?.error || "Failed to save contact settings");
        return;
      }

      setContactRows(nextRows);
      setContactSaveStatus("idle");
      toast.success("Contact settings saved");
    } catch {
      setContactSaveStatus("idle");
      setContactError("Network error");
      toast.error("Network error");
    }
  };

  const handleApproveDeny = async (email, action, invitedBy, notes) => {
    setApproving(email);
    try {
      const res = await fetch("/api/admin/access-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, action, invitedBy, notes }) });
      if (res.ok) {
        setApproveModal(null);
        setAccessRequestsState((prev) =>
          prev.map((row) =>
            row.email?.toLowerCase() === email.toLowerCase() && row.status === "pending"
              ? { ...row, status: action === "approve" ? "approved" : "denied" }
              : row
          )
        );
        if (action === "approve") {
          setAllowedEmailsState((prev) => {
            if (prev.some((row) => row.email?.toLowerCase() === email.toLowerCase())) return prev;
            return [
              {
                id: `local-${email}-${Date.now()}`,
                email,
                source: "request_approved",
                invited_at: new Date().toISOString(),
                invited_by_email: adminContext?.email || null,
              },
              ...prev,
            ];
          });
        }
        toast.success(action === "approve" ? `Approved ${email}` : `Denied ${email}`);
      }
      else { const data = await res.json().catch(() => ({})); toast.error(data.error || "Failed"); }
    } catch { toast.error("Network error"); }
    setApproving(null);
  };

  const copyInviteLink = (email) => {
    const baseUrl = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) : "";
    const url = `${baseUrl}/login?email=${encodeURIComponent(email)}&utm_source=invite&utm_medium=admin`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 3000);
      toast.success("Link copied to clipboard");
    });
  };

  const handleCopyShareLink = async (email, contentType) => {
    const key = `${contentType}:${email}`;
    setGeneratingShareLink(key);
    try {
      const res = await fetch("/api/admin/share-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, contentType }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to generate share link");
        return;
      }
      await navigator.clipboard.writeText(data.url);
      setCopiedShareEmail(key);
      setTimeout(() => setCopiedShareEmail(null), 3000);
      toast.success(data.isExisting ? `${contentType === "podcast" ? "Podcast" : "Deck"} link copied` : `New ${contentType} link created and copied`);
      // Refresh share tokens if loaded
      if (shareTokensLoaded) fetchShareTokens();
    } catch {
      toast.error("Network error");
    } finally {
      setGeneratingShareLink(null);
    }
  };

  const fetchShareTokens = async () => {
    try {
      const res = await fetch("/api/admin/share-token");
      const data = await res.json();
      if (res.ok) {
        setShareTokens(data.shareTokens || []);
        setShareTokensLoaded(true);
      }
    } catch {}
  };

  const handleToggleShareToken = async (tokenStr, newActive) => {
    setTogglingShareToken(tokenStr);
    try {
      const res = await fetch(`/api/admin/share-token/${tokenStr}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (res.ok) {
        setShareTokens((prev) =>
          prev.map((t) => t.token === tokenStr ? { ...t, is_active: newActive } : t)
        );
        toast.success(newActive ? "Link reactivated" : "Link deactivated");
      } else {
        toast.error("Failed to update link");
      }
    } catch {
      toast.error("Network error");
    }
    setTogglingShareToken(null);
  };

  const handleSendReminder = async (email) => {
    setReminding(email);
    try {
      const res = await fetch("/api/admin/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to send reminder");
      } else {
        toast.success(`Reminder sent to ${email}`);
      }
    } catch {
      toast.error("Network error");
    }
    setReminding(null);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const visibleInvestors = useMemo(
    () => investors.filter((inv) => !revoked.has(inv.email)),
    [investors, revoked]
  );

  const sortedInvestors = useMemo(
    () =>
      [...visibleInvestors].sort((a, b) => {
        let aVal;
        let bVal;
        switch (sortKey) {
          case "email":
            aVal = a.email.toLowerCase();
            bVal = b.email.toLowerCase();
            break;
          case "visits":
            aVal = a.visits;
            bVal = b.visits;
            break;
          case "time":
            aVal = a.totalSeconds;
            bVal = b.totalSeconds;
            break;
          case "intentScore":
            aVal = a.intentScore;
            bVal = b.intentScore;
            break;
          default:
            aVal = a.intentScore;
            bVal = b.intentScore;
        }
        if (typeof aVal === "string") {
          return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }),
    [visibleInvestors, sortKey, sortDir]
  );
  const legacyPendingCount = 0;
  const legacyRequests = [];

  const investorByEmail = useMemo(
    () => new Map(investors.map((inv) => [inv.email.toLowerCase(), inv])),
    [investors]
  );

  const shareMetricsByEmail = useMemo(() => {
    const map = new Map();
    for (const token of shareTokens) {
      const email = token.email?.toLowerCase();
      if (!email) continue;
      if (!map.has(email)) map.set(email, { deck: null, podcast: null });
      const bucket = map.get(email);
      const existing = bucket[token.content_type];
      // Keep the most relevant token (active preferred, highest view count as tiebreak)
      if (!existing || (token.is_active && !existing.is_active) || token.view_count > (existing.viewCount || 0)) {
        bucket[token.content_type] = {
          viewCount: token.view_count,
          lastViewed: token.last_viewed_at,
          isActive: token.is_active,
        };
      }
    }
    return map;
  }, [shareTokens]);

  const accessRows = useMemo(() => {
    const accessByEmail = new Map();
    const emptyAccessRow = (email) => ({
      email,
      invitedAt: null,
      invitedByEmail: null,
      requestStatus: null,
      requestId: null,
      requestedAt: null,
      hasInvite: false,
    });

    for (const invite of allowedEmailsState) {
      const email = invite.email?.toLowerCase();
      if (!email) continue;
      accessByEmail.set(email, {
        ...emptyAccessRow(email),
        invitedAt: invite.invited_at || null,
        invitedByEmail: invite.invited_by_email || null,
        hasInvite: true,
      });
    }

    for (const req of accessRequestsState) {
      const email = req.email?.toLowerCase();
      if (!email) continue;
      const existing = accessByEmail.get(email) || emptyAccessRow(email);
      accessByEmail.set(email, {
        ...existing,
        requestStatus: req.status,
        requestId: req.id,
        requestedAt: req.requested_at || null,
      });
    }

    for (const investor of investors) {
      const email = investor.email?.toLowerCase();
      if (!email || accessByEmail.has(email)) continue;
      accessByEmail.set(email, emptyAccessRow(email));
    }

    // Include share-link-only contacts not already in the list
    for (const token of shareTokens) {
      const email = token.email?.toLowerCase();
      if (!email || accessByEmail.has(email)) continue;
      accessByEmail.set(email, {
        ...emptyAccessRow(email),
        invitedAt: token.created_at || null,
        hasInvite: false,
      });
    }

    return [...accessByEmail.values()]
      .map((row) => {
        const investor = investorByEmail.get(row.email) || null;
        const isLoggedIn = !!investor;
        const status = isLoggedIn
          ? "active"
          : row.requestStatus === "pending"
            ? "pending"
            : row.requestStatus === "denied"
              ? "denied"
              : "pending_login";
        return {
          ...row,
          status,
          investor,
          lastActive: investor ? investor.lastActive : "Not logged in",
          visits: investor ? investor.visits : 0,
        };
      })
      .sort((a, b) => {
        const aTs = new Date(a.invitedAt || a.requestedAt || a.investor?.lastActiveAt || 0).getTime();
        const bTs = new Date(b.invitedAt || b.requestedAt || b.investor?.lastActiveAt || 0).getTime();
        return bTs - aTs;
      });
  }, [allowedEmailsState, accessRequestsState, investorByEmail, investors, shareTokens]);

  const pendingRequestRows = useMemo(
    () => accessRows.filter((row) => row.status === "pending"),
    [accessRows]
  );
  const invitedRows = useMemo(
    () => accessRows.filter((row) => row.status !== "pending" && row.status !== "denied"),
    [accessRows]
  );
  const pendingAccessCountLive = useMemo(
    () => accessRequestsState.filter((row) => row.status === "pending").length,
    [accessRequestsState]
  );

  const sortArrow = (key) => sortKey === key ? (sortDir === "desc" ? " \u25BC" : " \u25B2") : "";

  // --- Tab navigation ---

  const views = isMobile
    ? [
        { id: "investors", label: "Investors" },
        { id: "access", label: `Invites${pendingAccessCountLive > 0 ? ` (${pendingAccessCountLive})` : ""}` },
        { id: "settings", label: "Settings" },
      ]
    : [
        { id: "investors", label: "Investors" },
        { id: "access", label: `Invites${pendingAccessCountLive > 0 ? ` (${pendingAccessCountLive})` : ""}` },
        { id: "settings", label: "Settings" },
      ];

  const tabStyle = (active) => ({
    fontFamily: SANS, fontSize: isMobile ? 13 : 14, fontWeight: active ? 600 : 400,
    color: active ? COLORS.green900 : COLORS.text400,
    background: active ? COLORS.white : "transparent",
    border: active ? `1px solid ${COLORS.border}` : "1px solid transparent",
    borderBottom: active ? "1px solid white" : `1px solid ${COLORS.border}`,
    borderRadius: "8px 8px 0 0", padding: isMobile ? "10px 14px" : "10px 20px",
    cursor: "pointer", marginBottom: -1, position: "relative", zIndex: active ? 1 : 0,
    whiteSpace: "nowrap", minHeight: 44,
  });

  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream50 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: isMobile ? 22 : 26, color: COLORS.text900 }}>
            Investor Access
          </h1>
        </div>

        {/* Desktop summary cards */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
            <SummaryCard value={summary.totalInvestors} label="Investors" />
            <SummaryCard value={summary.totalTime} label="Total Time" />
            <SummaryCard value={summary.avgPages} label="Avg Pages" />
            <SummaryCard value={`${summary.activeToday} active today`} label="24h Activity" />
          </div>
        )}

        {/* Tab bar (scrollable on mobile) */}
        <div style={{
          display: "flex", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 0,
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}>
          {views.map(v => (
            v.href ? (
              <a
                key={v.id}
                href={v.href}
                style={{ ...tabStyle(false), textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                {v.label}
              </a>
            ) : (
              <button key={v.id} onClick={() => setView(v.id)} style={tabStyle(view === v.id)}>
                {v.label}
              </button>
            )
          ))}
        </div>

        {/* ========== INVESTORS ========== */}
        {view === "investors" && (
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            <div style={{ padding: isMobile ? "12px 12px 10px" : "14px 16px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ ...sectionLabel, marginBottom: 8 }}>Viewer activity</div>
              <div style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text500, lineHeight: 1.5 }}>
                {totalInvestors} viewers tracked
                {` \u00b7 `}
                {actionGroups.activeNow.length} active today
                {` \u00b7 `}
                {actionGroups.followUpNow.length} need follow-up
              </div>
            </div>

            {sortedInvestors.length === 0 && investors.length === 0 && accessRows.length === 0 ? (
              <EmptyState title="No investor activity yet" description="Investor activity will appear here as people access the deal room." />
            ) : isMobile ? (
              <div style={{ padding: "8px 12px 12px" }}>
                {sortedInvestors.map(inv => (
                  <InvestorCard key={inv.email} inv={inv} isOpen={!!expanded[inv.email]} onToggle={() => toggle(inv.email)} onRevoke={handleRevoke} revoking={revoking} />
                ))}
              </div>
            ) : (
              <>
                {/* Desktop: pending access table */}
                {legacyPendingCount > 0 && (
                  <div style={{ marginBottom: 0, borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{ padding: "14px 20px", background: COLORS.cream100, borderBottom: `1px solid ${COLORS.border}`, ...sectionLabel }}>
                      Pending Access \u2014 follow up
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: COLORS.cream50 }}>
                          <th style={th}>Email</th>
                          <th style={{ ...th, textAlign: "right" }}>Requested</th>
                          <th style={{ ...th, textAlign: "center" }}>Attempt</th>
                          <th style={{ ...th, textAlign: "center" }}>Delivery</th>
                          <th style={{ ...th, textAlign: "right", width: 100 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {legacyRequests.filter(r => !r.activated && !revoked.has(r.email)).map(req => (
                          <tr key={req.email}>
                            <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{req.email}</span></td>
                            <td style={{ ...td, textAlign: "right" }}>{formatRequestDate(req.requestedAt)}</td>
                            <td style={{ ...td, textAlign: "center" }}><StatusBadge status={req.attemptStatus} /></td>
                            <td style={{ ...td, textAlign: "center" }}><StatusBadge status={req.deliveryStatus} /></td>
                            <td style={{ ...td, textAlign: "right" }}>
                              <button onClick={(e) => { e.stopPropagation(); handleRevoke(req.email); }} disabled={revoking === req.email}
                                style={{ ...btnBase, fontSize: 12, padding: "4px 12px", color: revoking === req.email ? COLORS.text400 : COLORS.error, background: "transparent", border: `1px solid ${revoking === req.email ? COLORS.border : COLORS.error}` }}>
                                {revoking === req.email ? "Revoking..." : "Revoke"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Desktop: investor table */}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: COLORS.cream100 }}>
                      <th style={th} onClick={() => handleSort("email")}>Investor{sortArrow("email")}</th>
                      <th style={th}>Invited by</th>
                      <th style={{ ...th, textAlign: "right" }} onClick={() => handleSort("visits")}>Visits{sortArrow("visits")}</th>
                      <th style={{ ...th, textAlign: "right" }} onClick={() => handleSort("time")}>Time{sortArrow("time")}</th>
                      <th style={{ ...th, textAlign: "right" }}>Last Active</th>
                      <th style={{ ...th, textAlign: "right" }} onClick={() => handleSort("intentScore")}>Intent{sortArrow("intentScore")}</th>
                      <th style={th}>Next step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInvestors.map(inv => (
                      <InvestorRow key={inv.email} inv={inv} isOpen={!!expanded[inv.email]} onToggle={() => toggle(inv.email)} onRevoke={handleRevoke} revoking={revoking} />
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* ========== ACCESS ========== */}
        {view === "access" && (
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            {!accessDataLoaded && accessDataLoading && (
              <div style={{ padding: 16, fontFamily: SANS, fontSize: 14, color: COLORS.text500 }}>
                Loading access data...
              </div>
            )}
            {!accessDataLoaded && accessDataError && (
              <div style={{ padding: 16, fontFamily: SANS, fontSize: 14, color: COLORS.error }}>
                {accessDataError}
              </div>
            )}
            <form onSubmit={handleInvite} style={{ padding: isMobile ? 12 : "20px 20px 0 20px" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={fieldLabel}>Invite by email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setInviteError(null);
                    }}
                    placeholder="investor@example.com"
                    style={{ ...inputStyle, padding: "10px 14px", fontSize: 14 }}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 13, color: COLORS.text700, minHeight: 44 }}>
                  <input
                    type="checkbox"
                    checked={inviteNotify}
                    onChange={(e) => setInviteNotify(e.target.checked)}
                  />
                  Send invite email now
                </label>
                <button type="submit" disabled={inviteStatus === "loading"} style={{ ...btnPrimary(inviteStatus === "loading"), alignSelf: "flex-end" }}>
                  {inviteStatus === "loading" ? "Adding..." : "Add"}
                </button>
              </div>
              {inviteError && <div style={{ color: COLORS.error, fontSize: 13, marginBottom: 12 }}>{inviteError}</div>}
            </form>

            <div style={{ padding: isMobile ? 12 : "16px 20px 0" }}>
              <div style={sectionLabel}>Pending Requests</div>
            </div>
            {pendingRequestRows.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead>
                  <tr style={{ background: COLORS.cream100 }}>
                    <th style={th}>Email</th>
                    <th style={th}>Invited by</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: "right" }}>Last Active</th>
                    <th style={{ ...th, textAlign: "right" }}>Visits</th>
                    <th style={{ ...th, width: 180 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequestRows.map((row) => (
                    <tr key={row.email}>
                      <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{row.email}</span></td>
                      <td style={{ ...td, fontSize: 13, color: COLORS.text500 }}>{row.invitedByEmail || "\u2014"}</td>
                      <td style={td}><StatusBadge status={row.status} /></td>
                      <td style={{ ...td, textAlign: "right" }}>{row.lastActive}</td>
                      <td style={{ ...td, textAlign: "right" }}>{row.visits}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => setApproveModal({ email: row.email })} disabled={approving === row.email} style={{ ...btnSmall(approving === row.email), marginRight: 8 }}>Approve</button>
                          <button onClick={() => handleApproveDeny(row.email, "deny")} disabled={approving === row.email} style={btnDanger(approving === row.email)}>Deny</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No pending requests" description="New inbound access requests will show up here." />
            )}

            <div style={{ padding: isMobile ? 12 : "24px 20px 0" }}>
              <div style={sectionLabel}>Invited & Approved</div>
            </div>
            {invitedRows.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead>
                  <tr style={{ background: COLORS.cream100 }}>
                    <th style={th}>Email</th>
                    <th style={th}>Status</th>
                    <th style={th}>Invited At</th>
                    <th style={{ ...th, textAlign: "right" }}>Last Active</th>
                    <th style={{ ...th, textAlign: "right" }}>Visits</th>
                    <th style={{ ...th, textAlign: "center" }}>Deck</th>
                    <th style={{ ...th, textAlign: "center" }}>Podcast</th>
                    <th style={{ ...th, textAlign: "center" }}>NDA</th>
                    <th style={{ ...th, width: 260 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitedRows.map((row) => {
                    const invite = allowedEmailsState.find((item) => item.email?.toLowerCase() === row.email);
                    const shareMeta = shareMetricsByEmail.get(row.email);
                    return (
                      <tr key={row.email}>
                        <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{row.email}</span></td>
                        <td style={td}><StatusBadge status={row.status} /></td>
                        <td style={td}>{formatRequestDate(row.invitedAt || row.requestedAt)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{row.lastActive}</td>
                        <td style={{ ...td, textAlign: "right" }}>{row.visits}</td>
                        <td style={{ ...td, textAlign: "center", fontSize: 13 }}>
                          {shareMeta?.deck ? (
                            <span style={{ fontWeight: 600, color: shareMeta.deck.viewCount > 0 ? COLORS.green800 : COLORS.text500 }}>
                              {shareMeta.deck.viewCount}
                            </span>
                          ) : (
                            <span style={{ color: COLORS.text400 }}>&mdash;</span>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: "center", fontSize: 13 }}>
                          {shareMeta?.podcast ? (
                            <span style={{ fontWeight: 600, color: shareMeta.podcast.viewCount > 0 ? COLORS.green800 : COLORS.text500 }}>
                              {shareMeta.podcast.viewCount}
                            </span>
                          ) : (
                            <span style={{ color: COLORS.text400 }}>&mdash;</span>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: "center" }}>
                          {invite ? (
                            <button
                              type="button"
                              onClick={() => handleToggleNda(row.email, invite.nda_required === false)}
                              disabled={togglingNda === row.email}
                              style={{
                                ...btnBase,
                                fontSize: 12,
                                padding: "6px 14px",
                                color: invite.nda_required === false ? COLORS.text500 : COLORS.green800,
                                background: invite.nda_required === false ? COLORS.gray100 : COLORS.green100,
                                border: `1px solid ${invite.nda_required === false ? COLORS.border : COLORS.green300}`,
                                cursor: togglingNda === row.email ? "not-allowed" : "pointer",
                                opacity: togglingNda === row.email ? 0.6 : 1,
                              }}
                            >
                              {invite.nda_required === false ? "Off" : "On"}
                            </button>
                          ) : (
                            <span style={{ color: COLORS.text400 }}>&mdash;</span>
                          )}
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <CopyLinkButton
                              copied={copiedEmail === row.email}
                              onClick={() => copyInviteLink(row.email)}
                            />
                            <ShareLinkButton type="podcast" copied={copiedShareEmail === `podcast:${row.email}`} loading={generatingShareLink === `podcast:${row.email}`} onClick={() => handleCopyShareLink(row.email, "podcast")} />
                            <ShareLinkButton type="deck" copied={copiedShareEmail === `deck:${row.email}`} loading={generatingShareLink === `deck:${row.email}`} onClick={() => handleCopyShareLink(row.email, "deck")} />
                            {row.status === "pending_login" && (
                              <button type="button" onClick={() => handleSendReminder(row.email)} disabled={reminding === row.email} style={{ ...btnOutline, minHeight: 32, padding: "8px 12px" }}>
                                {reminding === row.email ? "Sending..." : "Send reminder"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No invited investors yet" description="Invite someone above to get started." />
            )}

            {/* ========== SHARE LINKS SECTION ========== */}
            <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: isMobile ? 12 : 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={sectionLabel}>Share Links</div>
                {!shareTokensLoaded && (
                  <button type="button" onClick={fetchShareTokens} style={{ ...btnOutline, minHeight: 32, padding: "6px 12px", fontSize: 12 }}>
                    Load share links
                  </button>
                )}
              </div>
              {shareTokensLoaded && shareTokens.length === 0 && (
                <div style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text400, padding: "8px 0" }}>
                  No share links generated yet. Use the podcast or deck buttons in the invited list above to create one.
                </div>
              )}
              {shareTokensLoaded && shareTokens.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: COLORS.cream100 }}>
                      <th style={th}>Email</th>
                      <th style={th}>Type</th>
                      <th style={th}>Status</th>
                      <th style={{ ...th, textAlign: "right" }}>Views</th>
                      <th style={{ ...th, textAlign: "right" }}>Last Viewed</th>
                      <th style={{ ...th, width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shareTokens.map((st) => (
                      <tr key={st.id}>
                        <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900, fontSize: 13 }}>{st.email}</span></td>
                        <td style={td}>
                          <span style={{
                            display: "inline-flex", padding: "3px 8px", borderRadius: 10,
                            fontWeight: 600, fontSize: 11, background: COLORS.gray100, color: COLORS.text700,
                          }}>
                            {st.content_type}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{
                            display: "inline-flex", padding: "3px 8px", borderRadius: 10,
                            fontWeight: 600, fontSize: 11,
                            background: st.is_active ? COLORS.green100 : COLORS.gray100,
                            color: st.is_active ? COLORS.green800 : COLORS.text400,
                          }}>
                            {st.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>{st.view_count}</td>
                        <td style={{ ...td, textAlign: "right", fontSize: 13, color: COLORS.text500 }}>
                          {st.last_viewed_at ? formatRequestDate(st.last_viewed_at) : "\u2014"}
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <CopyLinkButton
                              copied={copiedShareEmail === `copy:${st.token}`}
                              onClick={() => {
                                const baseUrl = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) : "";
                                navigator.clipboard.writeText(`${baseUrl}/share/${st.token}`).then(() => {
                                  setCopiedShareEmail(`copy:${st.token}`);
                                  setTimeout(() => setCopiedShareEmail(null), 3000);
                                  toast.success("Share link copied");
                                });
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleToggleShareToken(st.token, !st.is_active)}
                              disabled={togglingShareToken === st.token}
                              style={{
                                ...btnBase, fontSize: 11, padding: "5px 10px", minHeight: 32,
                                color: st.is_active ? COLORS.error : COLORS.green800,
                                background: "transparent",
                                border: `1px solid ${st.is_active ? COLORS.error : COLORS.green800}`,
                                opacity: togglingShareToken === st.token ? 0.6 : 1,
                              }}
                            >
                              {st.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                            {!st.is_active && (
                              <button
                                type="button"
                                onClick={() => handleCopyShareLink(st.email, st.content_type)}
                                disabled={generatingShareLink === `${st.content_type}:${st.email}`}
                                style={{
                                  ...btnBase, fontSize: 11, padding: "5px 10px", minHeight: 32,
                                  color: COLORS.white,
                                  background: COLORS.green800,
                                  opacity: generatingShareLink === `${st.content_type}:${st.email}` ? 0.6 : 1,
                                }}
                              >
                                New Link
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ========== INVITE LIST ========== */}
        {view === "invite" && (
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            <form onSubmit={handleInvite} style={{ padding: isMobile ? 12 : "20px 20px 0 20px" }}>
              {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={fieldLabel}>Email to invite</label>
                    <input type="email" value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }} placeholder="joe@example.com" style={inputStyle} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 13, color: COLORS.text700 }}>
                    <input
                      type="checkbox"
                      checked={inviteNotify}
                      onChange={(e) => setInviteNotify(e.target.checked)}
                    />
                    Send invite email now
                  </label>
                  <button type="submit" disabled={inviteStatus === "loading"} style={{ ...btnPrimary(inviteStatus === "loading"), width: "100%" }}>
                    {inviteStatus === "loading" ? "Adding..." : "Add"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={fieldLabel}>Email to invite</label>
                    <input type="email" value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }} placeholder="joe@example.com" style={{ ...inputStyle, padding: "10px 14px", fontSize: 14 }} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: SANS, fontSize: 13, color: COLORS.text700, minHeight: 44 }}>
                    <input
                      type="checkbox"
                      checked={inviteNotify}
                      onChange={(e) => setInviteNotify(e.target.checked)}
                    />
                    Send invite email now
                  </label>
                  <button type="submit" disabled={inviteStatus === "loading"} style={{ ...btnPrimary(inviteStatus === "loading"), alignSelf: "flex-end" }}>
                    {inviteStatus === "loading" ? "Adding..." : "Add"}
                  </button>
                </div>
              )}
              <p style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400, margin: isMobile ? "10px 0 0" : "12px 0 0 0" }}>
                Add someone to send them an invite email. You can also copy the link to share manually.
              </p>
            </form>
            {inviteError && <div style={{ color: COLORS.error, fontSize: 13, padding: "8px 16px" }}>{inviteError}</div>}

            {isMobile ? (
              <div style={{ padding: "12px 12px" }}>
                {allowedEmailsState.length === 0 ? (
                  <EmptyState title="No invites yet" description="Add an email above to send an invite." />
                ) : allowedEmailsState.map(a => (
                  <InviteCardMobile key={a.id} item={a} onCopyLink={copyInviteLink} copiedEmail={copiedEmail} onToggleNda={handleToggleNda} togglingNda={togglingNda} onCopyShareLink={handleCopyShareLink} copiedShareEmail={copiedShareEmail} generatingShareLink={generatingShareLink} />
                ))}
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
                  <thead>
                    <tr style={{ background: COLORS.cream100 }}>
                      <th style={th}>Email</th>
                      <th style={th}>Status</th>
                      <th style={th}>Invited At</th>
                      <th style={{ ...th, textAlign: "center" }}>NDA Required</th>
                      <th style={{ ...th, width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowedEmailsState.map((a) => (
                      <tr key={a.id}>
                        <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{a.email}</span></td>
                        <td style={td}><StatusBadge status={a.status} /></td>
                        <td style={td}>{formatRequestDate(a.invited_at)}</td>
                        <td style={{ ...td, textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleNda(a.email, a.nda_required === false)}
                            disabled={togglingNda === a.email}
                            style={{
                              ...btnBase,
                              fontSize: 12, padding: "6px 14px",
                              color: a.nda_required === false ? COLORS.text500 : COLORS.green800,
                              background: a.nda_required === false ? COLORS.gray100 : COLORS.green100,
                              border: `1px solid ${a.nda_required === false ? COLORS.border : COLORS.green300}`,
                              cursor: togglingNda === a.email ? "not-allowed" : "pointer",
                              opacity: togglingNda === a.email ? 0.6 : 1,
                            }}
                          >
                            {a.nda_required === false ? "Off" : "On"}
                          </button>
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <CopyLinkButton
                              copied={copiedEmail === a.email}
                              onClick={() => copyInviteLink(a.email)}
                            />
                            <ShareLinkButton type="podcast" copied={copiedShareEmail === `podcast:${a.email}`} loading={generatingShareLink === `podcast:${a.email}`} onClick={() => handleCopyShareLink(a.email, "podcast")} />
                            <ShareLinkButton type="deck" copied={copiedShareEmail === `deck:${a.email}`} loading={generatingShareLink === `deck:${a.email}`} onClick={() => handleCopyShareLink(a.email, "deck")} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allowedEmailsState.length === 0 && <EmptyState title="No emails on the invite list yet" />}
              </>
            )}
          </div>
        )}

        {/* ========== ACCESS REQUESTS ========== */}
        {view === "requests" && (
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            {isMobile ? (
              <div style={{ padding: "12px 12px" }}>
                {accessRequestsState.length === 0 ? (
                  <EmptyState title="No access requests yet" />
                ) : accessRequestsState.map(r => (
                  <RequestCardMobile
                    key={r.id}
                    request={r}
                    onApprove={(email) => setApproveModal({ email })}
                    onDeny={(email) => handleApproveDeny(email, "deny")}
                    onCopyLink={copyInviteLink}
                    approving={approving}
                    copiedEmail={copiedEmail}
                    onCopyShareLink={handleCopyShareLink}
                    copiedShareEmail={copiedShareEmail}
                    generatingShareLink={generatingShareLink}
                  />
                ))}
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: COLORS.cream100 }}>
                      <th style={th}>Email</th>
                      <th style={th}>Requested</th>
                      <th style={th}>Status</th>
                      <th style={{ ...th, width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessRequestsState.map((r) => (
                      <tr key={r.id}>
                        <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{r.email}</span></td>
                        <td style={td}>{formatRequestDate(r.requested_at)}</td>
                        <td style={td}><StatusBadge status={r.status} /></td>
                        <td style={td}>
                          {r.status === "pending" && (
                            <>
                              <button onClick={() => setApproveModal({ email: r.email })} disabled={approving === r.email} style={{ ...btnSmall(approving === r.email), marginRight: 8 }}>Approve</button>
                              <button onClick={() => handleApproveDeny(r.email, "deny")} disabled={approving === r.email} style={{ ...btnDanger(approving === r.email), marginRight: 8 }}>Deny</button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <CopyLinkButton
                                copied={copiedEmail === r.email}
                                onClick={() => copyInviteLink(r.email)}
                              />
                              <ShareLinkButton type="podcast" copied={copiedShareEmail === `podcast:${r.email}`} loading={generatingShareLink === `podcast:${r.email}`} onClick={() => handleCopyShareLink(r.email, "podcast")} />
                              <ShareLinkButton type="deck" copied={copiedShareEmail === `deck:${r.email}`} loading={generatingShareLink === `deck:${r.email}`} onClick={() => handleCopyShareLink(r.email, "deck")} />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {accessRequestsState.length === 0 && <EmptyState title="No access requests yet" />}
              </>
            )}
          </div>
        )}

        {/* ========== SETTINGS ========== */}
        {view === "settings" && (
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden", padding: isMobile ? 12 : 20 }}>
            {!accessDataLoaded && accessDataLoading && (
              <div style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text500, marginBottom: 16 }}>
                Loading settings...
              </div>
            )}
            {!accessDataLoaded && accessDataError && (
              <div style={{ fontFamily: SANS, fontSize: 14, color: COLORS.error, marginBottom: 16 }}>
                {accessDataError}
              </div>
            )}

            {/* ---- Team (GP only) ---- */}
            {adminContext?.isGP && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ ...sectionLabel, marginBottom: 12 }}>Team</div>
                <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text600, marginBottom: 20, lineHeight: 1.5 }}>
                  Add partner admins who can view analytics, manage investor access, and get notifications for their invitees.
                </p>
                <form onSubmit={handleAddPartner} style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <label style={fieldLabel}>Email</label>
                    <input
                      type="email"
                      value={newPartnerEmail}
                      onChange={(e) => { setNewPartnerEmail(e.target.value); setPartnerError(null); }}
                      placeholder="partner@example.com"
                      style={{ ...inputStyle, padding: "10px 14px", fontSize: 14 }}
                    />
                  </div>
                  <div style={{ minWidth: 140 }}>
                    <label style={fieldLabel}>Name (optional)</label>
                    <input
                      type="text"
                      value={newPartnerName}
                      onChange={(e) => setNewPartnerName(e.target.value)}
                      placeholder="Jane Smith"
                      style={{ ...inputStyle, padding: "10px 14px", fontSize: 14 }}
                    />
                  </div>
                  <button type="submit" disabled={partnerAddStatus === "loading"} style={{ ...btnPrimary(partnerAddStatus === "loading"), alignSelf: "flex-end" }}>
                    {partnerAddStatus === "loading" ? "Adding..." : "Add partner"}
                  </button>
                </form>
                {partnerError && <div style={{ color: COLORS.error, fontSize: 13, marginBottom: 12 }}>{partnerError}</div>}

                {partners.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: COLORS.cream100 }}>
                        <th style={th}>Email</th>
                        <th style={th}>Name</th>
                        <th style={th}>Notifications</th>
                        <th style={th}>Edit content</th>
                        <th style={{ ...th, width: 100 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.map((p) => (
                        <tr key={p.id}>
                          <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{p.email}</span></td>
                          <td style={{ ...td, color: COLORS.text500 }}>{p.name || "\u2014"}</td>
                          <td style={td}>
                            <StatusBadge status={p.notify_on_own_invites ? "active" : "pending_login"} />
                          </td>
                          <td style={td}>
                            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={p.can_edit_content || false}
                                onChange={(e) => handleToggleContentEdit(p.email, e.target.checked)}
                                disabled={togglingContentEdit === p.email}
                                style={{ width: 16, height: 16 }}
                              />
                            </label>
                          </td>
                          <td style={td}>
                            <button
                              type="button"
                              onClick={() => handleRemovePartner(p.email)}
                              disabled={removingPartner === p.email}
                              style={btnDanger(removingPartner === p.email)}
                            >
                              {removingPartner === p.email ? "Removing..." : "Remove"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : partnersLoaded ? (
                  <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text500 }}>
                    No partner admins yet. Add someone above to give them admin access.
                  </p>
                ) : null}
              </div>
            )}

            {/* ---- Notification Preferences (partner admins) ---- */}
            {adminContext && !adminContext.isGP && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ ...sectionLabel, marginBottom: 12 }}>Notification Preferences</div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: SANS, fontSize: 14, color: COLORS.text700, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifyPref}
                    onChange={(e) => handleToggleNotifyPref(e.target.checked)}
                    disabled={notifyPrefSaving}
                    style={{ width: 18, height: 18 }}
                  />
                  Email me when my invitees open or return to the data room
                </label>
                <p style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text400, marginTop: 8, marginLeft: 28 }}>
                  You will only receive notifications for investors you personally invited.
                </p>
              </div>
            )}

            {/* ---- Access Request Notification Emails ---- */}
            <div style={{ ...sectionLabel, marginBottom: 16 }}>Access Request Notification Emails</div>
            <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text600, marginBottom: 20, lineHeight: 1.5 }}>
              These emails receive a notification (with approve/deny links) whenever someone requests access to the data room.
            </p>
            <form onSubmit={handleAddRecipient} style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={fieldLabel}>Add email to notify</label>
                <input type="email" value={newRecipientEmail} onChange={(e) => { setNewRecipientEmail(e.target.value); setRecipientError(null); }} placeholder="admin@example.com" style={inputStyle} />
              </div>
              <button type="submit" disabled={recipientStatus === "loading"} style={{ ...btnPrimary(recipientStatus === "loading"), alignSelf: "flex-end" }}>
                {recipientStatus === "loading" ? "Adding..." : "Add"}
              </button>
            </form>
            {recipientError && <div style={{ color: COLORS.error, fontSize: 13, marginBottom: 16 }}>{recipientError}</div>}

            {isMobile ? (
              <div>
                {notificationRecipientsState.map(r => (
                  <div key={r.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.text900, wordBreak: "break-all", flex: 1, marginRight: 8 }}>{r.email}</span>
                    <button type="button" onClick={() => handleRemoveRecipient(r.id)} disabled={removingRecipient === r.id} style={btnDanger(removingRecipient === r.id)}>
                      {removingRecipient === r.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                ))}
                {notificationRecipientsState.length === 0 && (
                  <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text500, marginTop: 16 }}>
                    No notification emails configured. Notifications will go to GP_EMAIL from your environment.
                  </p>
                )}
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: COLORS.cream100 }}>
                      <th style={th}>Email</th>
                      <th style={{ ...th, width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {notificationRecipientsState.map((r) => (
                      <tr key={r.id}>
                        <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{r.email}</span></td>
                        <td style={td}>
                          <button type="button" onClick={() => handleRemoveRecipient(r.id)} disabled={removingRecipient === r.id} style={btnDanger(removingRecipient === r.id)}>
                            {removingRecipient === r.id ? "Removing..." : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {notificationRecipientsState.length === 0 && (
                  <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text500, marginTop: 16 }}>
                    No notification emails configured. Access request notifications will go to GP_EMAIL from your environment.
                  </p>
                )}
              </>
            )}

            {/* --- NDA Audit Log --- */}
            <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 28, paddingTop: 24 }}>
              <div style={{ ...sectionLabel, marginBottom: 16 }}>NDA Agreement Audit Log</div>
              <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text600, marginBottom: 20, lineHeight: 1.5 }}>
                Record of all NDA agreements signed by data room viewers.
              </p>
              {ndaAuditLoading && !ndaAuditLoaded && (
                <div style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text500 }}>Loading audit log...</div>
              )}
              {ndaAuditLoaded && ndaAuditLog.length === 0 && (
                <p style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text500 }}>No NDA agreements recorded yet.</p>
              )}
              {ndaAuditLoaded && ndaAuditLog.length > 0 && (
                isMobile ? (
                  <div>
                    {ndaAuditLog.map((entry) => (
                      <div key={entry.id} style={cardStyle}>
                        <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.text900, marginBottom: 2 }}>{entry.signer_name || "\u2014"}</div>
                        <div style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text600, marginBottom: 4, wordBreak: "break-all" }}>{entry.user_email}</div>
                        <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, marginBottom: 2 }}>
                          Signed: {new Date(entry.agreed_at).toLocaleString()}
                        </div>
                        <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400 }}>
                          Version {entry.nda_version} &middot; IP: {entry.ip_address || "N/A"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: COLORS.cream100 }}>
                        <th style={th}>Name</th>
                        <th style={th}>Email</th>
                        <th style={th}>Signed At</th>
                        <th style={th}>Version</th>
                        <th style={th}>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ndaAuditLog.map((entry) => (
                        <tr key={entry.id}>
                          <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{entry.signer_name || "\u2014"}</span></td>
                          <td style={td}>{entry.user_email}</td>
                          <td style={td}>{new Date(entry.agreed_at).toLocaleString()}</td>
                          <td style={td}>{entry.nda_version}</td>
                          <td style={td}>{entry.ip_address || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        )}

        {/* ========== APPROVE MODAL ========== */}
        {approveModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-modal-title"
            tabIndex={-1}
            style={{
              position: "fixed", inset: 0, background: "rgba(15,60,82,0.4)",
              display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
              zIndex: 1000, outline: "none",
            }}
            onClick={() => setApproveModal(null)}
          >
            <div
              style={{
                background: COLORS.white, padding: 24,
                borderRadius: isMobile ? "16px 16px 0 0" : 8,
                maxWidth: 400, width: isMobile ? "100%" : "90%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div id="approve-modal-title" style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Approve {approveModal.email}?</div>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleApproveDeny(approveModal.email, "approve", fd.get("invitedBy"), fd.get("notes")); }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={fieldLabel}>Invited by (optional)</label>
                  <input name="invitedBy" placeholder="investor@vc.com" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={fieldLabel}>Notes (optional)</label>
                  <input name="notes" placeholder="Notes" style={inputStyle} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setApproveModal(null)} style={btnOutline}>Cancel</button>
                  <button type="submit" disabled={approving === approveModal.email} style={btnPrimary(approving === approveModal.email)}>Approve</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
