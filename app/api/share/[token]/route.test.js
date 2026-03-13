import { beforeEach, describe, expect, it, vi } from "vitest";

const mockShareTokenSingle = vi.fn();
const mockShareTokenUpdate = vi.fn();
const mockShareTokenUpdateEq = vi.fn();
const mockSignPlaybackId = vi.fn();

const mockServiceClient = {
  from: vi.fn((table) => {
    if (table !== "share_tokens") {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockShareTokenSingle,
        })),
      })),
      update: mockShareTokenUpdate,
    };
  }),
};

vi.mock("../../../../lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => mockServiceClient),
}));

vi.mock("@mux/mux-node", () => ({
  default: class MockMux {
    constructor() {
      this.jwt = {
        signPlaybackId: mockSignPlaybackId,
      };
    }
  },
}));

describe("GET /api/share/[token]", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      MUX_TOKEN_ID: "mux-token-id",
      MUX_TOKEN_SECRET: "mux-token-secret",
      MUX_SIGNING_KEY_ID: "mux-signing-key-id",
      MUX_SIGNING_KEY_PRIVATE: "mux-signing-key-private",
      MUX_PLAYBACK_ID: "playback-id",
    };

    mockShareTokenUpdateEq.mockResolvedValue({ error: null });
    mockShareTokenUpdate.mockReturnValue({
      eq: mockShareTokenUpdateEq,
    });
    mockSignPlaybackId.mockReturnValue("signed-playback-token");
  });

  it("increments the share-token view count and returns video-only podcast data", async () => {
    mockShareTokenSingle.mockResolvedValue({
      data: {
        id: "share-token-id",
        token: "share-token",
        email: "investor@example.com",
        content_type: "podcast",
        is_active: true,
        deal_slug: "pst",
        view_count: 3,
      },
      error: null,
    });

    const { GET } = await import("./route.js");
    const response = await GET(new Request("http://localhost/api/share/share-token"), {
      params: { token: "share-token" },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      contentType: "podcast",
      playbackId: "playback-id",
      token: "signed-playback-token",
      email: "investor@example.com",
    });
    expect(mockShareTokenUpdate).toHaveBeenCalledWith({
      view_count: 4,
      last_viewed_at: expect.any(String),
    });
    expect(mockShareTokenUpdateEq).toHaveBeenCalledWith("id", "share-token-id");
    expect(mockSignPlaybackId).toHaveBeenCalledWith("playback-id", {
      keyId: "mux-signing-key-id",
      keySecret: "mux-signing-key-private",
      expiration: "2h",
    });
  });

  it("returns 410 for an inactive link without updating counters", async () => {
    mockShareTokenSingle.mockResolvedValue({
      data: {
        id: "share-token-id",
        token: "share-token",
        email: "investor@example.com",
        content_type: "podcast",
        is_active: false,
        deal_slug: "pst",
        view_count: 3,
      },
      error: null,
    });

    const { GET } = await import("./route.js");
    const response = await GET(new Request("http://localhost/api/share/share-token"), {
      params: { token: "share-token" },
    });
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toBe("This link is no longer available");
    expect(mockShareTokenUpdate).not.toHaveBeenCalled();
    expect(mockSignPlaybackId).not.toHaveBeenCalled();
  });
});
