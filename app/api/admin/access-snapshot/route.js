import { NextResponse } from "next/server";
import { isAdminEmail } from "../../../../lib/admin";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLocalDevBypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (!isLocalDevBypass && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const serviceClient = createServiceClient();
  const [allowedResult, requestsResult, recipientsResult] = await Promise.all([
    serviceClient
      .from("allowed_emails")
      .select("id, email, source, invited_at")
      .order("created_at", { ascending: false }),
    serviceClient
      .from("access_requests")
      .select("id, email, requested_at, status, reviewed_at, reviewed_by")
      .order("created_at", { ascending: false }),
    serviceClient
      .from("access_request_notification_emails")
      .select("id, email, created_at")
      .order("created_at", { ascending: true }),
  ]);

  if (allowedResult.error || requestsResult.error || recipientsResult.error) {
    return NextResponse.json({ error: "Failed to load access data" }, { status: 500 });
  }

  const requests = dedupeRequestsByEmail(requestsResult.data || []);
  const pendingAccessCount = requests.filter((row) => row.status === "pending").length;

  return NextResponse.json({
    allowedEmails: allowedResult.data || [],
    accessRequests: requests,
    notificationRecipients: recipientsResult.data || [],
    pendingAccessCount,
  });
}
