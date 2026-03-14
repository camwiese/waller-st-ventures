import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { requireAdminAccess } from "./adminAuth";
import { ROUTES } from "./routes";

export async function getAdminContext({
  redirectTo = ROUTES.ROOT,
  requireContentEdit = false,
} = {}) {
  const supabase = await createClient();
  const isLocalDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (isLocalDevBypass) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return {
      user: user || null,
      email: user?.email || process.env.GP_EMAIL || "dev@localhost",
      isGP: true,
      partner: null,
    };
  }

  const auth = await requireAdminAccess(supabase);
  if (auth.error) redirect(redirectTo);

  if (requireContentEdit && !auth.isGP && !auth.partner?.can_edit_content) {
    redirect(redirectTo);
  }

  return {
    user: auth.user,
    email: auth.email,
    isGP: auth.isGP,
    partner: auth.partner,
  };
}
