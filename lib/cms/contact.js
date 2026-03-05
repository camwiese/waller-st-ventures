/** Extract contact CTA values from key_value_table blocks. Pass blocks map (e.g. from blockArrayToMap). Returns { schedule_url, phone_display, phone_e164 }. */
export function extractContactSettings(blocksMap) {
  const kv = Array.isArray(blocksMap?.contact) ? blocksMap.contact : [];
  const byLabel = Object.fromEntries(
    kv.filter((r) => r?.label).map((r) => [r.label, String(r.value || "").trim()])
  );
  const phoneDigits = (byLabel.phone_e164 || byLabel.phone_display || "").replace(/\D/g, "");
  const phoneDisplay = byLabel.phone_display || byLabel.phone_e164 || "";
  return {
    schedule_url: (byLabel.schedule_url || "").trim(),
    phone_display: phoneDisplay,
    phone_e164: phoneDigits,
  };
}
