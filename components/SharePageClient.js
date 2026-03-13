"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { COLORS, SANS, SERIF } from "../constants/theme";
import useVideoTracker from "../hooks/useVideoTracker";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });
const DeckViewer = dynamic(() => import("./DeckViewer"), { ssr: false });

const pillStyle = (active) => ({
  fontFamily: SANS,
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  color: active ? COLORS.green900 : COLORS.text500,
  background: active ? COLORS.green100 : COLORS.gray100,
  border: `1px solid ${active ? COLORS.green300 || COLORS.green600 : COLORS.border}`,
  borderRadius: 20,
  padding: "7px 14px",
  cursor: "pointer",
  transition: "all 0.15s ease",
});

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function SharePageClient({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("video");
  const [totalDuration, setTotalDuration] = useState(0);
  const playerRef = useRef(null);
  const audioRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/share/${token}`)
      .then((res) => {
        if (res.status === 410) throw new Error("expired");
        if (!res.ok) throw new Error("not_found");
        return res.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const activeRef = mode === "audio" ? audioRef : playerRef;
  const isPodcast = data?.contentType === "podcast";

  useVideoTracker({
    endpointUrl: isPodcast ? `/api/share/${token}/track` : null,
    mode,
    totalDuration,
    playerRef: isPodcast ? activeRef : { current: null },
  });

  // For deck, log a single view event on mount
  useEffect(() => {
    if (!data || data.contentType !== "deck") return;
    fetch(`/api/share/${token}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: null,
        durationSeconds: 0,
        maxPositionSeconds: 0,
        totalDurationSeconds: 0,
      }),
    }).catch(() => {});
  }, [data, token]);

  const handleLoadedMetadata = useCallback((e) => {
    const dur = e?.target?.duration || 0;
    if (dur > 0) setTotalDuration(dur);
  }, []);

  const handleModeSwitch = useCallback((newMode) => {
    if (newMode === mode) return;
    if (mode === "video" && playerRef.current) {
      try { playerRef.current.pause(); } catch {}
    }
    if (mode === "audio" && audioRef.current) {
      try { audioRef.current.pause(); } catch {}
    }
    setMode(newMode);
  }, [mode]);

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.cream50 || "#fcfbf8",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        padding: isMobile ? "20px 20px 0" : "28px 40px 0",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: SERIF,
          fontSize: isMobile ? 18 : 22,
          fontWeight: 600,
          color: COLORS.green900,
          letterSpacing: "0.02em",
        }}>
          Waller Street Ventures
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isMobile ? "24px 16px 32px" : "40px 40px 48px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 760,
        }}>
          {loading && (
            <div style={{
              width: "100%", aspectRatio: "16/9", background: COLORS.cream100, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${COLORS.border}`,
            }}>
              <div style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text400 }}>Loading...</div>
            </div>
          )}

          {error && (
            <div style={{
              textAlign: "center",
              padding: isMobile ? "60px 20px" : "80px 40px",
            }}>
              <div style={{
                fontFamily: SERIF,
                fontSize: isMobile ? 22 : 28,
                color: COLORS.green900,
                marginBottom: 12,
              }}>
                {error === "expired" ? "This link is no longer available" : "Link not found"}
              </div>
              <div style={{
                fontFamily: SANS,
                fontSize: 15,
                color: COLORS.text400,
                lineHeight: 1.6,
              }}>
                {error === "expired"
                  ? "This content has been removed by the sender."
                  : "The link you followed may be invalid or expired."}
              </div>
            </div>
          )}

          {!loading && !error && data && isPodcast && (
            <>
              <h1 style={{
                fontFamily: SERIF,
                fontSize: isMobile ? 24 : 32,
                fontWeight: 600,
                color: COLORS.green900,
                margin: "0 0 8px 0",
                textAlign: "center",
              }}>
                CEO Interview
              </h1>
              <p style={{
                fontFamily: SANS,
                fontSize: 15,
                color: COLORS.text500,
                textAlign: "center",
                margin: "0 0 24px 0",
                lineHeight: 1.6,
              }}>
                A conversation about PST&apos;s origin story, the cryopreservation breakthrough, and the path to first-in-human trials.
              </p>

              {mode === "video" ? (
                <div
                  style={{
                    width: "100%", borderRadius: 8, overflow: "hidden",
                    border: `1px solid ${COLORS.border}`, background: "#000",
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <MuxPlayer
                    ref={playerRef}
                    playbackId={data.playbackId}
                    tokens={{ playback: data.token }}
                    streamType="on-demand"
                    style={{ width: "100%", aspectRatio: "16/9", display: "block" }}
                    onLoadedMetadata={handleLoadedMetadata}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "100%", background: COLORS.green900, borderRadius: 8,
                    padding: isMobile ? "32px 20px" : "48px 32px",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
                    border: `1px solid ${COLORS.border}`,
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 40 }}>
                    {[12, 24, 18, 32, 14, 28, 16, 22, 10].map((h, i) => (
                      <div key={i} style={{ width: 4, height: h, borderRadius: 2, background: COLORS.green300 || "#8fbc8f", opacity: 0.7 }} />
                    ))}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
                    Audio mode &mdash; safe to lock your screen
                  </div>
                  <audio
                    ref={audioRef}
                    src={data.audioUrl}
                    controls
                    controlsList="nodownload"
                    onLoadedMetadata={handleLoadedMetadata}
                    playsInline
                    style={{ width: "100%", maxWidth: 500, borderRadius: 8, outline: "none" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
                <button type="button" onClick={() => handleModeSwitch("video")} style={pillStyle(mode === "video")}>
                  Video
                </button>
                <button type="button" onClick={() => handleModeSwitch("audio")} style={pillStyle(mode === "audio")}>
                  Audio
                </button>
              </div>
            </>
          )}

          {!loading && !error && data && data.contentType === "deck" && (
            <>
              <h1 style={{
                fontFamily: SERIF,
                fontSize: isMobile ? 24 : 32,
                fontWeight: 600,
                color: COLORS.green900,
                margin: "0 0 24px 0",
                textAlign: "center",
              }}>
                PST Deck
              </h1>
              <div onContextMenu={(e) => e.preventDefault()}>
                <DeckViewer
                  isMobile={isMobile}
                  userEmail={data.email}
                  pdfUrl={`/api/share/${token}/deck`}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: isMobile ? "24px 20px 32px" : "32px 40px 40px",
        borderTop: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          fontFamily: SERIF,
          fontSize: isMobile ? 16 : 18,
          color: COLORS.green900,
          marginBottom: 8,
        }}>
          Want to learn more about PST?{" "}
          <a
            href="sms:3603184480"
            style={{
              color: COLORS.gold600,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Text Cam
          </a>
        </div>
        <div style={{
          fontFamily: SANS,
          fontSize: 12,
          color: COLORS.text400,
          marginTop: 12,
        }}>
          &copy; 2026 Waller Street Ventures. Confidential.
        </div>
      </footer>
    </div>
  );
}
