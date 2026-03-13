import { TAB_LABELS, TAB_WEIGHTS } from "../constants/tabs";
import {
  computeRawIntentScore,
  getRecencyFactor,
  getSuggestedNextStep,
  groupIntoSessions,
  isHeatingUp,
} from "./intentScore";
import { createServiceClient } from "./supabase/server";

const PAGE_VIEW_COLUMNS = "user_email, tab_id, time_spent_seconds, created_at";

function relativeTime(dateStr, now = new Date()) {
  const then = new Date(dateStr);
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return `${Math.floor(days / 30)}mo ago`;
}

function formatSessionDate(dateStr) {
  const date = new Date(dateStr);
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? `${minutes}m ${seconds.toString().padStart(2, "0")}s`
    : `${seconds}s`;
}

function formatHours(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  return `${minutes}m`;
}

function groupIntoSessionsForDisplay(records) {
  return groupIntoSessions(records).reverse();
}

export function buildAdminAnalytics({
  pageViews = [],
  revokedEmails = [],
  allowedEmails = [],
  excludeEmails = [],
  now = new Date(),
}) {
  const revoked = new Set(
    revokedEmails.map((email) => email?.toLowerCase()).filter(Boolean)
  );
  const excluded = new Set(
    excludeEmails.map((email) => email?.toLowerCase()).filter(Boolean)
  );
  const hiddenEmails = new Set([...revoked, ...excluded]);

  const invitedByMap = new Map();
  for (const row of allowedEmails) {
    const email = row.email?.toLowerCase();
    if (!email) continue;
    invitedByMap.set(email, {
      invitedByEmail: row.invited_by_email || null,
      invitedByName: row.invited_by_name || null,
    });
  }

  const byEmail = new Map();
  const visibleRows = [];
  for (const row of pageViews) {
    const email = row.user_email?.toLowerCase();
    if (!email || hiddenEmails.has(email)) continue;
    const normalizedRow = { ...row, user_email: email };
    visibleRows.push(normalizedRow);
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(normalizedRow);
  }

  const oneDayAgoMs = now.getTime() - 24 * 60 * 60 * 1000;
  const sevenDaysAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const totalSeconds = visibleRows.reduce(
    (sum, row) => sum + (row.time_spent_seconds || 0),
    0
  );

  const investors = [...byEmail.entries()]
    .map(([email, records]) => {
      const sessions = groupIntoSessionsForDisplay(records);
      const visits = sessions.length;
      const totalInvestorSeconds = records.reduce(
        (sum, row) => sum + (row.time_spent_seconds || 0),
        0
      );
      const lastActiveTs = records.reduce(
        (latest, row) =>
          row.created_at > latest ? row.created_at : latest,
        records[0]?.created_at || now.toISOString()
      );

      const tabMap = {};
      for (const row of records) {
        if (!tabMap[row.tab_id]) {
          tabMap[row.tab_id] = { count: 0, seconds: 0 };
        }
        tabMap[row.tab_id].count += 1;
        tabMap[row.tab_id].seconds += row.time_spent_seconds || 0;
      }

      const rawIntentScore = computeRawIntentScore(
        records,
        TAB_WEIGHTS,
        groupIntoSessions
      );
      const intentScore = Math.round(
        rawIntentScore * getRecencyFactor(lastActiveTs)
      );

      const tabs = Object.entries(tabMap)
        .map(([tabId, data]) => ({
          tabId,
          label: TAB_LABELS[tabId] || tabId,
          count: data.count,
          seconds: data.seconds,
          time: formatDuration(data.seconds),
          weight: TAB_WEIGHTS[tabId] || 1,
        }))
        .sort((a, b) => b.seconds - a.seconds);

      const invitedBy = invitedByMap.get(email) || {};

      return {
        email,
        visits,
        totalSeconds: totalInvestorSeconds,
        timeSpent: formatDuration(totalInvestorSeconds),
        lastActive: relativeTime(lastActiveTs, now),
        intentScore,
        suggestedNextStep: getSuggestedNextStep(intentScore),
        heatingUp: isHeatingUp(records, TAB_WEIGHTS, groupIntoSessions),
        tabs,
        sessions: sessions.map((sessionRecords) => ({
          date: formatSessionDate(sessionRecords[0].created_at),
          totalTime: formatDuration(
            sessionRecords.reduce(
              (sum, record) => sum + (record.time_spent_seconds || 0),
              0
            )
          ),
          events: sessionRecords.map((record) => ({
            tabId: record.tab_id,
            label: TAB_LABELS[record.tab_id] || record.tab_id,
            time: formatDuration(record.time_spent_seconds || 0),
          })),
        })),
        invitedByEmail: invitedBy.invitedByEmail || null,
        invitedByName: invitedBy.invitedByName || null,
        lastActiveAt: lastActiveTs,
      };
    })
    .sort((a, b) => {
      if (b.intentScore !== a.intentScore) return b.intentScore - a.intentScore;
      return new Date(b.lastActiveAt) - new Date(a.lastActiveAt);
    });

  const actionGroups = {
    activeNow: investors.filter(
      (investor) => new Date(investor.lastActiveAt).getTime() > oneDayAgoMs
    ),
    followUpNow: investors.filter(
      (investor) =>
        investor.intentScore >= 20 &&
        investor.suggestedNextStep !== "Wait for signal"
    ),
    heatingUpList: investors.filter((investor) => investor.heatingUp),
    staleHighIntent: investors.filter(
      (investor) =>
        investor.intentScore >= 20 &&
        new Date(investor.lastActiveAt).getTime() < sevenDaysAgoMs
    ),
  };

  const uniqueInvestorCount = investors.length;
  const activeToday = actionGroups.activeNow.length;

  return {
    summary: {
      totalInvestors: uniqueInvestorCount,
      totalTime: formatHours(totalSeconds),
      avgPages:
        uniqueInvestorCount > 0
          ? Number.parseFloat((visibleRows.length / uniqueInvestorCount).toFixed(1))
          : 0,
      activeToday,
    },
    investors: investors.map(({ lastActiveAt, ...investor }) => investor),
    actionGroups,
    totalInvestors: uniqueInvestorCount,
  };
}

export async function getAdminAnalytics({ dealSlug }) {
  const serviceClient = createServiceClient();
  const [pageViewsResult, revokedResult, allowedResult] = await Promise.all([
    serviceClient
      .from("page_views")
      .select(PAGE_VIEW_COLUMNS)
      .eq("deal_slug", dealSlug)
      .order("created_at", { ascending: false }),
    serviceClient.from("revoked_emails").select("email"),
    serviceClient
      .from("allowed_emails")
      .select("email, invited_by_email, invited_by_name"),
  ]);

  if (pageViewsResult.error) {
    throw new Error(pageViewsResult.error.message || "Failed to load analytics");
  }
  if (revokedResult.error) {
    throw new Error(revokedResult.error.message || "Failed to load revoked emails");
  }
  if (allowedResult.error) {
    throw new Error(allowedResult.error.message || "Failed to load invite data");
  }

  const excludeEmails = (process.env.ANALYTICS_EXCLUDE_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return buildAdminAnalytics({
    pageViews: pageViewsResult.data || [],
    revokedEmails: (revokedResult.data || []).map((row) => row.email),
    allowedEmails: allowedResult.data || [],
    excludeEmails,
  });
}
