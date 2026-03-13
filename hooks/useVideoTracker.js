"use client";
import { useEffect, useRef, useCallback } from "react";

const HEARTBEAT_INTERVAL_MS = 30_000; // flush every 30s

/**
 * Tracks video playback time and sends heartbeats to a tracking endpoint.
 *
 * @param {Object} options
 * @param {string} options.endpointUrl - API endpoint to POST view events
 * @param {number} options.totalDuration - total duration of the media in seconds
 * @param {React.RefObject} options.playerRef - ref to the video element or MuxPlayer
 */
export default function useVideoTracker({ endpointUrl, totalDuration, playerRef }) {
  const playTimeRef = useRef(0);
  const maxPositionRef = useRef(0);
  const lastTickRef = useRef(null);
  const isPlayingRef = useRef(false);
  const endpointRef = useRef(endpointUrl);
  const totalDurationRef = useRef(totalDuration);

  useEffect(() => { endpointRef.current = endpointUrl; }, [endpointUrl]);
  useEffect(() => { totalDurationRef.current = totalDuration; }, [totalDuration]);

  const sendPayload = useCallback((durationSeconds) => {
    if (!endpointRef.current || durationSeconds < 1) return;
    const payload = JSON.stringify({
      mode: "video",
      durationSeconds: Math.round(durationSeconds),
      maxPositionSeconds: Math.round(maxPositionRef.current),
      totalDurationSeconds: Math.round(totalDurationRef.current || 0),
    });
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon(endpointRef.current, blob);
    if (!sent) {
      fetch(endpointRef.current, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  const accumulate = useCallback(() => {
    if (!isPlayingRef.current || !lastTickRef.current) return;
    const now = Date.now();
    const delta = (now - lastTickRef.current) / 1000;
    playTimeRef.current += delta;
    lastTickRef.current = now;
  }, []);

  const flush = useCallback(() => {
    accumulate();
    const seconds = playTimeRef.current;
    if (seconds >= 1) {
      sendPayload(seconds);
      playTimeRef.current = 0;
    }
  }, [accumulate, sendPayload]);

  useEffect(() => {
    if (!endpointUrl) return;
    const el = playerRef?.current;
    if (!el) return;
    playTimeRef.current = 0;
    maxPositionRef.current = 0;
    lastTickRef.current = null;
    isPlayingRef.current = false;

    const handlePlay = () => {
      isPlayingRef.current = true;
      lastTickRef.current = Date.now();
    };

    const handlePause = () => {
      accumulate();
      isPlayingRef.current = false;
      lastTickRef.current = null;
    };

    const handleTimeUpdate = () => {
      const currentTime = el.currentTime || 0;
      if (currentTime > maxPositionRef.current) {
        maxPositionRef.current = currentTime;
      }
    };

    const handleEnded = () => {
      accumulate();
      isPlayingRef.current = false;
      lastTickRef.current = null;
      flush();
    };

    const handlePageHide = () => flush();

    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("ended", handleEnded);
    window.addEventListener("pagehide", handlePageHide);

    const heartbeat = setInterval(flush, HEARTBEAT_INTERVAL_MS);

    return () => {
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("ended", handleEnded);
      window.removeEventListener("pagehide", handlePageHide);
      clearInterval(heartbeat);
      flush();
    };
  }, [endpointUrl, playerRef, flush, accumulate]);
}
