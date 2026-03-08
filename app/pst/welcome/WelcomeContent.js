"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS, SERIF, SANS } from "../../../constants/theme";
import NdaAgreement, { getNdaFullText } from "../../../components/NdaAgreement";

export default function WelcomeContent() {
  const router = useRouter();
  const [step, setStep] = useState("welcome"); // "welcome" | "nda"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAgree = async ({ signerName }) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_name: signerName,
          nda_content: getNdaFullText(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to record agreement. Please try again.");
        setLoading(false);
        return;
      }
      router.push("/pst");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

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
          maxWidth: step === "nda" ? 560 : 480,
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 3,
          padding: step === "nda" ? "32px clamp(16px, 4vw, 32px)" : "48px 40px",
          transition: "max-width 0.3s ease",
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
            marginBottom: step === "nda" ? 24 : 32,
          }}
        >
          Waller Street Ventures
        </div>

        {step === "welcome" && (
          <>
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
              Welcome to the PST Data Room.
            </div>

            <p
              style={{
                fontFamily: SERIF,
                fontSize: 15,
                color: COLORS.text500,
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              The materials here are strictly confidential. To proceed, please
              review and sign the Non-Disclosure Agreement.
            </p>

            <button
              type="button"
              onClick={() => setStep("nda")}
              style={{
                width: "100%",
                padding: "14px 20px",
                fontFamily: SERIF,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.white,
                background: COLORS.green800,
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              Review Agreement
            </button>
          </>
        )}

        {step === "nda" && (
          <>
            <NdaAgreement onAgree={handleAgree} loading={loading} />

            {error && (
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  color: COLORS.error,
                  textAlign: "center",
                  marginTop: 16,
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setStep("welcome");
                  setError(null);
                }}
                style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  color: COLORS.text400,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "8px 16px",
                }}
              >
                &#8592; Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
