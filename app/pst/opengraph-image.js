import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Puget Sound Therapeutics — Waller Street Ventures";
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
          background: "#3b4a40",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 600,
              color: "#f7f5f0",
              letterSpacing: "0.02em",
            }}
          >
            Puget Sound Therapeutics
          </div>
          <div
            style={{
              width: 64,
              height: 3,
              background: "#d4a853",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: "rgba(238, 233, 223, 0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Waller Street Ventures
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
