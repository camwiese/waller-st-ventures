"use client";

export default function Error({ error, reset }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding: 40,
        fontFamily: "var(--font-sans), sans-serif",
        maxWidth: 480,
        margin: "40px auto",
        textAlign: "center",
      }}
    >
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Something went wrong</h2>
      <p style={{ color: "#6b6b63", marginBottom: 24, lineHeight: 1.5 }}>
        {error?.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={() => reset()}
        style={{
          background: "#224a36",
          color: "white",
          border: "none",
          padding: "12px 24px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Try again
      </button>
    </div>
  );
}
