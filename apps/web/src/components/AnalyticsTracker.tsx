"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { ensureSession, checkExclusionParam, isTrackingExcluded, getSessionId, getDeviceType } from "@/lib/analytics";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

interface AnalyticsTrackerProps {
  cookieDays: number;
  excludeAdminTraffic: boolean;
  recordingEnabled: boolean;
}

function sendFinalDuration(lastViewAt: number | null) {
  const sessionId = getSessionId();
  if (!sessionId || lastViewAt === null || typeof navigator === "undefined" || !navigator.sendBeacon) return;
  const duration = Math.round((Date.now() - lastViewAt) / 1000);
  const body = JSON.stringify({ sessionId, duration });
  navigator.sendBeacon(`${API_URL}/api/analytics/pageview`, new Blob([body], { type: "application/json" }));
}

/** Flushes buffered rrweb events via sendBeacon — the only delivery mechanism guaranteed to survive page unload, same reasoning as sendFinalDuration above. */
function sendRecordingEventsBeacon(events: unknown[]) {
  const sessionId = getSessionId();
  if (!sessionId || events.length === 0 || typeof navigator === "undefined" || !navigator.sendBeacon) return;
  const body = JSON.stringify({ sessionId, events });
  navigator.sendBeacon(`${API_URL}/api/analytics/recording`, new Blob([body], { type: "application/json" }));
}

interface BufferedClick {
  xPercent: number;
  yPx: number;
}

/** Same sendBeacon-on-unload approach as recording events above — a click heatmap batch is just as disposable if it's dropped (a small gap in density, not a broken feature), so it never blocks navigation waiting on a fetch. */
function sendHeatmapClicksBeacon(path: string, clicks: BufferedClick[]) {
  if (clicks.length === 0 || typeof navigator === "undefined" || !navigator.sendBeacon) return;
  const body = JSON.stringify({ path, device: getDeviceType(), clicks });
  navigator.sendBeacon(`${API_URL}/api/analytics/heatmaps`, new Blob([body], { type: "application/json" }));
}

// Periodic in-app flush cadence for the recording/heatmap buffers — route
// changes also flush immediately (see the pageview effect below), this just
// covers a long dwell on a single page between navigations.
const RECORDING_FLUSH_INTERVAL_MS = 10000;
const HEATMAP_FLUSH_INTERVAL_MS = 5000;

