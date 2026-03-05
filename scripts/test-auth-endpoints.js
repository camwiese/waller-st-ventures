#!/usr/bin/env node
/**
 * Auth endpoints integration test script
 *
 * Run against a local dev server. Start the server first:
 *   npm run dev
 *
 * Then in another terminal:
 *   node scripts/test-auth-endpoints.js
 *
 * Or with a custom base URL:
 *   BASE_URL=http://localhost:3000 node scripts/test-auth-endpoints.js
 *
 * Optional: Set TEST_ALLOWED_EMAIL to an email on your allowed_emails list to test
 * the full OTP request flow (this will send a real email).
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
    return true;
  }
  failed++;
  console.log(`  ✗ ${message}`);
  return false;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    redirect: "manual",
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON
  }
  return { res, data, text };
}

async function runTests() {
  console.log("\n🔐 Auth Endpoints Integration Tests");
  console.log(`   Base URL: ${BASE_URL}\n`);

  // --- Health check ---
  console.log("1. Server reachability");
  try {
    const health = await fetch(`${BASE_URL}/`);
    assert(health.ok || health.status === 304, "Server is reachable");
  } catch (err) {
    assert(false, `Server reachable: ${err.message}`);
    console.log("\n   Make sure the dev server is running: npm run dev\n");
    process.exit(1);
  }

  // --- POST /api/auth/request-otp ---
  console.log("\n2. POST /api/auth/request-otp");

  const invalidEmailRes = await fetchJson(`${BASE_URL}/api/auth/request-otp`, {
    method: "POST",
    body: JSON.stringify({ email: "not-an-email" }),
  });
  assert(invalidEmailRes.res.status === 400, "Invalid email returns 400");

  const invalidJsonRes = await fetch(`${BASE_URL}/api/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json",
  });
  assert(invalidJsonRes.status === 400, "Invalid JSON returns 400");

  const emptyBodyRes = await fetchJson(`${BASE_URL}/api/auth/request-otp`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert(emptyBodyRes.res.status === 400, "Missing email returns 400");

  // Non-invited email should return 403 with not_invited code
  const notInvitedRes = await fetchJson(`${BASE_URL}/api/auth/request-otp`, {
    method: "POST",
    body: JSON.stringify({ email: "test-not-on-list-12345@example.com" }),
  });
  assert(
    notInvitedRes.res.status === 403 && notInvitedRes.data?.error?.code === "not_invited",
    "Non-invited email returns 403 with not_invited code"
  );

  // --- POST /api/auth/log-login (unauthenticated) ---
  console.log("\n3. POST /api/auth/log-login");

  const logLoginRes = await fetchJson(`${BASE_URL}/api/auth/log-login`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert(logLoginRes.res.status === 401, "Unauthenticated request returns 401");

  // --- GET /api/admin/access-requests (unauthenticated) ---
  console.log("\n4. GET /api/admin/access-requests");

  const accessRequestsGetRes = await fetch(`${BASE_URL}/api/admin/access-requests`);
  assert(accessRequestsGetRes.status === 403, "Unauthenticated GET returns 403");

  // --- POST /api/admin/access-requests (unauthenticated) ---
  console.log("\n5. POST /api/admin/access-requests");

  const accessRequestsPostRes = await fetchJson(`${BASE_URL}/api/admin/access-requests`, {
    method: "POST",
    body: JSON.stringify({ email: "test@example.com", action: "approve" }),
  });
  assert(accessRequestsPostRes.res.status === 403, "Unauthenticated POST returns 403");

  // --- POST /api/admin/invite (unauthenticated) ---
  console.log("\n6. POST /api/admin/invite");

  const inviteRes = await fetchJson(`${BASE_URL}/api/admin/invite`, {
    method: "POST",
    body: JSON.stringify({ email: "newuser@example.com" }),
  });
  assert(inviteRes.res.status === 403, "Unauthenticated invite returns 403");

  // --- POST /api/admin/revoke (unauthenticated) ---
  console.log("\n7. POST /api/admin/revoke");

  const revokeRes = await fetchJson(`${BASE_URL}/api/admin/revoke`, {
    method: "POST",
    body: JSON.stringify({ email: "someone@example.com" }),
  });
  assert(revokeRes.res.status === 403, "Unauthenticated revoke returns 403");

  // --- GET /api/admin/access-requests/respond (invalid token) ---
  console.log("\n8. GET /api/admin/access-requests/respond");

  const respondRes = await fetch(
    `${BASE_URL}/api/admin/access-requests/respond?token=invalid-token-123&action=approve`,
    { redirect: "manual" }
  );
  const isRedirect = respondRes.status >= 300 && respondRes.status < 400;
  const location = respondRes.headers.get("location") || "";
  assert(
    isRedirect && location.includes("/admin") && location.includes("error="),
    "Invalid token redirects to /admin with error param"
  );

  // --- POST /api/admin/access-requests (invalid body when auth would pass) ---
  // We can't test auth, but we can test that with valid JSON and missing fields we get 400
  // Actually without auth we get 403 first. So skip.

  // --- Optional: OTP request for allowed email ---
  const testAllowedEmail = process.env.TEST_ALLOWED_EMAIL;
  if (testAllowedEmail) {
    console.log("\n9. POST /api/auth/request-otp (allowed email - sends real OTP)");
    const allowedRes = await fetchJson(`${BASE_URL}/api/auth/request-otp`, {
      method: "POST",
      body: JSON.stringify({ email: testAllowedEmail }),
    });
    // Could be 200 (success) or 429 (rate limit)
    assert(
      allowedRes.res.status === 200 || allowedRes.res.status === 429,
      `Allowed email returns 200 or 429 (got ${allowedRes.res.status})`
    );
  } else {
    console.log("\n9. Skipping allowed-email OTP test (set TEST_ALLOWED_EMAIL to enable)");
  }

  // --- Summary ---
  console.log("\n" + "─".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("─".repeat(50) + "\n");

  if (failed > 0) {
    process.exit(1);
  }

  console.log("All auth endpoint tests passed.\n");
}

runTests().catch((err) => {
  console.error("\nTest runner error:", err);
  process.exit(1);
});
