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
      display: "inline-block", padding: "3px 10px", borderRadius: 12,
      fontWeight: 600, fontSize: 12, background: s.bg, color: s.color,
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

function FunnelBar({ count, total }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ flex: 1, height: 10, background: COLORS.border, borderRadius: 5, overflow: "hidden", margin: "0 12px" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: COLORS.green600, borderRadius: 5 }} />
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

// --- Filter Chips ---

function FilterChip({ label, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: SANS, fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? COLORS.green900 : COLORS.text500,
        background: active ? COLORS.green100 : COLORS.gray100,
        border: active ? `1px solid ${COLORS.green300}` : `1px solid ${COLORS.border}`,
        borderRadius: 20, padding: "7px 14px", cursor: "pointer",
        transition: "all 0.15s ease", whiteSpace: "nowrap", minHeight: 36,
      }}
    >
      {label}{count != null ? ` (${count})` : ""}
    </button>
  );
}

// --- Today Action Dashboard ---

function ActionCard({ title, count, description, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...cardStyle,
        cursor: "pointer", textAlign: "left", width: "100%",
        borderLeft: `4px solid ${color}`, marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.text900 }}>{title}</span>
        <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, color, lineHeight: 1 }}>{count}</span>
      </div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, marginTop: 4 }}>{description}</div>
    </button>
  );
}

function TodayDashboard({ actionGroups, pendingAccessCount, summary, onNavigate }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...sectionLabel, marginBottom: 12 }}>Action items</div>
      {pendingAccessCount > 0 && (
        <ActionCard
          title="Pending approvals"
          count={pendingAccessCount}
          description="Requests waiting for your review"
          color={COLORS.green700}
          onClick={() => onNavigate("access")}
        />
      )}
      {actionGroups.heatingUpList.length > 0 && (
        <ActionCard
          title="Heating up"
          count={actionGroups.heatingUpList.length}
          description="Accelerating engagement this week"
          color={COLORS.green600}
          onClick={() => onNavigate("investors", "heatingUp")}
        />
      )}
      {actionGroups.followUpNow.length > 0 && (
        <ActionCard
          title="Follow up now"
          count={actionGroups.followUpNow.length}
          description="High intent \u2014 schedule a call or send email"
          color={COLORS.green800}
          onClick={() => onNavigate("investors", "followUp")}
        />
      )}
      {actionGroups.staleHighIntent.length > 0 && (
        <ActionCard
          title="Re-engage"
          count={actionGroups.staleHighIntent.length}
          description="Were engaged but quiet for 7+ days"
          color={COLORS.text400}
          onClick={() => onNavigate("investors", "stale")}
        />
      )}
      {actionGroups.activeNow.length > 0 && (
        <ActionCard
          title="Active today"
          count={actionGroups.activeNow.length}
          description="Viewed the data room in last 24 hours"
          color={COLORS.green500}
          onClick={() => onNavigate("investors", "active24h")}
        />
      )}
      {pendingAccessCount === 0 && actionGroups.followUpNow.length === 0 && actionGroups.heatingUpList.length === 0 && actionGroups.activeNow.length === 0 && (
        <div style={cardStyle}>
          <div style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text500, textAlign: "center", padding: "12px 0" }}>
            No urgent actions right now. Check back later.
          </div>
        </div>
      )}
      <div style={{ ...sectionLabel, marginTop: 20, marginBottom: 12 }}>Overview</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <SummaryCardCompact value={summary.totalInvestors} label="Investors" />
        <SummaryCardCompact value={summary.activeToday} label="Active today" />
        <SummaryCardCompact value={summary.totalTime} label="Total time" />
        <SummaryCardCompact value={summary.avgPages} label="Avg pages" />
      </div>
    </div>
  );
}

