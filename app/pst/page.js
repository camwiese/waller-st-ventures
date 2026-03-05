import { createClient } from "../../lib/supabase/server";
import { redirect } from "next/navigation";
import DataRoomClient from "../../components/DataRoomClient";
import { getCmsContentByTabs } from "../../lib/cms/content";
import { TAB_ORDER } from "../../constants/tabs";
import { isAdminEmail } from "../../lib/admin";
import { ROUTES } from "../../lib/routes";

export const metadata = {
  title: "Puget Sound Therapeutics",
  openGraph: {
    title: "Puget Sound Therapeutics | Waller Street Ventures",
  },
};

const VALID_TABS = new Set(TAB_ORDER);

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

  const cmsContent = await getCmsContentByTabs({ dealSlug: process.env.DEFAULT_DEAL_SLUG || "pst" });
  const isAdmin = isLocalAdminBypass || isAdminEmail(user.email);
  return <DataRoomClient cmsContent={cmsContent} initialTab={initialTab} isAdmin={isAdmin} />;
}
