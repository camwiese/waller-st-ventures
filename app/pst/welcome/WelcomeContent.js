"use client";

import { useRouter } from "next/navigation";
import { COLORS, SERIF, SANS } from "../../../constants/theme";

export default function WelcomeContent() {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        background: COLORS.cream50,
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: "48px 40px",
        }}
      >
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 18,
            fontWeight: 600,
            color: COLORS.green900,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          WSV Data Room
        </div>

        <div
          style={{
            fontFamily: SERIF,
            fontSize: 20,
            fontWeight: 600,
            color: COLORS.text900,
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          You have been granted exclusive access to the WSV Data Room.
        </div>

        <p
          style={{
            fontFamily: SERIF,
            fontSize: 15,
            color: COLORS.text500,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          The information in this data room is confidential. Please do not share, forward, or distribute any materials without permission.
        </p>

        <button
          type="button"
          onClick={() => router.push("/pst")}
          style={{
            width: "100%",
            padding: "14px 20px",
            fontFamily: SERIF,
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.white,
            background: COLORS.green800,
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
