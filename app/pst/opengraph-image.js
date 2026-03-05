import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Waller Street Ventures — SPV Data Room";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a3a2a",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 600,
              color: "#fdfbf7",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Waller Street Ventures
          </div>
          <div
            style={{
              width: 56,
              height: 3,
              background: "#3a7d59",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              fontSize: 30,
              color: "#94d4b0",
              letterSpacing: "0.02em",
            }}
          >
            SPV Data Room
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
