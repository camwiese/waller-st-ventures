import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { getAccessRequests } from "../../../../lib/access-requests";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const gpEmail = (process.env.GP_EMAIL || "").toLowerCase();
  const isLocalDevBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (!isLocalDevBypass && (!user || user.email?.toLowerCase() !== gpEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const serviceClient = createServiceClient();
  const { requests, pendingCount, error } = await getAccessRequests(serviceClient);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ requests, pendingCount });
}
