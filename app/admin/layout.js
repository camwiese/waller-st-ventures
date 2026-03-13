import AdminTopNav from "../../components/admin/AdminTopNav";
import { AdminContextProvider } from "../../components/admin/AdminContextProvider";
import { getAdminContext } from "../../lib/adminContext";

export default async function AdminLayout({ children }) {
  const adminContext = await getAdminContext({ redirectTo: "/pst" });

  return (
    <AdminContextProvider value={adminContext}>
      <div style={{ minHeight: "100vh" }}>
        <AdminTopNav />
        {children}
      </div>
    </AdminContextProvider>
  );
}
