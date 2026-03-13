import { beforeEach, describe, expect, it, vi } from "vitest";

const mockServiceClient = {
  from: vi.fn(),
};

vi.mock("./supabase/server", () => ({
  createServiceClient: vi.fn(() => mockServiceClient),
}));

import { buildAdminAnalytics, getAdminAnalytics } from "./adminAnalytics";
import { ADMIN_SHARE_TOKEN_COLUMNS } from "./shareTokens";

function createQuery(result) {
  const query = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return query;
}

describe("buildAdminAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("loads complete share-token rows for the admin share-link table", async () => {
    const selectedColumns = new Map();
    const resultsByTable = {
      page_views: { data: [], error: null },
      revoked_emails: { data: [], error: null },
      allowed_emails: { data: [], error: null },
      video_view_events: { data: [], error: null },
      share_view_events: { data: [], error: null },
      share_tokens: {
        data: [
          {
            id: "share-1",
            token: "podcast-token",
            email: "alice@example.com",
            content_type: "podcast",
            is_active: true,
            created_at: "2026-03-13T11:00:00.000Z",
            last_viewed_at: null,
            view_count: 0,
            created_by: "cam@example.com",
          },
        ],
        error: null,
      },
    };

    mockServiceClient.from.mockImplementation((table) => ({
      select: vi.fn((columns) => {
        selectedColumns.set(table, columns);
        return createQuery(resultsByTable[table]);
      }),
    }));

    const analytics = await getAdminAnalytics({ dealSlug: "pst" });

    expect(selectedColumns.get("share_tokens")).toBe(ADMIN_SHARE_TOKEN_COLUMNS);
    expect(analytics.shareTokens).toEqual([
      {
        id: "share-1",
        token: "podcast-token",
        email: "alice@example.com",
        content_type: "podcast",
        is_active: true,
        created_at: "2026-03-13T11:00:00.000Z",
        last_viewed_at: null,
        view_count: 0,
        created_by: "cam@example.com",
      },
    ]);
  });
});
