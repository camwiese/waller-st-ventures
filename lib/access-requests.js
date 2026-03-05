/**
 * Fetches and merges OTP attempts, Resend delivery status (cached), and activation (page_views).
 * Used by admin page for the Pending Access section.
 */
import { getResendEmailsCached } from "./resend-cache";

export async function getAccessRequests(serviceClient, { activatedSet } = {}) {
  const [attemptsResult, pageViewEmailsResult, resendEmails] = await Promise.all([
    serviceClient
      .from("otp_attempts")
      .select("email, status, error_message, created_at")
      .order("created_at", { ascending: false }),
    activatedSet
      ? null
      : serviceClient
          .from("page_views")
          .select("user_email")
          .eq("deal_slug", "pst"),
    getResendEmailsCached(serviceClient),
  ]);

  const { data: attempts, error: attemptsError } = attemptsResult || { data: [], error: null };
  if (attemptsError) {
    return { requests: [], pendingCount: 0, error: attemptsError.message };
  }

  const activated =
    activatedSet ||
    new Set(
      (pageViewEmailsResult?.data || []).map((r) => r.user_email?.toLowerCase()).filter(Boolean)
    );

  const resendByEmailAndDate = new Map();
  for (const e of resendEmails) {
    const to = Array.isArray(e.to) ? e.to[0] : e.to;
    const email = (typeof to === "string" ? to : to?.email || to || "").toLowerCase();
    if (!email) continue;
    const date = e.created_at ? new Date(e.created_at).toISOString().slice(0, 10) : "";
    const key = `${email}:${date}`;
    if (!resendByEmailAndDate.has(key) || (e.last_event && e.last_event !== "sent")) {
      resendByEmailAndDate.set(key, e.last_event || "sent");
    }
  }

  const seenEmails = new Set();
  const requests = [];
  for (const a of attempts || []) {
    const email = (a.email || "").toLowerCase();
    if (!email) continue;
    const date = a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : "";
    const resendKey = `${email}:${date}`;
    const deliveryStatus = resendByEmailAndDate.get(resendKey) || (a.status === "sent" ? "pending" : null);

    if (seenEmails.has(email)) continue;
    seenEmails.add(email);

    requests.push({
      email,
      requestedAt: a.created_at,
      attemptStatus: a.status,
      deliveryStatus: deliveryStatus || "—",
      activated: activated.has(email),
    });
  }

  const pendingCount = requests.filter((r) => !r.activated).length;

  return { requests, pendingCount, error: null };
}