function AnalyticsTrackerInner({ cookieDays, excludeAdminTraffic, recordingEnabled }: AnalyticsTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const registeredRef = useRef(false);
  const lastViewAtRef = useRef<number | null>(null);
  const prevPathRef = useRef<string | undefined>(undefined);
  const disabledRef = useRef(false);
  const recordingEventsRef = useRef<unknown[]>([]);
  const clickBufferRef = useRef<BufferedClick[]>([]);

  const flushRecordingEvents = () => {
    const sessionId = getSessionId();
    if (!sessionId || recordingEventsRef.current.length === 0) return;
    const events = recordingEventsRef.current;
    recordingEventsRef.current = [];
    api.sendRecordingEvents({ sessionId, events }).catch(() => {
      // Best-effort, same as every other analytics beacon in this file — a
      // dropped batch just means a small gap in that session's replay.
    });
  };

  const flushClicks = () => {
    if (clickBufferRef.current.length === 0) return;
    const clicks = clickBufferRef.current;
    clickBufferRef.current = [];
    api.recordHeatmapClicks({ path: window.location.pathname, device: getDeviceType(), clicks }).catch(() => {
      // Best-effort — a dropped batch is just a thinner spot on the heatmap.
    });
  };

  // Runs once — evaluates the ?marwa_no_track=1 opt-out marker (see
  // lib/analytics.ts) before anything else fires a beacon.
  useEffect(() => {
    checkExclusionParam();
    if (excludeAdminTraffic && isTrackingExcluded()) disabledRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Establishes the session cookie/first-touch attribution and registers it
  // with the API — idempotent server-side, but only actually attempted once
  // per app load via registeredRef.
  useEffect(() => {
    if (disabledRef.current) return;
    const attribution = ensureSession(cookieDays);
    if (registeredRef.current) return;
    registeredRef.current = true;
    api
      .registerAnalyticsSession({
        sessionId: attribution.sessionId,
        referrer: attribution.referrer,
        landingPage: attribution.landingPage,
        utmSource: attribution.utmSource,
        utmMedium: attribution.utmMedium,
        utmCampaign: attribution.utmCampaign,
        utmTerm: attribution.utmTerm,
        utmContent: attribution.utmContent,
      })
      .catch(() => {});
  }, [cookieDays]);

  // Fires on every route change (initial load included). Reports the
  // previous page's time-on-page alongside the new page's own view, in one
  // call — see POST /api/analytics/pageview.
  useEffect(() => {
    if (disabledRef.current) return;
    const sessionId = getSessionId();
    if (!sessionId) return;

    const search = searchParams.toString();
    const path = search ? `${pathname}?${search}` : pathname;
    const now = Date.now();
    const duration = lastViewAtRef.current !== null ? Math.round((now - lastViewAtRef.current) / 1000) : undefined;
    const referrer = prevPathRef.current ?? document.referrer;

    api
      .recordPageview({
        sessionId,
        path,
        title: document.title,
        referrer,
        duration,
      })
      .catch(() => {});

    // A route change is a natural batch boundary for the recording/heatmap
    // buffers — flushing here means neither has to wait for its periodic
    // interval to catch up on a fast-navigating visitor, and the heatmap
    // batch is tagged with the page it actually happened on before that
    // page is gone.
    flushRecordingEvents();
    flushClicks();

    lastViewAtRef.current = now;
    prevPathRef.current = `${window.location.origin}${path}`;
     
  }, [pathname, searchParams]);

  // Last page of the visit never gets a "next navigation" to report its
  // duration on, so catch it on tab-hide/close via sendBeacon instead (the
  // only delivery mechanism guaranteed to survive page unload).
  useEffect(() => {
    if (disabledRef.current) return;
    const onHide = () => {
      sendFinalDuration(lastViewAtRef.current);
      sendRecordingEventsBeacon(recordingEventsRef.current);
      recordingEventsRef.current = [];
      sendHeatmapClicksBeacon(window.location.pathname, clickBufferRef.current);
      clickBufferRef.current = [];
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  // Self-hosted rrweb session recording — only starts when Admin → Analytics
  // & Leads → Settings has it enabled AND this visitor hasn't opted out
  // (same disabledRef gate as every other tracking call in this file).
  // maskAllInputs masks every form field's value (not just password fields,
  // which rrweb already masks by default) before it ever leaves the browser.
  useEffect(() => {
    if (disabledRef.current || !recordingEnabled) return;
    // Never record in development. rrweb emits on every mouse move and DOM
    // mutation, and a dev session is the worst case for it: Fast Refresh
    // rewrites the DOM constantly, and the developer is the only "visitor",
    // so the recording has no analytical value at all. Leaving it on meant a
    // local machine paid the full capture + upload + storage cost of watching
    // its own developer work.
    if (process.env.NODE_ENV !== "production") return;
    let stop: (() => void) | undefined;
    let cancelled = false;

    import("rrweb").then(({ record }) => {
      if (cancelled) return;
      stop = record({
        emit(event) {
          recordingEventsRef.current.push(event);
        },
        maskAllInputs: true,
      });
    });

    const interval = setInterval(flushRecordingEvents, RECORDING_FLUSH_INTERVAL_MS);

    return () => {
      cancelled = true;
      stop?.();
      clearInterval(interval);
    };
     
  }, [recordingEnabled]);

  // Click/Scroll Heatmaps — every click's position relative to the viewport
  // width (xPercent) and the full document (yPx, i.e. scroll offset + click
  // offset) is buffered and flushed periodically/on navigation/on unload,
  // never sent one-request-per-click.
  useEffect(() => {
    if (disabledRef.current) return;
    function onClick(e: MouseEvent) {
      if (typeof window === "undefined" || window.innerWidth === 0) return;
      clickBufferRef.current.push({ xPercent: Math.round((e.clientX / window.innerWidth) * 10000) / 100, yPx: Math.round(e.pageY) });
    }
    document.addEventListener("click", onClick);
    const interval = setInterval(flushClicks, HEATMAP_FLUSH_INTERVAL_MS);
    return () => {
      document.removeEventListener("click", onClick);
      clearInterval(interval);
    };
     
  }, []);

  return null;
}

export function AnalyticsTracker(props: AnalyticsTrackerProps) {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerInner {...props} />
    </Suspense>
  );
}
