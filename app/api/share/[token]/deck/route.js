import { createServiceClient } from "../../../../../lib/supabase/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(request, { params }) {
  const { token } = await params;

  const serviceClient = createServiceClient();

  const { data: shareToken } = await serviceClient
    .from("share_tokens")
    .select("id, content_type, is_active")
    .eq("token", token)
    .single();

  if (!shareToken || !shareToken.is_active || shareToken.content_type !== "deck") {
    return new Response("Not found", { status: 404 });
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
