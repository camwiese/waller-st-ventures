import { COLORS, SANS } from "../constants/theme";

export default function SectionSkeleton() {
  return (
    <div style={{ fontFamily: SANS }}>
      <div
        style={{
          height: 16,
          width: 180,
          background: COLORS.border,
          borderRadius: 4,
          marginBottom: 24,
        }}
      />
      <div
        style={{
          height: 28,
          width: "80%",
          background: COLORS.border,
          borderRadius: 4,
          marginBottom: 20,
        }}
      />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 14,
            width: `${95 - i * 5}%`,
            background: COLORS.border,
            borderRadius: 4,
            marginBottom: 12,
          }}
        />
      ))}
    </div>
  );
}