function SummaryCardCompact({ value, label }) {
  return (
    <div style={{ ...cardStyle, textAlign: "center", padding: "14px 12px", marginBottom: 0 }}>
      <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: COLORS.green900, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: SANS, fontSize: 11, color: COLORS.text400, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
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
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.text900, wordBreak: "break-all", flex: 1, marginRight: 8 }}>{inv.email}</span>
          <IntentBadge score={inv.intentScore} heatingUp={inv.heatingUp} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <MetricPill label="Visits" value={inv.visits} />
          <MetricPill label="Time" value={inv.timeSpent} />
          <MetricPill label="Last" value={inv.lastActive} />
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: inv.intentScore >= 50 ? COLORS.green700 : COLORS.text500, marginTop: 8 }}>
          {inv.suggestedNextStep}
        </div>
      </button>
      {isOpen && (
        <div style={{ padding: "0 16px 16px", background: COLORS.cream50, borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ ...sectionLabel, marginTop: 14, marginBottom: 10 }}>Tab breakdown</div>
          {inv.tabs.map(tab => (
            <div key={tab.tabId} style={{ display: "flex", alignItems: "center", padding: "5px 0" }}>
              <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700, width: 100, flexShrink: 0 }}>{tab.label}</span>
              <BarChart seconds={tab.seconds} maxSeconds={maxTabSeconds} />
              <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900, fontWeight: 600, width: 60, textAlign: "right", flexShrink: 0 }}>{tab.time}</span>
            </div>
          ))}
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
          <td colSpan={6} style={{ padding: "16px 20px 20px 20px", background: COLORS.cream50, borderBottom: `1px solid ${COLORS.border}` }}>
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

function RequestCardMobile({ request, onApprove, onDeny, onCopyLink, approving, copiedEmail }) {
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
        <button onClick={() => onCopyLink(request.email)} style={{ ...btnSmall(false), width: "100%", background: copiedEmail === request.email ? COLORS.green600 : COLORS.green800 }}>
          {copiedEmail === request.email ? "Copied!" : "Copy invite link"}
        </button>
      )}
    </div>
  );
}

// --- Mobile Invite Card ---

function InviteCardMobile({ item, onCopyLink, copiedEmail }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.text900, wordBreak: "break-all", flex: 1, marginRight: 8 }}>{item.email}</span>
        <StatusBadge status={item.status} />
      </div>
      <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500, marginBottom: 10 }}>
        {item.invited_at ? formatRequestDate(item.invited_at) : "Direct invite"}
      </div>
      <button onClick={() => onCopyLink(item.email)} style={{ ...btnSmall(false), width: "100%", background: copiedEmail === item.email ? COLORS.green600 : COLORS.green800 }}>
        {copiedEmail === item.email ? "Copied!" : "Copy invite link"}
      </button>
    </div>
  );
}

// --- Mobile Page Analytics Card ---

