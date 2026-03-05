import { COLORS } from "../../constants/theme";

export default function AdminLoading() {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream50 }}>
      <div style={{ background: COLORS.green900, padding: "16px 28px", height: 52 }} />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
        {/* Summary cards skeleton */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 140,
                background: COLORS.white,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 3,
                padding: "18px 20px",
                textAlign: "center",
              }}
            >
              <div style={{ height: 28, background: COLORS.border, borderRadius: 4, marginBottom: 8, width: "60%", margin: "0 auto 8px" }} />
              <div style={{ height: 12, background: COLORS.border, borderRadius: 4, width: "50%", margin: "0 auto" }} />
            </div>
          ))}
        </div>
        {/* Tab bar skeleton */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 0 }}>
          {[80, 100, 80, 110, 70].map((w, i) => (
            <div key={i} style={{ height: 44, width: w, borderRadius: "8px 8px 0 0", background: i === 0 ? COLORS.white : "transparent", border: i === 0 ? `1px solid ${COLORS.border}` : "none", borderBottom: i === 0 ? `1px solid ${COLORS.white}` : "none" }} />
          ))}
        </div>
        {/* Content skeleton */}
        <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: 20 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ height: 14, background: COLORS.border, borderRadius: 4, width: "30%", marginRight: "auto" }} />
              <div style={{ height: 14, background: COLORS.border, borderRadius: 4, width: 50, marginLeft: 16 }} />
              <div style={{ height: 14, background: COLORS.border, borderRadius: 4, width: 50, marginLeft: 16 }} />
              <div style={{ height: 24, background: COLORS.border, borderRadius: 12, width: 40, marginLeft: 16 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
