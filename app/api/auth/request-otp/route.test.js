import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn().mockResolvedValue({ error: null });

const buildSelectChain = (finalResult = { data: null, error: null }) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(finalResult),
  };
  return chain;
};

const mockServiceClient = {
  from: vi.fn((table) => {
    if (table === "access_request_notification_emails") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ data: [] }),
        }),
      };
    }
    if (table === "allowed_emails" || table === "access_requests" || table === "otp_attempts") {
      return {
        ...buildSelectChain(),
        insert: mockInsert,
      };
    }
    return { insert: mockInsert };
  }),
};

vi.mock("../../../../lib/supabase/server", () => ({
  createServiceClient: vi.fn(() => mockServiceClient),
}));

describe("POST /api/auth/request-otp", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      GP_EMAIL: "user@example.com",
    };
  });

  it("logs sent and returns success when Supabase returns 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    const { POST } = await import("./route.js");
    const req = new Request("http://localhost/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        status: "sent",
        error_message: null,
      })
    );
  });

  it("logs rate_limited and returns error when Supabase returns 429", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: "over_email_send_rate_limit",
          error_description: "Email rate limit exceeded",
        }),
    });

    const { POST } = await import("./route.js");
    const req = new Request("http://localhost/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error?.message).toContain("Too many attempts");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        status: "rate_limited",
        error_message: expect.any(String),
      })
    );
  });

  it("logs error and returns error for other Supabase errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          message: "Invalid email format",
        }),
    });

    const { POST } = await import("./route.js");
    const req = new Request("http://localhost/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        status: "error",
      })
    );
  });

  it("returns 400 for invalid email", async () => {
    const { POST } = await import("./route.js");
    const req = new Request("http://localhost/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
