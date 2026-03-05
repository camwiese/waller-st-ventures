import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "../../../lib/supabase/server";
import WelcomeContent from "./WelcomeContent";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const serviceClient = createServiceClient();
  const { data: views } = await serviceClient
    .from("page_views")
    .select("id")
    .eq("user_email", user.email)
    .eq("deal_slug", "pst")
    .limit(1);

  // Return user — skip welcome, go straight to data room
  if (views && views.length > 0) {
    redirect("/pst");
  }

  return <WelcomeContent />;
}
