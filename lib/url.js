export function normalizeAppUrl(value, fallback) {
  const raw = (value || "").trim();
  const base = raw || fallback || "";
  if (!base) return "";
  if (/^https?:\/\//i.test(base)) return base;
  return `https://${base}`;
}
