"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { COLORS, SANS } from "../constants/theme";
import { SectionHeader } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";
import useVideoTracker from "../hooks/useVideoTracker";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });

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

export default function InterviewSection({ isMobile, content, sectionTitle }) {
  const hasCmsBody = typeof content?.body === "string" && content.body.trim().length > 0;
  const [mode, setMode] = useState("video");
  const [muxData, setMuxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);
  const playerRef = useRef(null);
  const audioRef = useRef(null);

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

  const activeRef = mode === "audio" ? audioRef : playerRef;

  useVideoTracker({
    endpointUrl: "/api/video-track",
    mode,
    totalDuration,
    playerRef: activeRef,
  });

  const handleLoadedMetadata = useCallback((e) => {
    const dur = e?.target?.duration || 0;
    if (dur && dur > 0) setTotalDuration(dur);
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
    <div>
      <SectionHeader title={sectionTitle || "CEO Interview"} isMobile={isMobile} />
      <div style={{ padding: 0 }}>
        {hasCmsBody ? (
          <RichTextRenderer html={content.body} style={{ marginBottom: 24 }} />
        ) : (
          <p style={{ fontFamily: SANS, fontSize: 15, lineHeight: 1.7, color: COLORS.text700, margin: "0 0 24px 0" }}>
            In this conversation, Daniel and I discuss PST&apos;s origin story, the cryopreservation breakthrough, what the first-in-human trial will look like, and why they believe this therapy can reach millions of patients worldwide.
          </p>
        )}

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
          <>
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
                  playbackId={muxData.playbackId}
                  tokens={{ playback: muxData.token }}
                  streamType="on-demand"
                  style={{ width: "100%", aspectRatio: "16/9", display: "block", "--controls": "bottom" }}
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
                  src={muxData.audioUrl}
                  controls
                  controlsList="nodownload"
                  onLoadedMetadata={handleLoadedMetadata}
                  playsInline
                  style={{ width: "100%", maxWidth: 500, borderRadius: 8, outline: "none" }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => handleModeSwitch("video")} style={pillStyle(mode === "video")}>
                Video
              </button>
              <button type="button" onClick={() => handleModeSwitch("audio")} style={pillStyle(mode === "audio")}>
                Audio
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
