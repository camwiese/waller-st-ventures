"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { COLORS, SANS } from "../constants/theme";
import { SectionHeader } from "./Shared";
import RichTextRenderer from "./RichTextRenderer";
import useVideoTracker from "../hooks/useVideoTracker";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });

export default function InterviewSection({ isMobile, content, sectionTitle }) {
  const hasCmsBody = typeof content?.body === "string" && content.body.trim().length > 0;
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
        )}
      </div>
    </div>
  );
}
