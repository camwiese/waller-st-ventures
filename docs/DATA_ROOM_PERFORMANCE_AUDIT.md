# Data Room Performance Audit

**Date:** February 24, 2026  
**Scope:** Waller Street Ventures data room application (Next.js 16, Supabase, Vercel)

---

## Executive Summary

This audit identifies performance bottlenecks across the data room’s frontend, API, database, and admin flows. The highest-impact opportunities are in the **admin page** (sequential DB/API work, heavy in-memory processing) and the **track API** (blocking notification logic). The data room UI is already in good shape with dynamic imports and lazy loading.

---

## 1. Admin Page (`/admin`)

### 1.1 Critical: Sequential Database & API Calls

**Current behavior:** The admin page runs many operations one after another:

1. Auth check (`supabase.auth.getUser()`)
2. `page_views` fetch (all rows for deal "pst")
3. `revoked_emails` fetch
4. `getAccessRequests()` — which does:
   - `otp_attempts` query
   - `page_views` query for `user_email`
   - **Up to 20 paginated Resend API calls** (100 emails per page)
5. `allowed_emails` fetch
6. `access_requests` fetch
7. `access_request_notification_emails` fetch

**Impact:** Total load time is the sum of all these calls. Resend pagination alone can add several seconds.

**Recommendations:**

- Run independent fetches in parallel with `Promise.all()`:
  ```javascript
  const [pageViewsResult, revokedResult, allowedResult, accessRequestsResult, notificationRecipientsResult] = await Promise.all([
    supabase.from("page_views").select("*").eq("deal_slug", "pst").order("created_at", { ascending: false }),
    serviceClient.from("revoked_emails").select("email"),
    serviceClient.from("allowed_emails").select("...").order("created_at", { ascending: false }),
    serviceClient.from("access_requests").select("...").order("created_at", { ascending: false }),
    serviceClient.from("access_request_notification_emails").select("...").order("created_at", { ascending: true }),
  ]);
  ```
- Move `getAccessRequests()` (Resend-heavy) to a separate API route or background job, or:
  - Cache Resend delivery status (e.g., in DB or Redis) and refresh periodically
  - Limit Resend pagination (e.g., first 2–3 pages) for the Pending Access section
  - Load Pending Access asynchronously after the main page renders

### 1.2 Critical: Resend API Pagination in `getAccessRequests()`

**Location:** `lib/access-requests.js`

**Current behavior:** Fetches up to 2,000 emails (20 pages × 100) from Resend on every admin load.

**Impact:** Each Resend request adds ~200–500ms. 20 calls can add 4–10+ seconds.

**Recommendations:**

- Add a cache (e.g., Redis or Supabase table) for Resend delivery status, refreshed every 5–15 minutes
- Reduce `MAX_PAGES` to 2–3 for the initial load
- Load Pending Access via client-side fetch after the main page is visible
- Consider a webhook from Resend to update delivery status in your DB instead of polling

### 1.3 High: Full `page_views` Table Scan

**Current behavior:** Fetches all `page_views` for deal "pst" with `select("*")` and no limit.

**Impact:** As data grows, this query becomes slower and uses more memory.

**Recommendations:**

- Add a time window (e.g., last 90 days) for the main analytics view
- Use `select("user_email, tab_id, time_spent_seconds, created_at")` instead of `*` to reduce payload
- Consider materialized views or pre-aggregated tables for common analytics queries

### 1.4 Medium: Heavy In-Memory Processing

**Current behavior:** All analytics (grouping by email, intent scoring, session grouping, heating-up checks) run in Node.js after fetching all rows.

**Impact:** CPU time grows with number of investors and page views.

**Recommendations:**

- Move aggregation to the database (e.g., `GROUP BY user_email`, window functions)
- Precompute intent scores in a background job and store in a `investor_scores` table
- Use database-side session grouping if possible, or at least limit the dataset before processing

### 1.5 Low: No Data Room Loading State

**Current behavior:** Admin has `loading.js` (skeleton). The main data room (`/pst`) has no loading UI.

**Recommendation:** Add `app/pst/loading.js` with a skeleton for the data room layout to improve perceived performance.

---

## 2. Track API (`/api/track`)

### 2.1 Critical: Blocking Notification Logic

**Location:** `app/api/track/route.js`

**Current behavior:** After inserting a page view, the handler:

1. Queries `priorEvents` (1 row)
2. Optionally calls `notifyNewSession()` (Resend API)
3. Fetches all page views for the user/deal
4. Computes intent score
5. Optionally upserts `high_intent_notifications` and calls `notifyHighIntent()` (Resend API)

All of this runs before returning `{ ok: true }`.

**Impact:** Track requests can take 1–3+ seconds instead of ~50–100ms, especially when notifications are sent.

**Recommendations:**

- Return `{ ok: true }` immediately after the insert
- Run notification logic asynchronously (fire-and-forget or queue):
  ```javascript
  // After insert succeeds:
  return NextResponse.json({ ok: true });
  // Then, don't await:
  processNotificationsInBackground(user, dealSlug, inserted, serviceClient).catch(console.error);
  ```
- Use a job queue (e.g., Vercel background functions, Inngest, or Supabase Edge Functions) for notifications

### 2.2 Medium: Redundant `page_views` Fetch for Intent

**Current behavior:** For high-intent checks, the handler fetches all page views for the user/deal again, even though the insert just added one.

**Recommendation:** Pass the new row into the intent logic and fetch only when needed, or maintain a cached aggregate (e.g., in Redis) that you increment.

---

## 3. Data Room Frontend (`/pst`)

### 3.1 Good: Dynamic Imports

**Current behavior:** Section components (Terms, Model, Memo, Interview, FAQ, Science, Chat) use `dynamic()` imports.

