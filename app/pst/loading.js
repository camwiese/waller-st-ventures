import { COLORS, SANS } from "../../constants/theme";

function SkeletonLine({ width = "100%" }) {
  return (
    <div
      style={{
        height: 16,
        background: COLORS.border,
        borderRadius: 4,
        width,
        marginBottom: 12,
      }}
    />
  );
}

export default function DataRoomLoading() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        fontFamily: SANS,
        background: COLORS.cream50,
        padding: "48px 20px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            height: 28,
            width: 220,
            background: COLORS.border,
            borderRadius: 4,
            marginBottom: 24,
          }}
        />
        <SkeletonLine width="100%" />
        <SkeletonLine width="95%" />
        <SkeletonLine width="88%" />
        <SkeletonLine width="70%" />
        <SkeletonLine width="60%" />
      </div>
    </div>
  );
}
