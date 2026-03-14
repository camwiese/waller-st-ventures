"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { COLORS, SANS, SERIF } from "../constants/theme";
import useVideoTracker from "../hooks/useVideoTracker";
import { SectionHeader, bodyP } from "./Shared";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });
const DeckViewer = dynamic(() => import("./DeckViewer"), { ssr: false });
const MOBILE_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const PLAYER_FRAME_STYLE = {
  position: "relative",
  width: "100%",
  paddingTop: "56.25%",
  borderRadius: 8,
  overflow: "hidden",
  border: `1px solid ${COLORS.border}`,
  background: "#000",
};
const PLAYER_STYLE = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  display: "block",
  background: "#000",
  "--media-primary-color": COLORS.white,
  "--media-accent-color": COLORS.green600,
  "--media-secondary-color": "transparent",
};
const PLAYER_CHROME_STYLE = {
  background: COLORS.white,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 3,
  overflow: "hidden",
};
const PLAYER_CHROME_INNER_STYLE = {
  padding: 16,
};
const CTA_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 3,
  background: "transparent",
  color: COLORS.green200,
  border: "1px solid rgba(240, 237, 230, 0.25)",
  textDecoration: "none",
  fontFamily: SANS,
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.25,
  textAlign: "center",
};
const PODCAST_SUMMARY =
  "A conversation about PST's origin story, the cryopreservation breakthrough, and the path to first-in-human trials.";

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
  const [totalDuration, setTotalDuration] = useState(0);
  const playerRef = useRef(null);
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

  const isPodcast = data?.contentType === "podcast";

  useVideoTracker({
    endpointUrl: isPodcast ? `/api/share/${token}/track` : null,
    totalDuration,
    playerRef: isPodcast ? playerRef : { current: null },
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

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.cream50 || "#fcfbf8",
      display: "flex",
      flexDirection: "column",
    }}>
      <header style={{
        background: COLORS.green900,
        borderBottom: `1px solid rgba(252, 251, 248, 0.14)`,
      }}>
        <div style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: isMobile ? "16px 16px" : "18px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}>
          <div style={{
            fontFamily: SERIF,
            fontSize: isMobile ? 18 : 24,
            fontWeight: 600,
            color: COLORS.white,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}>
            Waller Street Ventures
          </div>
          <a
            href="sms:3603184480"
            style={{
              ...CTA_STYLE,
              padding: "13px 16px",
            }}
          >
            Schedule a Call
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isMobile ? "24px 16px 32px" : "32px 40px 48px",
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
              <SectionHeader
                title="CEO Interview"
                isMobile={isMobile}
              />
              <div style={{ borderLeft: `4px solid ${COLORS.green600}`, paddingLeft: 16, marginBottom: 24 }}>
                <p style={{ ...bodyP, marginBottom: 0 }}>
                  {PODCAST_SUMMARY}
                </p>
              </div>

              <div style={PLAYER_CHROME_STYLE}>
                <div style={{ ...PLAYER_CHROME_INNER_STYLE, padding: isMobile ? 12 : 16 }}>
                  <div
                    style={PLAYER_FRAME_STYLE}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <MuxPlayer
                      ref={playerRef}
                      playbackId={data.playbackId}
                      tokens={{ playback: data.token }}
                      streamType="on-demand"
                      playbackRates={isMobile ? MOBILE_PLAYBACK_RATES : undefined}
                      primaryColor={COLORS.white}
                      accentColor={COLORS.green600}
                      disablePictureInPicture
                      style={PLAYER_STYLE}
                      onLoadedMetadata={handleLoadedMetadata}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {!loading && !error && data && data.contentType === "deck" && (
            <>
              <SectionHeader
                title="PST Deck"
                isMobile={isMobile}
              />
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
        padding: isMobile ? "24px 20px 32px" : "32px 40px 40px",
        borderTop: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "flex",
          justifyContent: "flex-end",
        }}>
          <div style={{
            fontFamily: SANS,
            fontSize: 12,
            color: COLORS.text400,
            textAlign: "right",
          }}>
            &copy; 2026 Waller Street Ventures. Confidential.
          </div>
        </div>
      </footer>
    </div>
  );
}