function PageCardMobile({ page }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: COLORS.text900, marginBottom: 8 }}>{page.label}</div>
      <div style={{ display: "flex", gap: 16 }}>
        <MetricPill label="Viewers" value={page.uniqueViewers} />
        <MetricPill label="Avg" value={page.avgTime} />
        <MetricPill label="Total" value={page.totalTime} />
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
  pages,
  totalInvestors,
  allowedEmails = [],
  accessRequestsNew = [],
  notificationRecipients = [],
  actionGroups = { activeNow: [], followUpNow: [], heatingUpList: [], staleHighIntent: [] },
  onLoadMore = null,
  hasMore = false,
  loadingMore = false,
}) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState({});
  const [view, setView] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
      return "today";
    }
    return "investors";
  });
  const [filter, setFilter] = useState("all");
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

  const toggle = (email) => setExpanded(prev => ({ ...prev, [email]: !prev[email] }));

  useEffect(() => {
    if (!approveModal) return;
    const onKeyDown = (e) => { if (e.key === "Escape") setApproveModal(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [approveModal]);

  const handleNavigate = useCallback((targetView, targetFilter) => {
    setView(targetView);
    if (targetFilter) setFilter(targetFilter);
    else setFilter("all");
  }, []);

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
  }, [view, accessDataLoaded, fetchAccessSnapshot]);

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

  // --- Filtering + Sorting ---

  const filteredInvestors = useMemo(
    () => investors.filter((inv) => !revoked.has(inv.email)),
    [investors, revoked]
  );
  const activeEmails = useMemo(
    () => new Set(actionGroups.activeNow.map((i) => i.email)),
    [actionGroups.activeNow]
  );
  const followUpEmails = useMemo(
    () => new Set(actionGroups.followUpNow.map((i) => i.email)),
    [actionGroups.followUpNow]
  );
  const heatingUpEmails = useMemo(
    () => new Set(actionGroups.heatingUpList.map((i) => i.email)),
    [actionGroups.heatingUpList]
  );
  const staleEmails = useMemo(
    () => new Set(actionGroups.staleHighIntent.map((i) => i.email)),
    [actionGroups.staleHighIntent]
  );

  const chipFilteredInvestors = useMemo(
    () =>
      filteredInvestors.filter((inv) => {
        if (filter === "all") return true;
        if (filter === "active24h") return activeEmails.has(inv.email);
        if (filter === "followUp") return followUpEmails.has(inv.email);
        if (filter === "heatingUp") return heatingUpEmails.has(inv.email);
        if (filter === "stale") return staleEmails.has(inv.email);
        return true;
      }),
    [filteredInvestors, filter, activeEmails, followUpEmails, heatingUpEmails, staleEmails]
  );

  const sortedInvestors = useMemo(
    () =>
      [...chipFilteredInvestors].sort((a, b) => {
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
    [chipFilteredInvestors, sortKey, sortDir]
  );
  const legacyPendingCount = 0;
  const legacyRequests = [];

  const investorByEmail = useMemo(
    () => new Map(investors.map((inv) => [inv.email.toLowerCase(), inv])),
    [investors]
  );

  const accessRows = useMemo(() => {
    const accessByEmail = new Map();
    for (const invite of allowedEmailsState) {
      const email = invite.email?.toLowerCase();
      if (!email) continue;
      accessByEmail.set(email, {
        email,
        invitedAt: invite.invited_at || null,
        requestStatus: null,
        requestId: null,
        requestedAt: null,
        hasInvite: true,
      });
    }

    for (const req of accessRequestsState) {
      const email = req.email?.toLowerCase();
      if (!email) continue;
      const existing = accessByEmail.get(email) || {
        email,
        invitedAt: null,
        requestStatus: null,
        requestId: null,
        requestedAt: null,
        hasInvite: false,
      };
      accessByEmail.set(email, {
        ...existing,
        requestStatus: req.status,
        requestId: req.id,
        requestedAt: req.requested_at || null,
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
        const aTs = new Date(a.invitedAt || a.requestedAt || 0).getTime();
        const bTs = new Date(b.invitedAt || b.requestedAt || 0).getTime();
        return bTs - aTs;
      });
  }, [allowedEmailsState, accessRequestsState, investorByEmail]);

  const pendingAccessRows = useMemo(
    () => accessRows.filter((row) => row.status !== "active"),
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
        { id: "today", label: "Today" },
        { id: "investors", label: "Investors" },
        { id: "access", label: `Access${pendingAccessCountLive > 0 ? ` (${pendingAccessCountLive})` : ""}` },
        { id: "pages", label: "Pages" },
        { id: "settings", label: "Settings" },
      ]
    : [
        { id: "investors", label: "Investors" },
        { id: "pages", label: "Page Analytics" },
        { id: "access", label: `Access${pendingAccessCountLive > 0 ? ` (${pendingAccessCountLive})` : ""}` },
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
            Investor Analytics
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
              <button key={v.id} onClick={() => { setView(v.id); if (v.id !== "investors") setFilter("all"); }} style={tabStyle(view === v.id)}>
                {v.label}
              </button>
            )
          ))}
        </div>

        {/* ========== TODAY (mobile only) ========== */}
        {view === "today" && (
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: 16 }}>
            <TodayDashboard
              actionGroups={actionGroups}
              pendingAccessCount={pendingAccessCountLive}
              summary={summary}
              onNavigate={handleNavigate}
            />
          </div>
        )}

        {/* ========== INVESTORS ========== */}
        {view === "investors" && (
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            {/* Filter chips */}
            <div style={{ padding: isMobile ? "12px 12px 8px" : "12px 16px 8px", display: "flex", gap: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
              <FilterChip label="All" active={filter === "all"} count={filteredInvestors.length} onClick={() => setFilter("all")} />
              {actionGroups.followUpNow.length > 0 && <FilterChip label="Follow up" active={filter === "followUp"} count={actionGroups.followUpNow.length} onClick={() => setFilter("followUp")} />}
              {actionGroups.heatingUpList.length > 0 && <FilterChip label="Heating up" active={filter === "heatingUp"} count={actionGroups.heatingUpList.length} onClick={() => setFilter("heatingUp")} />}
              {actionGroups.activeNow.length > 0 && <FilterChip label="Active 24h" active={filter === "active24h"} count={actionGroups.activeNow.length} onClick={() => setFilter("active24h")} />}
              {actionGroups.staleHighIntent.length > 0 && <FilterChip label="Re-engage" active={filter === "stale"} count={actionGroups.staleHighIntent.length} onClick={() => setFilter("stale")} />}
            </div>

            {sortedInvestors.length === 0 && investors.length === 0 && accessRows.length === 0 ? (
              <EmptyState title="No investor activity yet" description="Analytics will appear here as investors access the deal room." />
            ) : sortedInvestors.length === 0 ? (
              <EmptyState title="No investors match this filter" description="Try a different filter." />
            ) : isMobile ? (
              <div style={{ padding: "8px 12px 12px" }}>
                {sortedInvestors.map(inv => (
                  <InvestorCard key={inv.email} inv={inv} isOpen={!!expanded[inv.email]} onToggle={() => toggle(inv.email)} onRevoke={handleRevoke} revoking={revoking} />
                ))}
                {onLoadMore && hasMore && (
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.white,
                      borderRadius: 8,
                      padding: "10px 12px",
                      cursor: loadingMore ? "not-allowed" : "pointer",
                      color: COLORS.text700,
                      fontFamily: SANS,
                      fontSize: 13,
                    }}
                  >
                    {loadingMore ? "Loading..." : "Load more investors"}
                  </button>
                )}
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
                {onLoadMore && hasMore && (
                  <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}` }}>
                    <button
                      type="button"
                      onClick={onLoadMore}
                      disabled={loadingMore}
                      style={{
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.white,
                        borderRadius: 8,
                        padding: "10px 14px",
                        cursor: loadingMore ? "not-allowed" : "pointer",
                        color: COLORS.text700,
                        fontFamily: SANS,
                        fontSize: 13,
                      }}
                    >
                      {loadingMore ? "Loading..." : "Load more investors"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========== PAGE ANALYTICS ========== */}
        {view === "pages" && (
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            {isMobile ? (
              <div style={{ padding: "12px 12px" }}>
                {pages.map(page => (
                  <PageCardMobile key={page.tabId} page={page} />
                ))}
                {/* Funnel */}
                <div style={{ ...sectionLabel, marginTop: 16, marginBottom: 12 }}>
                  Funnel{totalInvestors > 0 ? ` (of ${totalInvestors})` : ""}
                </div>
                {pages.filter(p => p.uniqueViewers > 0).sort((a, b) => b.uniqueViewers - a.uniqueViewers).map(page => (
                  <div key={page.tabId} style={{ display: "flex", alignItems: "center", padding: "5px 0" }}>
                    <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text700, width: 90, flexShrink: 0 }}>{page.label}</span>
                    <FunnelBar count={page.uniqueViewers} total={totalInvestors} />
                    <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text900, fontWeight: 600, width: 50, textAlign: "right", flexShrink: 0 }}>
                      {page.uniqueViewers} ({totalInvestors > 0 ? Math.round((page.uniqueViewers / totalInvestors) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: COLORS.cream100 }}>
                      <th style={th}>Page</th>
                      <th style={{ ...th, textAlign: "right" }}>Unique Viewers</th>
                      <th style={{ ...th, textAlign: "right" }}>Avg Time</th>
                      <th style={{ ...th, textAlign: "right" }}>Total Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map(page => (
                      <tr key={page.tabId}>
                        <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{page.label}</span></td>
                        <td style={{ ...td, textAlign: "right" }}>{page.uniqueViewers}</td>
                        <td style={{ ...td, textAlign: "right" }}>{page.avgTime}</td>
                        <td style={{ ...td, textAlign: "right" }}>{page.totalTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: "28px 20px", borderTop: `1px solid ${COLORS.border}` }}>
                  <div style={{ ...sectionLabel, marginBottom: 16 }}>
                    Funnel{totalInvestors > 0 ? ` (of ${totalInvestors} total investors)` : ""}
                  </div>
                  {pages.filter(p => p.uniqueViewers > 0).sort((a, b) => b.uniqueViewers - a.uniqueViewers).map(page => (
                    <div key={page.tabId} style={{ display: "flex", alignItems: "center", padding: "5px 0" }}>
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text700, width: 140, flexShrink: 0 }}>{page.label}</span>
                      <FunnelBar count={page.uniqueViewers} total={totalInvestors} />
                      <span style={{ fontFamily: SANS, fontSize: 13, color: COLORS.text900, fontWeight: 600, width: 30, textAlign: "right", flexShrink: 0 }}>{page.uniqueViewers}</span>
                      <span style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text400, width: 50, textAlign: "right", flexShrink: 0 }}>
                        ({totalInvestors > 0 ? Math.round((page.uniqueViewers / totalInvestors) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
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

            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <thead>
                <tr style={{ background: COLORS.cream100 }}>
                  <th style={th}>Email</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: "right" }}>Last Active</th>
                  <th style={{ ...th, textAlign: "right" }}>Visits</th>
                  <th style={{ ...th, width: 340 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingAccessRows.map((row) => (
                  <tr key={row.email}>
                    <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{row.email}</span></td>
                    <td style={td}><StatusBadge status={row.status} /></td>
                    <td style={{ ...td, textAlign: "right" }}>{row.lastActive}</td>
                    <td style={{ ...td, textAlign: "right" }}>{row.visits}</td>
                    <td style={td}>
                      {row.status === "pending" && (
                        <>
                          <button onClick={() => setApproveModal({ email: row.email })} disabled={approving === row.email} style={{ ...btnSmall(approving === row.email), marginRight: 8 }}>Approve</button>
                          <button onClick={() => handleApproveDeny(row.email, "deny")} disabled={approving === row.email} style={{ ...btnDanger(approving === row.email), marginRight: 8 }}>Deny</button>
                        </>
                      )}
                      {(row.status === "pending_login" || row.status === "active") && (
                        <button type="button" onClick={() => copyInviteLink(row.email)} style={{ ...btnSmall(false), marginRight: 8, background: copiedEmail === row.email ? COLORS.green600 : COLORS.green800 }}>
                          {copiedEmail === row.email ? "Copied!" : "Copy link"}
                        </button>
                      )}
                      {row.status === "pending_login" && (
                        <button type="button" onClick={() => handleSendReminder(row.email)} disabled={reminding === row.email} style={{ ...btnOutline, minHeight: 32, padding: "8px 12px" }}>
                          {reminding === row.email ? "Sending..." : "Send reminder"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pendingAccessRows.length === 0 && <EmptyState title="No access rows yet" description="Invite someone above to get started." />}
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
                  <InviteCardMobile key={a.id} item={a} onCopyLink={copyInviteLink} copiedEmail={copiedEmail} />
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
                      <th style={{ ...th, width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowedEmailsState.map((a) => (
                      <tr key={a.id}>
                        <td style={td}><span style={{ fontWeight: 600, color: COLORS.text900 }}>{a.email}</span></td>
                        <td style={td}><StatusBadge status={a.status} /></td>
                        <td style={td}>{formatRequestDate(a.invited_at)}</td>
                        <td style={td}>
                          <button type="button" onClick={() => copyInviteLink(a.email)} style={{ ...btnSmall(false), background: copiedEmail === a.email ? COLORS.green600 : COLORS.green800 }}>
                            {copiedEmail === a.email ? "Copied!" : "Copy link"}
                          </button>
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
                            <button type="button" onClick={() => copyInviteLink(r.email)} style={{ ...btnSmall(false), background: copiedEmail === r.email ? COLORS.green600 : COLORS.green800 }}>
                              {copiedEmail === r.email ? "Copied!" : "Copy link"}
                            </button>
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
