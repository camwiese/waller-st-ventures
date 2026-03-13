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
});