**Impact:** Reduces initial bundle size and defers loading until a tab is selected.

**Recommendation:** Add `loading` to dynamic imports for a smoother tab switch:

```javascript
const MemoSection = dynamic(() => import("../../components/MemoSection"), {
  loading: () => <SectionSkeleton />,
});
```

### 3.2 Medium: OverviewSection Loaded Eagerly

**Current behavior:** `OverviewSection` is imported statically and always loaded on first paint.

**Impact:** Minor; Overview is the default tab and likely needed quickly.

**Recommendation:** Consider dynamic import with `ssr: false` only if the Overview bundle is large. Current setup is acceptable.

### 3.3 Low: Tab Switch Delay

**Current behavior:** 100ms timeout for fade-out before switching tabs.

**Impact:** Slight perceived delay; may feel sluggish on fast clicks.

**Recommendation:** Reduce to 50ms or use CSS-only transitions without `setTimeout` if possible.

### 3.4 Low: JSON Content Bundle Size

**Current state:** ~49KB total JSON (faq ~18KB, memo ~13KB, science-primer ~16KB, summary ~2KB).

**Impact:** Bundled into section chunks; acceptable for now.

**Recommendation:** Monitor as content grows. If any file exceeds ~50KB, consider loading via API or moving to a CMS.

---

## 4. Middleware & Auth

### 4.1 Good: Development Bypass

**Current behavior:** Middleware skips auth in development.

**Impact:** Faster local iteration.

### 4.2 Medium: `supabase.auth.getUser()` on Every Request

**Current behavior:** Middleware runs on almost every route (excluding static assets) and calls `getUser()`.

**Impact:** Adds ~50–150ms per request in production.

**Recommendations:**

- Ensure matcher excludes more static/API routes if they don’t need auth
- Consider short-lived session caching (e.g., in-memory with TTL) if Supabase supports it — verify against Supabase docs

### 4.3 Low: Service Client `await` Inconsistency

**Current behavior:** `createServiceClient()` is synchronous, but some callers use `await createServiceClient()`.

**Impact:** No functional issue; `await` on a sync value is harmless.

**Recommendation:** Use `createServiceClient()` without `await` for clarity.

---

## 5. Database

### 5.1 Good: Indexes

**Current indexes on `page_views`:**

- `idx_page_views_deal`
- `idx_page_views_email`
- `idx_page_views_deal_created`
- `idx_page_views_email_deal`
- `idx_page_views_created_at` (migration 007)
- `idx_page_views_user_email_created` (migration 007)

**Impact:** Supports common filters and sorts.

### 5.2 Medium: No Query Limits

**Current behavior:** Admin and track API queries often lack `.limit()`.

**Recommendations:**

- Add `.limit(1000)` or similar for analytics queries with a time window
- Use pagination for large result sets

### 5.3 Low: `select("*")` Usage

**Current behavior:** Admin fetches all columns from `page_views`.

**Recommendation:** Select only needed columns to reduce payload and memory.

---

## 6. Tracking Hook (`useTracker`)

### 6.1 Good: `sendBeacon` and `keepalive`

**Current behavior:** Uses `navigator.sendBeacon()` with `fetch` fallback and `keepalive: true`.

**Impact:** Reliable delivery on page unload.

### 6.2 Good: Visibility API

**Current behavior:** Tracks only visible time via `document.visibilityState`.

**Impact:** Avoids inflating time when the tab is hidden.

---

## 7. Fonts & Assets

### 7.1 Good: `display: "swap"`

**Current behavior:** Inter and Cormorant use `display: "swap"` to avoid FOIT.

### 7.2 Low: Image Optimization

**Current behavior:** Uses `next/image` for signature and section images.

**Recommendation:** Ensure images use appropriate `sizes` and formats (WebP/AVIF) where supported.

---

## 8. Priority Action Matrix

| Priority | Area              | Action                                           | Est. Impact |
|----------|-------------------|--------------------------------------------------|-------------|
| P0       | Track API         | Return immediately; run notifications async      | High        |
| P0       | Admin             | Parallelize DB fetches with `Promise.all`         | High        |
| P1       | Admin             | Reduce/cache Resend API usage in `getAccessRequests` | High      |
| P1       | Admin             | Add time window + column selection for `page_views` | Medium    |
| P2       | Admin             | Lazy-load Pending Access section                  | Medium      |
| P2       | Data room         | Add `loading.js` for `/pst`                       | Low         |
| P2       | Data room         | Add `loading` to dynamic section imports          | Low         |
| P3       | Admin             | Precompute intent scores (background job)         | Medium (long-term) |
| P3       | General           | Add query limits and pagination                   | Medium (at scale) |

---

## 9. Quick Wins (Low Effort)

1. **Parallelize admin fetches** — Wrap independent Supabase calls in `Promise.all()`.
2. **Track API fire-and-forget** — Return after insert; run notifications without blocking.
3. **Add `/pst` loading skeleton** — Copy pattern from `app/admin/loading.js`.
4. **Reduce Resend `MAX_PAGES`** — Change from 20 to 2–3 in `getAccessRequests()`.
5. **Select specific columns** — Use `select("user_email, tab_id, time_spent_seconds, created_at")` for `page_views` in admin.

---

## 10. Measurement Recommendations

Before and after changes, measure:

- **Admin page:** Time to first meaningful paint (e.g., summary cards visible)
- **Track API:** P95 and P99 latency
- **Data room:** Largest Contentful Paint (LCP) and Time to Interactive (TTI)
- **Lighthouse:** Performance score for `/pst` and `/admin`

Use Vercel Analytics, Web Vitals, or similar for ongoing monitoring.
