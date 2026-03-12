const { createClient } = require("@supabase/supabase-js");

const DEAL_SLUG = process.env.DEFAULT_DEAL_SLUG || "pst";

const TABLE_HTML = `<table>
  <thead>
    <tr>
      <th></th>
      <th>Corneal Transplant</th>
      <th>First-Gen Cell Therapy (Fresh)</th>
      <th>PST's Second-Gen Therapy (Cryopreserved)</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Supply Ratio</td><td>1 donor : 1 patient</td><td>1 donor : 1,000+ patients</td><td>1 donor : 10,000+ patients</td></tr>
    <tr><td>Procedure</td><td>Complex microsurgery</td><td>Simple injection (~10 min)</td><td>Simple injection (~10 min)</td></tr>
    <tr><td>Recovery</td><td>Days on their back</td><td>1-3 hours face-down</td><td>1-3 hours face-down</td></tr>
    <tr><td>Shelf Life</td><td>Days</td><td>24-96 hours</td><td>Indefinite</td></tr>
    <tr><td>Est. Production Cost Per Dose</td><td>~$6,000</td><td>~$40,000</td><td>&lt;$500</td></tr>
    <tr><td>Est. Reimbursement Cost Per Dose</td><td>~$17,000</td><td>~$60,000</td><td>$10,000 – $15,000</td></tr>
    <tr><td>Distribution</td><td>Limited by donor supply</td><td>Limited by shelf life + regional manufacturing</td><td>Standard cold-chain shipping worldwide</td></tr>
    <tr><td>Patient Access</td><td>~14% of global need met</td><td>Developed markets near manufacturing</td><td>Global</td></tr>
  </tbody>
</table>`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Find the deal
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("slug", DEAL_SLUG)
    .single();
  if (dealError) throw new Error(`Deal not found: ${dealError.message}`);

  // Find the memo section
  const { data: section, error: sectionError } = await supabase
    .from("content_sections")
    .select("id")
    .eq("deal_id", deal.id)
    .eq("slug", "deal-memo")
    .single();
  if (sectionError) throw new Error(`Memo section not found: ${sectionError.message}`);

  // Find the memo body block
  const { data: block, error: blockError } = await supabase
    .from("content_blocks")
    .select("id, content")
    .eq("section_id", section.id)
    .eq("key", "body")
    .single();
  if (blockError) throw new Error(`Memo body block not found: ${blockError.message}`);

  const body = block.content || "";

  // Find the placeholder table that contains "[Table]" and replace it
  // The placeholder is a TipTap-generated table with [Table] in a header cell
  const placeholderPattern = /<table[^>]*>[\s\S]*?\[Table\][\s\S]*?<\/table>/;
  const match = body.match(placeholderPattern);

  if (!match) {
    throw new Error('Could not find placeholder [Table] in memo body. It may have already been replaced.');
  }

  const updatedBody = body.slice(0, match.index) + TABLE_HTML + body.slice(match.index + match[0].length);

  // Update the block
  const { error: updateError } = await supabase
    .from("content_blocks")
    .update({ content: updatedBody, updated_at: new Date().toISOString() })
    .eq("id", block.id);

  if (updateError) throw new Error(`Failed to update memo body: ${updateError.message}`);

  console.log("Placeholder [Table] replaced with comparison table successfully.");
}

main().catch((err) => {
  console.error("Insert memo table failed:", err);
  process.exit(1);
});
