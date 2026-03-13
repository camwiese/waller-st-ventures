import AnalyticsPageClient from "../../components/admin/AnalyticsPageClient";
import { getAdminAnalytics } from "../../lib/adminAnalytics";

export default async function AdminPage() {
  const dealSlug = process.env.DEFAULT_DEAL_SLUG || "pst";
  const initialData = await getAdminAnalytics({ dealSlug });
  return <AnalyticsPageClient initialData={initialData} />;
}
