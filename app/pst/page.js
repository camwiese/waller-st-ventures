import { createClient, createServiceClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";
import DataRoomClient from "../../components/DataRoomClient";
import { getCmsContentByTabs } from "../../lib/cms/content";
import { TAB_ORDER } from "../../constants/tabs";
import { isAnyAdmin } from "../../lib/adminAuth";
import { ROUTES } from "../../lib/routes";

export const metadata = {
  title: "Puget Sound Therapeutics",
  openGraph: {
    title: "Puget Sound Therapeutics | Waller Street Ventures",
  },
};

const VALID_TABS = new Set(TAB_ORDER);
const CURRENT_NDA_VERSION = "1.0";

export default async function HomePage({ searchParams }) {
  const isLocalAuthBypass =
    process.env.NODE_ENV === "development" &&
    process.env.BYPASS_AUTH_MIDDLEWARE === "1";
  const isLocalAdminBypass =
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  const params = typeof searchParams?.then === "function" ? await searchParams : searchParams ?? {};
  const tabParam = typeof params.tab === "string" ? params.tab : Array.isArray(params.tab) ? params.tab[0] : undefined;
  const initialTab = tabParam && VALID_TABS.has(tabParam) ? tabParam : "overview";
  if (isLocalAuthBypass) {
    const cmsContent = await getCmsContentByTabs({ dealSlug: process.env.DEFAULT_DEAL_SLUG || "pst" });
    return (
      <DataRoomClient
        cmsContent={cmsContent}
        initialTab={initialTab}
        isAdmin={isLocalAdminBypass}
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  // Require NDA agreement before accessing data room (admins bypass)
  const isAdmin = isLocalAdminBypass || await isAnyAdmin(user.email);
  if (!isAdmin) {
    const serviceClient = createServiceClient();

    // Check if NDA is required for this user
    const { data: allowedRow } = await serviceClient
      .from("allowed_emails")
      .select("nda_required")
      .eq("email", user.email.toLowerCase())
      .limit(1)
      .maybeSingle();

    const ndaRequired = allowedRow?.nda_required !== false;

    if (ndaRequired) {
      const { data: ndaAgreement } = await serviceClient
        .from("nda_agreements")
        .select("id")
        .eq("user_email", user.email.toLowerCase())
        .eq("nda_version", CURRENT_NDA_VERSION)
        .limit(1)
        .maybeSingle();

      if (!ndaAgreement) {
        redirect(ROUTES.WELCOME);
      }
    }
  }

  const cmsContent = await getCmsContentByTabs({ dealSlug: process.env.DEFAULT_DEAL_SLUG || "pst" });
  return <DataRoomClient cmsContent={cmsContent} initialTab={initialTab} isAdmin={isAdmin} />;
}
