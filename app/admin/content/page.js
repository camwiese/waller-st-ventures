import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "../../../lib/supabase/server";
import { getDealBySlug } from "../../../lib/cms/content";
import { requireAdminAccess } from "../../../lib/adminAuth";
import ContentEditorClient from "../../../components/admin/cms/ContentEditorClient";
import { COLORS } from "../../../constants/theme";

async function ensureMemoSummaryBlock(service, dealId) {
  const { data: memoSection } = await service
    .from("content_sections")
    .select("id, content_blocks(id, key, display_order)")
    .eq("deal_id", dealId)
    .eq("slug", "deal-memo")
    .maybeSingle();
  if (!memoSection?.id) return;

  const blocks = Array.isArray(memoSection.content_blocks) ? memoSection.content_blocks : [];
  const hasSummary = blocks.some((block) => block?.key === "summary");
  if (hasSummary) return;

  const bodyBlock = blocks.find((block) => block?.key === "body");
  const bodyOrder = Number.isFinite(bodyBlock?.display_order) ? bodyBlock.display_order : 1;
  const displayOrder = Math.max(0, bodyOrder - 1);

  await service.from("content_blocks").insert({
    deal_id: dealId,
    section_id: memoSection.id,
    key: "summary",
    type: "rich_text",
    content: "",
    display_order: displayOrder,
    updated_at: new Date().toISOString(),
  });
}

async function ensureContactSettingsBlock(service, dealId) {
  const defaults = [
    { label: "schedule_url", value: "" },
    { label: "phone_display", value: "" },
    { label: "phone_e164", value: "" },
  ];

  const { data: existingSection } = await service
    .from("content_sections")
    .select("id, slug, title, content_blocks(id, key, content)")
    .eq("deal_id", dealId)
    .eq("slug", "contact")
    .maybeSingle();

  let contactSection = existingSection;
  if (!contactSection?.id) {
    const { data: lastSection } = await service
      .from("content_sections")
      .select("display_order")
      .eq("deal_id", dealId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = Number.isFinite(lastSection?.display_order)
      ? lastSection.display_order + 1
      : 0;

    const { data: insertedSection } = await service
      .from("content_sections")
      .insert({
        deal_id: dealId,
        slug: "contact",
        title: "Chat with Cam",
        display_order: nextOrder,
        is_visible: true,
        updated_at: new Date().toISOString(),
      })
      .select("id, slug, title")
      .single();

    contactSection = { ...insertedSection, content_blocks: [] };
  }

  const contactBlock = (contactSection?.content_blocks || []).find(
    (block) => block?.key === "contact"
  );

  if (!contactBlock?.id) {
    await service.from("content_blocks").insert({
      deal_id: dealId,
      section_id: contactSection.id,
      key: "contact",
      type: "key_value_table",
      content: defaults,
      display_order: 0,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  const rows = Array.isArray(contactBlock.content) ? contactBlock.content : [];
  const existingLabels = new Set(rows.map((row) => row?.label).filter(Boolean));
  const missingDefaults = defaults.filter((row) => !existingLabels.has(row.label));
  if (missingDefaults.length === 0) return;

  await service
    .from("content_blocks")
    .update({
      content: [...rows, ...missingDefaults],
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactBlock.id);
}

export default async function AdminContentPage() {
  const supabase = await createClient();
  const isLocalDevBypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";

  let user = null;
  if (!isLocalDevBypass) {
    const auth = await requireAdminAccess(supabase);
    if (auth.error) redirect("/admin");
    // Partners need can_edit_content permission
    if (!auth.isGP && !auth.partner?.can_edit_content) redirect("/admin");
    user = auth.user;
  } else {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  }

  const dealSlug = process.env.DEFAULT_DEAL_SLUG || "pst";
  const deal = await getDealBySlug(dealSlug);
  if (!deal) {
    return (
      <div style={{ padding: 32, fontFamily: "var(--font-sans)", background: COLORS.cream50, minHeight: "100vh", color: COLORS.text900 }}>
        <h1 style={{ margin: "0 0 10px 0" }}>Edit WSV Data Room</h1>
        <p style={{ margin: 0 }}>No deal found for slug &quot;{dealSlug}&quot;. Run the CMS migration first.</p>
      </div>
    );
  }

  const service = createServiceClient();
  await ensureMemoSummaryBlock(service, deal.id);
  await ensureContactSettingsBlock(service, deal.id);

  const { data: sections } = await service
    .from("content_sections")
    .select("id, slug, title, display_order, is_visible")
    .eq("deal_id", deal.id)
    .order("display_order", { ascending: true });

  const initialSectionId = sections?.[0]?.id || null;
  let initialBlocks = null;
  if (initialSectionId) {
    const { data: initialSection } = await service
      .from("content_sections")
      .select("id, content_blocks(id, key, type, content, display_order, updated_at)")
      .eq("id", initialSectionId)
      .eq("deal_id", deal.id)
      .single();
    initialBlocks = initialSection?.content_blocks || [];
  }

  return (
    <ContentEditorClient
      dealSlug={dealSlug}
      dealId={deal.id}
      sections={sections}
      initialBlocksBySectionId={initialSectionId ? { [initialSectionId]: initialBlocks } : {}}
      currentUserEmail={user?.email || process.env.GP_EMAIL || "local-dev-admin"}
    />
  );
}
