import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_SHARE_TOKEN_COLUMNS } from "../../../../lib/shareTokens";

const mockSupabase = {};
const mockServiceClient = {
  from: vi.fn(),
};
const mockRequireAdminAccess = vi.fn();

vi.mock("../../../../lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
  createServiceClient: vi.fn(() => mockServiceClient),
}));

vi.mock("../../../../lib/adminAuth", () => ({
  requireAdminAccess: mockRequireAdminAccess,
}));

function createQuery(result) {
  const query = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return query;
}

describe("GET /api/admin/access-snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdminAccess.mockResolvedValue({ email: "admin@example.com" });
  });

  it("returns complete share-token rows for the access table", async () => {
    const selectedColumns = new Map();
    const resultsByTable = {
      allowed_emails: { data: [], error: null },
      access_requests: {
        data: [
          {
            id: "req-1",
            email: "alice@example.com",
            requested_at: "2026-03-13T11:00:00.000Z",
            status: "pending",
            reviewed_at: null,
            reviewed_by: null,
          },
        ],
        error: null,
      },
      access_request_notification_emails: { data: [], error: null },
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

    const { GET } = await import("./route.js");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(selectedColumns.get("share_tokens")).toBe(ADMIN_SHARE_TOKEN_COLUMNS);
    expect(data.pendingAccessCount).toBe(1);
    expect(data.shareTokens).toEqual([
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
