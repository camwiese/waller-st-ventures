import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCmsContentByTabs, getDealBySlug } from "@/lib/cms/content";
import { buildPacketSections } from "@/lib/pdf/buildPacketData";
import { renderPdfPacketHtml } from "@/lib/pdf/renderPacketHtml";
import { notifyPdfDownload } from "@/lib/notifications";

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export const runtime = "nodejs";

async function launchBrowser() {
  const isDev = process.env.NODE_ENV !== "production";
  const localPaths = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);

  const localPath = localPaths[0];
  const chromiumPath = isDev ? null : await chromium.executablePath();
  const executablePath = isDev ? localPath : chromiumPath;

  if (!executablePath) {
    throw new Error("No Chromium/Chrome executable found. Set CHROME_PATH for local dev.");
  }

  return puppeteer.launch({
    args: isDev ? ["--no-sandbox", "--disable-setuid-sandbox"] : chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dealSlug = process.env.DEFAULT_DEAL_SLUG || "pst";
  const cmsContent = await getCmsContentByTabs({ dealSlug, includeHidden: false });
  const deal = await getDealBySlug(dealSlug);
  const sections = buildPacketSections(cmsContent, 50000);

  if (!sections.length) {
    return NextResponse.json({ error: "No content available" }, { status: 404 });
  }

  const now = new Date();
  const html = renderPdfPacketHtml({
    sections,
    dealTitle: deal?.title || "Seed Round · SPV Data Room",
  });

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
    });
    await page.close();

    notifyPdfDownload(user.email, dealSlug).catch(() => {});

    const filename = `PST-Data-Room-Packet-${now.toISOString().slice(0, 10)}.pdf`;
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[pdf/packet] Failed to generate PDF:", err?.message || err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
