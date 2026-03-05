"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { COLORS, SERIF } from "../../../constants/theme";

function VerifyContent() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "magiclink";
  const verifiedRef = useRef(false);

  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState(null);

  // Code fallback state
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [codeEmail, setCodeEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState("idle");
  const [codeError, setCodeError] = useState(null);

  useEffect(() => {
    // PKCE flow: Supabase sends ?code=... instead of token_hash. Redirect to callback to exchange it.
    const code = searchParams.get("code");
    if (code && !tokenHash) {
      // Full page redirect required: router.replace does not persist Set-Cookie from callback
      window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
      return;
    }

    if (!tokenHash) {
      window.location.replace("/pst");
      return;
    }

    // Token hash flow: redirect to callback so server can verify and set cookies.
    // Must use window.location.replace — router.replace bypasses HTTP cycle and cookies are lost.
    const otpType = ["magiclink", "email", "signup"].includes(type) ? type : "magiclink";
    window.location.replace(
      `/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(otpType)}`
    );
  }, [tokenHash, type, searchParams]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setCodeError(null);
    setCodeStatus("loading");

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: codeEmail.trim().toLowerCase(),
          redirectTo: typeof window !== "undefined" ? window.location.origin + "/auth/verify" : null,
        }),
      });
      const json = await res.json();

      if (json.error) {
        setCodeError(json.error.message || "Something went wrong");
        setCodeStatus("idle");
      } else {
        setCodeStatus("sent");
      }
    } catch {
      setCodeError("Network error — please check your connection and try again.");
      setCodeStatus("idle");
    }
  };

  const verifyCode = async () => {
    setCodeError(null);
    setCodeStatus("verifying");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: codeEmail.trim().toLowerCase(),
          token: code.trim(),
          type: "email",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCodeError(json.error || "Invalid or expired code. Request a new one.");
        setCodeStatus("sent");
        return;
      }

      // Log the login event (fire-and-forget, keepalive survives hard navigation)
      fetch("/api/auth/log-login", { method: "POST", keepalive: true }).catch(() => {});

      // Full page redirect so cookies from verify-otp response are sent on next request
      window.location.replace("/pst");
    } catch {
      setCodeError("Network error — please check your connection and try again.");
      setCodeStatus("sent");
    }
  };

  const handleVerifyCode = (e) => {
    e?.preventDefault();
    verifyCode();
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && codeStatus === "sent") {
      verifyCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (status === "verifying") {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontFamily: SERIF, fontSize: 16, color: COLORS.text500 }}>Signing you in...</div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div>
        <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: COLORS.text900, marginBottom: 8 }}>
          This link has expired or was already used.
        </div>
        <p style={{ fontFamily: SERIF, fontSize: 14, color: COLORS.text500, lineHeight: 1.6, marginBottom: 24 }}>
          If the link does not work, you can resend or enter the code from your email.
        </p>

        {!showCodeForm ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Link
              href="/pst"
              style={{
                display: "block",
                textAlign: "center",
                padding: "13px 16px",
                fontFamily: SERIF,
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.white,
                background: COLORS.green800,
                border: "none",
                borderRadius: 3,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Request new link
            </Link>
            <button
              type="button"
              onClick={() => setShowCodeForm(true)}
              style={{
                width: "100%",
                padding: "13px 16px",
                fontFamily: SERIF,
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.green900,
                background: "transparent",
                border: `2px solid ${COLORS.gold500}`,
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              Use code instead
            </button>
          </div>
        ) : (
          <form
            onSubmit={codeStatus === "sent" ? handleVerifyCode : handleSendCode}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {codeStatus !== "sent" ? (
              <>
                <input
                  type="email"
                  value={codeEmail}
                  onChange={(e) => setCodeEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontFamily: SERIF,
                    fontSize: 16,
                    color: COLORS.text900,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 3,
                    outline: "none",
                    boxSizing: "border-box",
                    background: COLORS.white,
                  }}
                />
                <button
                  type="submit"
                  disabled={codeStatus === "loading"}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    fontFamily: SERIF,
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.green900,
                    background: codeStatus === "loading" ? COLORS.gold600 : COLORS.gold500,
                    border: "none",
                    borderRadius: 3,
                    cursor: codeStatus === "loading" ? "not-allowed" : "pointer",
                  }}
                >
                  {codeStatus === "loading" ? "Sending..." : "Send code"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontFamily: SERIF, fontSize: 14, color: COLORS.text500, margin: 0 }}>
                  We sent a 6-digit code to <strong style={{ color: COLORS.text900 }}>{codeEmail}</strong>. Enter it below.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  required
                  autoComplete="one-time-code"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    fontFamily: SERIF,
                    fontSize: 18,
                    letterSpacing: 4,
                    textAlign: "center",
                    color: COLORS.text900,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 3,
                    outline: "none",
                    boxSizing: "border-box",
                    background: COLORS.white,
                  }}
                />
                <button
                  type="submit"
                  disabled={codeStatus === "verifying"}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    fontFamily: SERIF,
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.green900,
                    background: codeStatus === "verifying" ? COLORS.gold600 : COLORS.gold500,
                    border: "none",
                    borderRadius: 3,
                    cursor: codeStatus === "verifying" ? "not-allowed" : "pointer",
                  }}
                >
                  {codeStatus === "verifying" ? "Verifying..." : "Verify"}
                </button>
                <button
                  type="button"
                  onClick={() => setCodeStatus("idle")}
                  style={{
                    fontFamily: SERIF,
                    fontSize: 13,
                    color: COLORS.text500,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: "8px 16px",
                  }}
                >
                  Use a different email
                </button>
              </>
            )}
            {codeError && (
              <div style={{ fontFamily: SERIF, fontSize: 13, color: COLORS.error }}>{codeError}</div>
            )}
          </form>
        )}
      </div>
    );
  }

  return null;
}

export default function VerifyPage() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        background: COLORS.cream50,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 3,
          padding: "40px 36px",
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
            marginBottom: 28,
          }}
        >
          Waller Street Ventures
        </div>
        <Suspense fallback={<div style={{ fontFamily: SERIF, fontSize: 14, color: COLORS.text400 }}>Loading...</div>}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
