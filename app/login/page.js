"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { COLORS, SERIF } from "../../constants/theme";
import { ROUTES } from "../../lib/routes";

const MAX_RESENDS = 3;
const COOLDOWN_SECONDS = 60;

function CodeInput({ value, onChange, onComplete, disabled, inputRefs }) {
  const handleInput = (index, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (digit && index === 5) {
      const code = next.join("");
      if (code.length === 6) onComplete(code);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        const next = [...value];
        next[index] = "";
        onChange(next);
      } else if (index > 0) {
        const next = [...value];
        next[index - 1] = "";
        onChange(next);
        inputRefs.current[index - 1]?.focus();
      }
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...value];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
    onChange(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) onComplete(pasted);
  };

  return (
    <div style={{ display: "flex", gap: "clamp(4px, 1.5vw, 8px)", justifyContent: "center", width: "100%", boxSizing: "border-box" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          value={value[i] || ""}
          onChange={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          style={{
            flex: "1 1 0",
            maxWidth: 44,
            height: 48,
            textAlign: "center",
            fontFamily: SERIF,
            fontSize: 20,
            fontWeight: 600,
            color: COLORS.text900,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            outline: "none",
            background: disabled ? COLORS.gray100 : COLORS.white,
            caretColor: COLORS.green700,
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const autoSubmitted = useRef(false);
  const inputRefs = useRef([]);

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [resendCount, setResendCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const prefillEmail = searchParams.get("email");
    const prefillName = searchParams.get("name");
    const prefillStep = searchParams.get("step");
    const authError = searchParams.get("error");

    if (prefillName) setName(prefillName);
    if (prefillEmail) setEmail(prefillEmail);
    if (prefillStep === "code" && prefillEmail) {
      setStep("code");
      setNotice("Please check your inbox for the 6-digit code.");
    }
    if (authError === "auth_failed") {
      setError("The sign-in link expired or is invalid. Please enter your email to receive a new code.");
    } else if (authError === "service_unavailable") {
      setError("We are experiencing a temporary issue. Please try again in a moment.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const requestCode = useCallback(async (emailToSend) => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToSend }),
      });
      const json = await res.json();

      // if (res.status === 403 && json.error?.code === "not_invited") {
      //   setStep("access_requested");
      //   setLoading(false);
      //   return;
      // }
      if (res.status === 429) {
        setError(json.error?.message || "Too many attempts. Please wait a minute and try again.");
        setLoading(false);
        return;
      }
      if (json.error) {
        setError(json.error.message || "Something went wrong");
        setLoading(false);
        return;
      }
      if (json.deduplicated) {
        setNotice(json.message || "Code already sent. Please check your inbox.");
      }

      setStep("code");
      setCooldown(COOLDOWN_SECONDS);
      setLoading(false);
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const prefillEmail = searchParams.get("email");
    const authError = searchParams.get("error");
    if (prefillEmail && !authError && !autoSubmitted.current) {
      autoSubmitted.current = true;
      requestCode(prefillEmail);
    }
  }, [searchParams, requestCode]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    await requestCode(email);
  };

  const handleResend = async () => {
    if (resendCount >= MAX_RESENDS || cooldown > 0) return;
    setError(null);
    setNotice(null);
    setDigits(["", "", "", "", "", ""]);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (res.status === 429) {
        setError(json.error?.message || "Too many attempts. Please wait a minute and try again.");
      } else if (json.error) {
        setError(json.error.message || "Something went wrong");
      } else if (json.deduplicated) {
        setNotice(json.message || "Code already sent. Please check your inbox.");
        setCooldown(COOLDOWN_SECONDS);
      } else {
        setResendCount((c) => c + 1);
        setCooldown(COOLDOWN_SECONDS);
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    }
    setLoading(false);
    inputRefs.current[0]?.focus();
  };

  const verifyCode = useCallback(async (code) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: code, type: "email" }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error || "That code is not right or has expired. Please try again.");
        setDigits(["", "", "", "", "", ""]);
        setLoading(false);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
        return;
      }

      fetch("/api/auth/log-login", { method: "POST", keepalive: true }).catch(() => {});
      router.push(ROUTES.ROOT);
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, resendCount, router]);

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length === 6) verifyCode(code);
  };

  const handleBack = () => {
    setStep("email");
    setError(null);
    setNotice(null);
    setDigits(["", "", "", "", "", ""]);
    setResendCount(0);
    setCooldown(0);
  };

  const firstName = name ? name.split(" ")[0] : "";

  // if (step === "access_requested") {
  //   return (
  //     <div style={{ textAlign: "center" }}>
  //       <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: COLORS.text900, marginBottom: 12 }}>
  //         Access Requested
  //       </div>
  //       <p style={{ fontFamily: SERIF, fontSize: 14, color: COLORS.text500, lineHeight: 1.6, margin: 0 }}>
  //         We will email you access to the WSV data room once approved.
  //       </p>
  //     </div>
  //   );
  // }

  if (step === "code") {
    return (
      <form onSubmit={handleVerifySubmit}>
        <div style={{ fontFamily: SERIF, fontSize: 14, color: COLORS.text500, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          We sent a code to<br />
          <strong style={{ color: COLORS.text900 }}>{email}</strong>
        </div>

        <CodeInput
          value={digits}
          onChange={setDigits}
          onComplete={verifyCode}
          disabled={loading}
          inputRefs={inputRefs}
        />

        {error && (
          <div style={{ fontFamily: SERIF, fontSize: 13, color: COLORS.error, textAlign: "center", marginTop: 16, lineHeight: 1.4 }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{ fontFamily: SERIF, fontSize: 13, color: COLORS.text500, textAlign: "center", marginTop: error ? 10 : 16, lineHeight: 1.4 }}>
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || digits.join("").length < 6}
          style={{
            width: "100%",
            padding: "13px 16px",
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 600,
            color: COLORS.white,
            background: loading ? COLORS.gold600 : COLORS.gold500,
            border: "none",
            borderRadius: 3,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s ease",
            marginTop: 20,
          }}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          {resendCount >= MAX_RESENDS ? (
            <span style={{ fontFamily: SERIF, fontSize: 13, color: COLORS.text400 }}>
              Please try again later.
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              style={{
                fontFamily: SERIF,
                fontSize: 13,
                color: cooldown > 0 ? COLORS.text400 : COLORS.text500,
                background: "none",
                border: "none",
                cursor: cooldown > 0 || loading ? "default" : "pointer",
                textDecoration: cooldown > 0 ? "none" : "underline",
                padding: "8px 16px",
              }}
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </button>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 4 }}>
          <button
            type="button"
            onClick={handleBack}
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
            ← Use a different email
          </button>
        </div>
      </form>
    );
  }

  if (loading && autoSubmitted.current && step === "email") {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: COLORS.text900, marginBottom: 8 }}>
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </div>
        <p style={{ fontFamily: SERIF, fontSize: 14, color: COLORS.text500, lineHeight: 1.6, margin: 0 }}>
          Sending a code to <strong style={{ color: COLORS.text900 }}>{email}</strong>...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit}>
      <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: COLORS.text900, marginBottom: 24 }}>
        Please enter your email to view the WSV data room
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
        aria-label="Email address"
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
          marginBottom: error ? 8 : 16,
          background: COLORS.white,
        }}
      />
      {error && (
        <div style={{ fontFamily: SERIF, fontSize: 13, color: COLORS.error, marginBottom: 16, lineHeight: 1.4 }}>{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        style={{
          width: "100%",
          padding: "13px 16px",
          fontFamily: SERIF,
          fontSize: 15,
          fontWeight: 600,
          color: COLORS.white,
          background: loading ? COLORS.gold600 : COLORS.gold500,
          border: "none",
          borderRadius: 3,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background 0.15s ease",
        }}
      >
        {loading ? "Sending..." : "Continue"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100dvh",
      background: COLORS.cream50,
      padding: "20px 16px",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        padding: "32px clamp(14px, 4vw, 36px)",
        boxSizing: "border-box",
      }}>
        <div style={{
          fontFamily: SERIF,
          fontSize: 18,
          fontWeight: 600,
          color: COLORS.green900,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textAlign: "center",
          marginBottom: 28,
        }}>
          Waller Street Ventures
        </div>
        <Suspense fallback={<div style={{ fontFamily: SERIF, fontSize: 14, color: COLORS.text400 }}>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
