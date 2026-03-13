import { createServiceClient } from "./supabase/server";

function toDealPrefix(dealSlug) {
  const normalized = String(dealSlug || "pst").trim().toLowerCase();
  if (!normalized) return "PST";
  if (normalized === "pst") return "PST";
  return normalized
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join("") || "PST";
}

function toContentLabel(contentType) {
  return contentType === "deck" ? "Deck" : "Podcast";
}

export function buildShareMetadata(shareToken) {
  const contentType = shareToken?.content_type;
  if (contentType !== "deck" && contentType !== "podcast") {
    return {
      title: "Private Share Link",
      description: "Private share link",
      dealPrefix: null,
      contentLabel: null,
    };
  }

  const dealPrefix = toDealPrefix(shareToken?.deal_slug);
  const contentLabel = toContentLabel(contentType);
  const title = `${dealPrefix} ${contentLabel}`;
  return {
    title,
    description: "Private share link",
    dealPrefix,
    contentLabel,
  };
}

export async function getShareTokenMetadata(token) {
  if (!token || typeof token !== "string" || token.length > 50) return null;

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("share_tokens")
    .select("content_type, deal_slug, is_active")
    .eq("token", token)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;
  return data;
}
