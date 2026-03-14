import AdminTopNav from "../../components/admin/AdminTopNav";
import { AdminContextProvider } from "../../components/admin/AdminContextProvider";
import { getAdminContext } from "../../lib/adminContext";
import { ROUTES } from "../../lib/routes";

export default async function AdminLayout({ children }) {
  const adminContext = await getAdminContext({ redirectTo: ROUTES.ROOT });

  return (
    <AdminContextProvider value={adminContext}>
      <div style={{ minHeight: "100vh" }}>
        <AdminTopNav />
        {children}
      </div>
    </AdminContextProvider>
  );
}
