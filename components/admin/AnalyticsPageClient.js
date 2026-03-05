"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AnalyticsTable from "./AnalyticsTable";
import { COLORS, SANS } from "../../constants/theme";

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export default function AnalyticsPageClient({ dealSlug }) {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAnalytics = useCallback(async (nextCursor = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        dealSlug,
        range,
        cursor: String(nextCursor),
        limit: "50",
      });
      const res = await fetch(`/api/admin/analytics?${query.toString()}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load analytics");
      }
      setData((prev) => {
        if (!append || !prev) return payload;
        return {
          ...payload,
          investors: [...(prev.investors || []), ...(payload.investors || [])],
        };
      });
      setCursor(nextCursor);
      setHasMore(payload.nextCursor != null);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [dealSlug, range]);

  useEffect(() => {
    setData(null);
    setCursor(0);
    loadAnalytics(0, false);
  }, [loadAnalytics, range]);

  const rangeLabel = useMemo(
    () => RANGE_OPTIONS.find((opt) => opt.value === range)?.label || "Last 30 days",
    [range]
  );

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "var(--font-sans)", background: COLORS.cream50, minHeight: "100vh", color: COLORS.text900 }}>
        <p style={{ marginTop: 0 }}>Error loading analytics: {error}</p>
        <button
          type="button"
          onClick={() => loadAnalytics(0, false)}
          style={{
            border: `1px solid ${COLORS.border}`,
            background: COLORS.white,
            borderRadius: 6,
            padding: "8px 12px",
            cursor: "pointer",
            fontFamily: SANS,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || loading) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.cream50, padding: 24 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ height: 18, width: 220, background: COLORS.cream200, borderRadius: 6, marginBottom: 12 }} />
          <div style={{ height: 12, width: 140, background: COLORS.cream200, borderRadius: 6 }} />
          <div style={{ height: 220, marginTop: 24, background: COLORS.cream100, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontFamily: SANS, fontSize: 12, color: COLORS.text500 }}>
            Range: {rangeLabel}{lastUpdated ? ` · Updated ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{
              padding: "8px 10px",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              fontFamily: SANS,
              fontSize: 12,
              background: COLORS.white,
              color: COLORS.text700,
            }}
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <AnalyticsTable
        summary={data.summary}
        investors={data.investors || []}
        pages={data.pages || []}
        totalInvestors={data.totalInvestors || 0}
        allowedEmails={[]}
        accessRequestsNew={[]}
        notificationRecipients={[]}
        actionGroups={data.actionGroups || { activeNow: [], followUpNow: [], heatingUpList: [], staleHighIntent: [] }}
        onLoadMore={hasMore ? () => loadAnalytics((data.nextCursor ?? 0), true) : null}
        loadingMore={loadingMore}
        hasMore={hasMore}
      />
    </div>
  );
}
