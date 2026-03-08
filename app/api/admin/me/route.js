import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { requireAdminAccess } from "../../../../lib/adminAuth";

// GET - Returns the current admin's context (GP vs partner, notification prefs)
export async function GET() {
  const supabase = await createClient();

  const isLocalDevBypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (isLocalDevBypass) {
    return NextResponse.json({
      email: "dev@localhost",
      isGP: true,
      partner: null,
    });
  }

  const auth = await requireAdminAccess(supabase);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json({
    email: auth.email,
    isGP: auth.isGP,
    partner: auth.partner,
  });
}
