"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { COLORS, SANS } from "../constants/theme";
import { SectionHeader, bodyP } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";
import useVideoTracker from "../hooks/useVideoTracker";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });
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
const DEFAULT_SUMMARY =
  "In this conversation, Daniel and I discuss PST's origin story, the cryopreservation breakthrough, what the first-in-human trial will look like, and why they believe this therapy can reach millions of patients worldwide.";

export default function InterviewSection({ isMobile, content, sectionTitle }) {
  const hasCmsBody = typeof content?.body === "string" && content.body.trim().length > 0;
  const hasCmsSummary = typeof content?.summary === "string" && content.summary.trim().length > 0;
  const [muxData, setMuxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);
  const playerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mux/token")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch token");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setMuxData(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useVideoTracker({
    endpointUrl: "/api/video-track",
    totalDuration,
    playerRef,
  });

  const handleLoadedMetadata = useCallback((e) => {
    const dur = e?.target?.duration || 0;
    if (dur && dur > 0) setTotalDuration(dur);
  }, []);

  return (
    <div>
      <SectionHeader title={sectionTitle || "CEO Interview"} isMobile={isMobile} />
      <div style={{ padding: 0 }}>
        <div style={{ borderLeft: `4px solid ${COLORS.green600}`, paddingLeft: 16, marginBottom: 24 }}>
          {hasCmsSummary ? (
            <RichTextRenderer html={content.summary} />
          ) : (
            <p style={{ ...bodyP, marginBottom: 0 }}>
              {DEFAULT_SUMMARY}
            </p>
          )}
        </div>
        {hasCmsBody ? <RichTextRenderer html={content.body} style={{ marginBottom: 24 }} /> : null}

        {loading && (
          <div style={{
            width: "100%", aspectRatio: "16/9", background: COLORS.cream100, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text400 }}>Loading player...</div>
          </div>
        )}

        {error && (
          <div style={{
            width: "100%", aspectRatio: "16/9", background: COLORS.cream100, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ fontFamily: SANS, fontSize: 14, color: COLORS.text400 }}>Unable to load player. Please try again later.</div>
          </div>
        )}

        {!loading && !error && muxData && (
          <div style={PLAYER_CHROME_STYLE}>
            <div style={{ padding: isMobile ? 12 : 16 }}>
              <div
                style={PLAYER_FRAME_STYLE}
                onContextMenu={(e) => e.preventDefault()}
              >
                <MuxPlayer
                  ref={playerRef}
                  playbackId={muxData.playbackId}
                  tokens={{ playback: muxData.token }}
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
        )}
      </div>
    </div>
  );
}
