import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "../../../lib/supabase/server";
import { getDealBySlug } from "../../../lib/cms/content";
import { requireAdminAccess } from "../../../lib/adminAuth";
import Changelog from "../../../components/admin/cms/Changelog";
import { COLORS } from "../../../constants/theme";

export default async function AdminChangelogPage() {
  const supabase = await createClient();
  const isLocalDevBypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (!isLocalDevBypass) {
    const auth = await requireAdminAccess(supabase);
    if (auth.error) redirect("/admin");
    if (!auth.isGP && !auth.partner?.can_edit_content) redirect("/admin");
  }
  const dealSlug = process.env.DEFAULT_DEAL_SLUG || "pst";
  const deal = await getDealBySlug(dealSlug);

  if (!deal) {
    return (
      <div style={{ padding: 32, fontFamily: "var(--font-sans)" }}>
        <h1 style={{ margin: "0 0 10px 0" }}>Changelog</h1>
        <p style={{ margin: 0 }}>
          No deal found for slug &quot;{dealSlug}&quot;. Run the CMS migration first.
        </p>
      </div>
    );
  }

  const service = createServiceClient();
  const { data: changelog } = await service
    .from("content_changelog")
    .select("*")
    .eq("deal_id", deal.id)
    .order("changed_at", { ascending: false })
    .limit(20);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream50, padding: 20 }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: 20,
        }}
      >
        <h1 style={{ margin: "0 0 8px 0", fontSize: 24 }}>Change Log</h1>
        <p style={{ margin: "0 0 20px 0", color: COLORS.text500, fontSize: 14 }}>
          Track edits across dataroom content. Use filters and load more to query entries as needed.
        </p>
        <Changelog initialEntries={changelog || []} dealSlug={dealSlug} />
      </div>
    </div>
  );
}
