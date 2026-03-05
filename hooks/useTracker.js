"use client";
import { useEffect, useRef, useCallback } from "react";

const HEARTBEAT_INTERVAL_MS = 60_000; // flush every 60s
const IDLE_TIMEOUT_MS = 5 * 60_000; // stop counting after 5 minutes of inactivity

export default function useTracker(dealSlug, tabId) {
  const startTimeRef = useRef(null);
  const visibleTimeRef = useRef(0);
  const lastVisibleRef = useRef(null);
  const lastActivityRef = useRef(null);
  const dealSlugRef = useRef(dealSlug);
  const tabIdRef = useRef(tabId);

  useEffect(() => {
    dealSlugRef.current = dealSlug;
    tabIdRef.current = tabId;
  }, [dealSlug, tabId]);

  const sendPayload = useCallback((timeSpentSeconds) => {
    if (timeSpentSeconds <= 2) return;
    const payload = JSON.stringify({
      dealSlug: dealSlugRef.current,
      tabId: tabIdRef.current,
      timeSpentSeconds,
    });
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon("/api/track", blob);
    if (!sent) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  const accumulateVisibleTime = useCallback((now) => {
    if (!lastVisibleRef.current) return;
    const lastActivity = lastActivityRef.current || lastVisibleRef.current;
    const activeUntil = Math.min(now, lastActivity + IDLE_TIMEOUT_MS);
    if (activeUntil > lastVisibleRef.current) {
      visibleTimeRef.current += activeUntil - lastVisibleRef.current;
    }
    if (now - lastActivity >= IDLE_TIMEOUT_MS) {
      lastVisibleRef.current = null;
    } else {
      lastVisibleRef.current = now;
    }
  }, []);

  const sendTracking = useCallback(() => {
    if (!startTimeRef.current) return;
    const now = Date.now();
    accumulateVisibleTime(now);
    sendPayload(Math.round(visibleTimeRef.current / 1000));
    startTimeRef.current = null;
    visibleTimeRef.current = 0;
    lastVisibleRef.current = null;
    lastActivityRef.current = null;
  }, [sendPayload, accumulateVisibleTime]);

  // Flush accumulated time without stopping — used by heartbeat
  const flushTracking = useCallback(() => {
    if (!startTimeRef.current) return;
    const now = Date.now();
    accumulateVisibleTime(now);
    const seconds = Math.round(visibleTimeRef.current / 1000);
    if (seconds > 2) {
      sendPayload(seconds);
      // Reset counters but keep tracking
      visibleTimeRef.current = 0;
    }
  }, [sendPayload, accumulateVisibleTime]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    visibleTimeRef.current = 0;
    lastActivityRef.current = document.hidden ? null : Date.now();
    lastVisibleRef.current = document.hidden ? null : Date.now();

    const handleVisibility = () => {
      if (document.hidden) {
        // Tab went hidden — accumulate visible time
        accumulateVisibleTime(Date.now());
        lastVisibleRef.current = null;
      } else {
        // Tab became visible — start tracking again
        lastActivityRef.current = Date.now();
        lastVisibleRef.current = Date.now();
      }
    };

    const handlePageHide = () => sendTracking();
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (!document.hidden && !lastVisibleRef.current) {
        lastVisibleRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("mousedown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("pointerdown", handleActivity, { passive: true });

    // Periodic heartbeat — flushes accumulated time so long sessions aren't lost
    const heartbeat = setInterval(flushTracking, HEARTBEAT_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      clearInterval(heartbeat);
      sendTracking();
    };
  }, [dealSlug, tabId, sendTracking, flushTracking, accumulateVisibleTime]);
}
