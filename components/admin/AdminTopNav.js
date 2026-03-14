"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { COLORS, SANS } from "../../constants/theme";
import { ROUTES } from "../../lib/routes";
import { useAdminContext } from "./AdminContextProvider";

const ALL_LINKS = [
  { href: ROUTES.ROOT, label: "Data Room" },
  { href: "/admin/content", label: "Edit Content", requiresContentEdit: true },
  { href: "/admin", label: "Access" },
];

function isActive(pathname, href) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const adminContext = useAdminContext();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 820px)").matches;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const canEditContent =
    adminContext?.isGP || adminContext?.partner?.can_edit_content || false;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const handleChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const links = useMemo(
    () => ALL_LINKS.filter((link) => !link.requiresContentEdit || canEditContent),
    [canEditContent]
  );

  useEffect(() => {
    links.forEach((link) => {
      router.prefetch(link.href);
    });
  }, [links, router]);

  const activeLabel = useMemo(() => {
    const active = links.find((link) => isActive(pathname || "", link.href));
    return active?.label || "Admin";
  }, [pathname, links]);

  return (
    <header style={{ background: COLORS.green900, borderBottom: `1px solid ${COLORS.green800}`, position: "sticky", top: 0, zIndex: 20 }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ color: COLORS.cream50, fontFamily: SANS, fontSize: 14, fontWeight: 600 }}>
          {activeLabel}
        </div>

        {isMobile ? (
          <>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-label="Toggle admin navigation"
              style={{
                border: `1px solid ${COLORS.green700}`,
                background: COLORS.green800,
                color: COLORS.cream50,
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 13,
                fontFamily: SANS,
                cursor: "pointer",
              }}
            >
              Menu
            </button>
            {menuOpen && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(4,22,32,0.45)",
                  zIndex: 30,
                }}
                onClick={() => setMenuOpen(false)}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 56,
                    right: 16,
                    left: 16,
                    background: COLORS.white,
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                    padding: 12,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: COLORS.text500, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Admin
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {links.map((link) => {
                      const active = isActive(pathname || "", link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          style={{
                            fontFamily: SANS,
                            fontSize: 14,
                            fontWeight: active ? 600 : 500,
                            color: active ? COLORS.green900 : COLORS.text700,
                            textDecoration: "none",
                            border: `1px solid ${active ? COLORS.green400 : COLORS.border}`,
                            background: active ? COLORS.green100 : COLORS.white,
                            borderRadius: 6,
                            padding: "10px 12px",
                          }}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "nowrap",
              justifyContent: "flex-end",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {links.map((link) => {
              const active = isActive(pathname || "", link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontFamily: SANS,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? COLORS.cream50 : COLORS.green300,
                    textDecoration: "none",
                    border: active ? `1px solid ${COLORS.green600}` : "1px solid transparent",
                    background: active ? COLORS.green800 : "transparent",
                    borderRadius: 4,
                    padding: "7px 10px",
                    lineHeight: 1.2,
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
