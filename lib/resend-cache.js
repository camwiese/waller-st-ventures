/**
 * Resend email cache — avoids calling Resend API on every admin load.
 * Cache TTL: 15 minutes. Uses Supabase table resend_email_cache.
 */
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY = "default";
const MAX_PAGES = 5; // Limit pagination when fetching fresh (was 20)

export async function getResendEmailsCached(serviceClient) {
  const authSender = (process.env.AUTH_SENDER_EMAIL || "").toLowerCase();
  const authDomain = authSender.includes("@") ? authSender.split("@")[1] : "";

  if (!process.env.RESEND_API_KEY || !authDomain) {
    return [];
  }

  try {
    const { data: row, error } = await serviceClient
      .from("resend_email_cache")
      .select("data, fetched_at")
      .eq("id", CACHE_KEY)
      .single();

    const now = Date.now();
    const fetchedAt = row?.fetched_at ? new Date(row.fetched_at).getTime() : 0;
    const isFresh = row && now - fetchedAt < CACHE_TTL_MS;

    if (isFresh && row?.data) {
      return Array.isArray(row.data) ? row.data : [];
    }

    // Fetch fresh from Resend
    const resendEmails = await fetchResendEmails(authDomain);
    const toStore = resendEmails.filter((e) => {
      const from = (e.from || "").toLowerCase();
      return from.includes(authDomain);
    });

    await serviceClient
      .from("resend_email_cache")
      .upsert(
        { id: CACHE_KEY, data: toStore, fetched_at: new Date().toISOString() },
        { onConflict: "id" }
      );

    return toStore;
  } catch (err) {
    console.error("[resend-cache] Error:", err?.message || err);
    return [];
  }
}

async function fetchResendEmails(authDomain) {
  const all = [];
  let after = null;
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    pageCount++;
    const url = new URL("https://api.resend.com/emails");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!res.ok) break;

    const json = await res.json();
    const data = json.data || [];
    all.push(...data);

    const hasMore = json.has_more && data.length > 0;
    if (!hasMore || data.length === 0) break;
    after = data[data.length - 1].id;
  }

  return all;
}
