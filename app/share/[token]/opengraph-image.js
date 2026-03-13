import { ImageResponse } from "next/og";
import { buildShareMetadata, getShareTokenMetadata } from "../../../lib/shareMetadata";

export const alt = "Private share link";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }) {
  const { token } = await params;
  const shareToken = await getShareTokenMetadata(token);
  const meta = buildShareMetadata(shareToken);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f4efe4",
          color: "#33403a",
          padding: "72px 84px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid rgba(51,64,58,0.12)",
            background: "linear-gradient(180deg, #fcfbf8 0%, #f1ebde 100%)",
            padding: "68px 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                maxWidth: "72%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(51,64,58,0.58)",
                }}
              >
                Private Share Link
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 82,
                  lineHeight: 1,
                  fontWeight: 600,
                  color: "#33403a",
                }}
              >
                {meta.title}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                width: 96,
                height: 8,
                marginTop: 12,
                background: "#b39345",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              fontFamily: "system-ui, sans-serif",
              fontSize: 26,
              color: "rgba(51,64,58,0.62)",
            }}
          >
            Confidential material
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
