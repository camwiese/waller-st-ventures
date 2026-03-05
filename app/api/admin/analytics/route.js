import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { isAdminEmail } from "../../../../lib/admin";
import { TAB_WEIGHTS, TAB_LABELS, TAB_ORDER } from "../../../../constants/tabs";
import {
  computeRawIntentScore,
  getRecencyFactor,
  getSuggestedNextStep,
  isHeatingUp,
  groupIntoSessions,
} from "../../../../lib/intentScore";

export const revalidate = 300;

const PAGE_VIEWS_COLS = "user_email, tab_id, time_spent_seconds, created_at";
const PAGE_VIEWS_LIMIT = 5000;

function relativeTime(dateStr) {
  const now = new Date();
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

function fmtTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

function fmtHours(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

function formatSessionDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function groupIntoSessionsForDisplay(records) {
  const sessions = groupIntoSessions(records);
  return sessions.reverse();
}

function parseRangeParam(range) {
  const value = (range || "30d").toLowerCase().trim();
  if (value === "all") return null;
  if (value.endsWith("d")) {
    const days = Number.parseInt(value.replace("d", ""), 10);
    if (!Number.isFinite(days) || days <= 0) return 30;
    return days;
  }
  return 30;
}

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLocalDevBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (!isLocalDevBypass && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dealSlug = searchParams.get("dealSlug") || process.env.DEFAULT_DEAL_SLUG || "pst";
  const rangeParam = searchParams.get("range") || "30d";
  const cursor = Math.max(0, Number.parseInt(searchParams.get("cursor") || "0", 10));
  const limit = Math.min(200, Math.max(10, Number.parseInt(searchParams.get("limit") || "50", 10)));

  const serviceClient = createServiceClient();
  let pageViewsQuery = serviceClient
    .from("page_views")
    .select(PAGE_VIEWS_COLS)
    .eq("deal_slug", dealSlug)
    .order("created_at", { ascending: false })
    .limit(PAGE_VIEWS_LIMIT);

  const rangeDays = parseRangeParam(rangeParam);
  if (rangeDays) {
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
    pageViewsQuery = pageViewsQuery.gte("created_at", since);
  }

  const [pageViewsResult, revokedResult] = await Promise.all([
    pageViewsQuery,
    serviceClient.from("revoked_emails").select("email"),
  ]);

  const { data: rows, error } = pageViewsResult;
  if (error) {
    return NextResponse.json({ error: error.message || "Failed to load analytics" }, { status: 500 });
  }

  const excludeEmails = new Set(
    (process.env.ANALYTICS_EXCLUDE_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  const revokedEmails = new Set(
    (revokedResult.data || []).map((r) => r.email?.toLowerCase()).filter(Boolean)
  );
  const displayExclude = new Set([...excludeEmails, ...revokedEmails]);
  const allRows = (rows || []).filter((r) => !displayExclude.has(r.user_email?.toLowerCase()));

  const byEmail = {};
  for (const row of allRows) {
    if (!byEmail[row.user_email]) {
      byEmail[row.user_email] = { records: [] };
    }
    byEmail[row.user_email].records.push(row);
  }

  const uniqueEmails = Object.keys(byEmail);
  const totalSeconds = allRows.reduce((sum, r) => sum + r.time_spent_seconds, 0);
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const activeToday = uniqueEmails.filter(email =>
    byEmail[email].records.some(r => new Date(r.created_at) > oneDayAgo)
  ).length;

  const avgPages = uniqueEmails.length > 0
    ? (allRows.length / uniqueEmails.length).toFixed(1)
    : "0";

  const summary = {
    totalInvestors: uniqueEmails.length,
    totalTime: fmtHours(totalSeconds),
    avgPages: parseFloat(avgPages),
    activeToday,
  };

  const investorsAll = uniqueEmails.map(email => {
    const records = byEmail[email].records;
    const sessionGroups = groupIntoSessionsForDisplay(records);
    const visits = sessionGroups.length;
    const invTotalSeconds = records.reduce((s, r) => s + r.time_spent_seconds, 0);
    const lastActiveTs = records.reduce((latest, r) =>
      r.created_at > latest ? r.created_at : latest, records[0].created_at);

    const tabMap = {};
    for (const r of records) {
      if (!tabMap[r.tab_id]) tabMap[r.tab_id] = { count: 0, seconds: 0 };
      tabMap[r.tab_id].count += 1;
      tabMap[r.tab_id].seconds += r.time_spent_seconds;
    }

    const rawIntentScore = computeRawIntentScore(records, TAB_WEIGHTS, groupIntoSessions);
    const recencyFactor = getRecencyFactor(lastActiveTs);
    const intentScore = Math.round(rawIntentScore * recencyFactor);
    const suggestedNextStep = getSuggestedNextStep(intentScore);
    const heatingUp = isHeatingUp(records, TAB_WEIGHTS, groupIntoSessions);

    const tabs = Object.entries(tabMap)
      .map(([tabId, data]) => ({
        tabId,
        label: TAB_LABELS[tabId] || tabId,
        count: data.count,
        seconds: data.seconds,
        time: fmtTime(data.seconds),
        weight: TAB_WEIGHTS[tabId] || 1,
      }))
      .sort((a, b) => b.seconds - a.seconds);

    const sessions = sessionGroups.map(sessionRecords => ({
      date: formatSessionDate(sessionRecords[0].created_at),
      totalTime: fmtTime(
        sessionRecords.reduce((sum, record) => sum + record.time_spent_seconds, 0)
      ),
      events: sessionRecords.map(r => ({
        tabId: r.tab_id,
        label: TAB_LABELS[r.tab_id] || r.tab_id,
        time: fmtTime(r.time_spent_seconds),
      })),
    }));

    return {
      email,
      visits,
      totalSeconds: invTotalSeconds,
      timeSpent: fmtTime(invTotalSeconds),
      lastActive: relativeTime(lastActiveTs),
      intentScore,
      suggestedNextStep,
      heatingUp,
      tabs,
      sessions,
    };
  });

  investorsAll.sort((a, b) => b.intentScore - a.intentScore);

  const investors = investorsAll.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < investorsAll.length ? cursor + limit : null;

  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const activeNow = investors.filter(inv =>
    byEmail[inv.email].records.some(r => new Date(r.created_at) > oneDayAgo)
  );
  const followUpNow = investors.filter(inv =>
    inv.intentScore >= 20 && inv.suggestedNextStep !== "Wait for signal"
  );
  const heatingUpList = investors.filter(inv => inv.heatingUp);
  const staleHighIntent = investors.filter(inv => {
    const lastTs = byEmail[inv.email].records.reduce((latest, r) =>
      r.created_at > latest ? r.created_at : latest, byEmail[inv.email].records[0].created_at);
    return inv.intentScore >= 20 && new Date(lastTs) < sevenDaysAgo;
  });

  const actionGroups = {
    activeNow,
    followUpNow,
    heatingUpList,
    staleHighIntent,
  };

  const pages = TAB_ORDER.map(tabId => {
    const relevantRows = allRows.filter(r => r.tab_id === tabId);
    const viewers = new Set(relevantRows.map(r => r.user_email));
    const pageTotalSeconds = relevantRows.reduce((s, r) => s + r.time_spent_seconds, 0);
    const avgSeconds = viewers.size > 0 ? Math.round(pageTotalSeconds / viewers.size) : 0;
    return {
      tabId,
      label: TAB_LABELS[tabId],
      uniqueViewers: viewers.size,
      avgTime: fmtTime(avgSeconds),
      totalTime: fmtTime(pageTotalSeconds),
      totalSeconds: pageTotalSeconds,
    };
  });

  return NextResponse.json({
    summary,
    investors,
    pages,
    actionGroups,
    totalInvestors: summary.totalInvestors,
    cursor,
    nextCursor,
    range: rangeParam,
  });
}
