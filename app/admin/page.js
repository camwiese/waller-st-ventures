import AnalyticsPageClient from "../../components/admin/AnalyticsPageClient";

export default async function AdminPage() {
  const dealSlug = process.env.DEFAULT_DEAL_SLUG || "pst";
  return <AnalyticsPageClient dealSlug={dealSlug} />;
}
