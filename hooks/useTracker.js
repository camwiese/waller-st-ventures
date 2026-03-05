"use client";
import { useEffect, useRef, useCallback } from "react";

const HEARTBEAT_INTERVAL_MS = 60_000; // flush every 60s

export default function useTracker(dealSlug, tabId) {
  const startTimeRef = useRef(null);
  const visibleTimeRef = useRef(0);
  const lastVisibleRef = useRef(null);
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

  const sendTracking = useCallback(() => {
    if (!startTimeRef.current) return;
    let totalVisible = visibleTimeRef.current;
    if (lastVisibleRef.current) {
      totalVisible += Date.now() - lastVisibleRef.current;
    }
    sendPayload(Math.round(totalVisible / 1000));
    startTimeRef.current = null;
    visibleTimeRef.current = 0;
    lastVisibleRef.current = null;
  }, [sendPayload]);

  // Flush accumulated time without stopping — used by heartbeat
  const flushTracking = useCallback(() => {
    if (!startTimeRef.current) return;
    let totalVisible = visibleTimeRef.current;
    if (lastVisibleRef.current) {
      totalVisible += Date.now() - lastVisibleRef.current;
    }
    const seconds = Math.round(totalVisible / 1000);
    if (seconds > 2) {
      sendPayload(seconds);
      // Reset counters but keep tracking
      visibleTimeRef.current = 0;
      if (lastVisibleRef.current) {
        lastVisibleRef.current = Date.now();
      }
    }
  }, [sendPayload]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    visibleTimeRef.current = 0;
    lastVisibleRef.current = document.hidden ? null : Date.now();

    const handleVisibility = () => {
      if (document.hidden) {
        // Tab went hidden — accumulate visible time
        if (lastVisibleRef.current) {
          visibleTimeRef.current += Date.now() - lastVisibleRef.current;
          lastVisibleRef.current = null;
        }
      } else {
        // Tab became visible — start tracking again
        lastVisibleRef.current = Date.now();
      }
    };

    const handlePageHide = () => sendTracking();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    // Periodic heartbeat — flushes accumulated time so long sessions aren't lost
    const heartbeat = setInterval(flushTracking, HEARTBEAT_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      clearInterval(heartbeat);
      sendTracking();
    };
  }, [dealSlug, tabId, sendTracking, flushTracking]);
}
