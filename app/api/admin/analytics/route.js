import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../lib/adminAuth";
import { getAdminAnalytics } from "../../../../lib/adminAnalytics";

export const revalidate = 300;

export async function GET(request) {
  const supabase = await createClient();
  const isLocalDevBypass = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (!isLocalDevBypass) {
    const auth = await requireAdminAccess(supabase);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const dealSlug = searchParams.get("dealSlug") || process.env.DEFAULT_DEAL_SLUG || "pst";
  try {
    const analytics = await getAdminAnalytics({ dealSlug });
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load analytics" },
      { status: 500 }
    );
  }
}
