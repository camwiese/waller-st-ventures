import { describe, expect, it } from "vitest";
import { buildAdminAnalytics } from "./adminAnalytics";

describe("buildAdminAnalytics", () => {
  it("builds an investors-first payload from page view data", () => {
    const now = new Date("2026-03-13T12:00:00.000Z");
    const analytics = buildAdminAnalytics({
      now,
      pageViews: [
        {
          user_email: "alice@example.com",
          tab_id: "memo",
          time_spent_seconds: 180,
          created_at: "2026-03-13T11:45:00.000Z",
        },
        {
          user_email: "alice@example.com",
          tab_id: "terms",
          time_spent_seconds: 240,
          created_at: "2026-03-13T11:55:00.000Z",
        },
        {
          user_email: "bob@example.com",
          tab_id: "overview",
          time_spent_seconds: 60,
          created_at: "2026-03-01T10:00:00.000Z",
        },
        {
          user_email: "hidden@example.com",
          tab_id: "deck",
          time_spent_seconds: 300,
          created_at: "2026-03-13T11:00:00.000Z",
        },
      ],
      revokedEmails: ["hidden@example.com"],
      allowedEmails: [
        {
          email: "alice@example.com",
          invited_by_email: "cam@example.com",
          invited_by_name: "Cam",
        },
      ],
    });

    expect(analytics.summary.totalInvestors).toBe(2);
    expect(analytics.summary.activeToday).toBe(1);
    expect(analytics.totalInvestors).toBe(2);
    expect(analytics.investors).toHaveLength(2);
    expect(analytics.investors[0].email).toBe("alice@example.com");
    expect(analytics.investors[0].invitedByName).toBe("Cam");
    expect(analytics.investors[0].tabs[0].label).toBe("Investment Terms");
    expect(analytics.actionGroups.activeNow.map((investor) => investor.email)).toEqual([
      "alice@example.com",
    ]);
  });

  it("keeps data room video metrics separate from share-link engagement", () => {
    const analytics = buildAdminAnalytics({
      now: new Date("2026-03-13T12:00:00.000Z"),
      pageViews: [
        {
          user_email: "alice@example.com",
          tab_id: "interview",
          time_spent_seconds: 120,
          created_at: "2026-03-13T11:50:00.000Z",
        },
      ],
      videoViews: [
        {
          user_email: "alice@example.com",
          duration_seconds: 90,
          max_position_seconds: 90,
          total_duration_seconds: 300,
        },
      ],
      shareViews: [
        {
          user_email: "alice@example.com",
          content_type: "podcast",
          duration_seconds: 45,
          max_position_seconds: 180,
          total_duration_seconds: 300,
          created_at: "2026-03-13T11:57:00.000Z",
        },
      ],
    });

    expect(analytics.investors).toHaveLength(1);
    expect(analytics.investors[0].videoEngagement).toEqual({
      totalPlayTime: "1m 30s",
      totalPlaySeconds: 90,
      percentWatched: 30,
      sessions: 1,
    });
    expect(analytics.investors[0].shareEngagement).toEqual({
      podcast: {
        totalPlayTime: "45s",
        totalPlaySeconds: 45,
        percentWatched: 60,
        sessions: 1,
        lastViewedAt: "2026-03-13T11:57:00.000Z",
      },
    });
  });
});
