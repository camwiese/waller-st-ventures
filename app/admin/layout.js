import { redirect } from "next/navigation";
import AdminTopNav from "../../components/admin/AdminTopNav";
import { isAdminEmail } from "../../lib/admin";
import { isAnyAdmin } from "../../lib/adminAuth";
import { createClient } from "../../lib/supabase/server";

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLocalDevBypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  if (!isLocalDevBypass) {
    const email = user?.email;
    if (!user || !(isAdminEmail(email) || await isAnyAdmin(email))) {
      redirect("/pst");
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <AdminTopNav />
      {children}
    </div>
  );
}
