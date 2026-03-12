import { createClient } from "../../../lib/supabase/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  // Verify the user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const pdfPath = join(process.cwd(), "content", "deck.pdf");
    const pdfBuffer = await readFile(pdfPath);

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Deck not found", { status: 404 });
  }
}
