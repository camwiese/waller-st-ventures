import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "../../../lib/supabase/server";
import WelcomeContent from "./WelcomeContent";

const CURRENT_NDA_VERSION = "1.0";

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const serviceClient = createServiceClient();

  // Check if NDA is required for this user
  const { data: allowedRow } = await serviceClient
    .from("allowed_emails")
    .select("nda_required")
    .eq("email", user.email.toLowerCase())
    .limit(1)
    .maybeSingle();

  // If NDA not required for this user, skip to data room
  if (allowedRow?.nda_required === false) {
    redirect("/pst");
  }

  // If user already agreed to NDA, skip welcome entirely
  const { data: ndaAgreement } = await serviceClient
    .from("nda_agreements")
    .select("id")
    .eq("user_email", user.email.toLowerCase())
    .eq("nda_version", CURRENT_NDA_VERSION)
    .limit(1)
    .maybeSingle();

  if (ndaAgreement) {
    redirect("/pst");
  }

  return <WelcomeContent />;
}
