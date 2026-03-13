import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../lib/adminAuth";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";

function dedupeRequestsByEmail(requests = []) {
  const seen = new Set();
  return requests.filter((row) => {
    const email = row.email?.toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}

export async function GET() {
  const supabase = await createClient();
  const isLocalDevBypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (!isLocalDevBypass) {
    const auth = await requireAdminAccess(supabase);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const serviceClient = createServiceClient();
  const [allowedResult, requestsResult, recipientsResult, shareTokensResult] = await Promise.all([
    serviceClient
      .from("allowed_emails")
      .select("id, email, source, invited_at, invited_by_email, nda_required")
      .order("created_at", { ascending: false }),
    serviceClient
      .from("access_requests")
      .select("id, email, requested_at, status, reviewed_at, reviewed_by")
      .order("created_at", { ascending: false }),
    serviceClient
      .from("access_request_notification_emails")
      .select("id, email, created_at")
      .order("created_at", { ascending: true }),
    serviceClient
      .from("share_tokens")
      .select("email, content_type, is_active, view_count, last_viewed_at, created_at")
      .eq("deal_slug", "pst")
      .order("created_at", { ascending: false }),
  ]);

  if (allowedResult.error || requestsResult.error || recipientsResult.error || shareTokensResult.error) {
    return NextResponse.json({ error: "Failed to load access data" }, { status: 500 });
  }

  const requests = dedupeRequestsByEmail(requestsResult.data || []);
  const pendingAccessCount = requests.filter((row) => row.status === "pending").length;

  return NextResponse.json({
    allowedEmails: allowedResult.data || [],
    accessRequests: requests,
    notificationRecipients: recipientsResult.data || [],
    shareTokens: shareTokensResult.data || [],
    pendingAccessCount,
  });
}
