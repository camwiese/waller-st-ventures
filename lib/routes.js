function normalizeBasePath(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "/") return "";

  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return normalized.replace(/\/+$/, "");
}

const DATA_ROOM_BASE_PATH = normalizeBasePath(
  process.env.NEXT_PUBLIC_DATA_ROOM_BASE_PATH || "/pst"
);

export const ROUTES = {
  ROOT: DATA_ROOM_BASE_PATH || "/",
  LOGIN: "/login",
  WELCOME: `${DATA_ROOM_BASE_PATH}/welcome` || "/welcome",
  AUTH_VERIFY: "/auth/verify",
  AUTH_CALLBACK: "/auth/callback",
  ADMIN: "/admin",
};
