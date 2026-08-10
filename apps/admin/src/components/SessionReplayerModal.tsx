"use client";

import { useEffect, useRef, useState } from "react";
import Player from "rrweb-player";
import "rrweb-player/dist/style.css";
import { api, type SessionRecordingDetail } from "@/lib/api";

interface SessionReplayerModalProps {
  sessionId: string;
  onClose: () => void;
}

/**
 * Self-hosted rrweb playback — used from both the Analytics Lead Feed and
 * the CRM Contact Profile's "Watch User Session" entry points. rrweb-player
 * ships its own controller (play/pause, speed, skip-inactivity, fullscreen)
 * — a Svelte component mounted imperatively into `containerRef`, since it's
 * not a React component itself.
 */
export function SessionReplayerModal({ sessionId, onClose }: SessionReplayerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [recording, setRecording] = useState<SessionRecordingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (cancelled) return;
      setRecording(null);
      setError(null);
      try {
        const rec = await api.getSessionRecording(sessionId);
        if (!cancelled) setRecording(rec);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "No recording is available for this session");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!recording || !containerRef.current) return;
    containerRef.current.innerHTML = "";

    // A malformed/legacy events payload shouldn't be able to crash the
    // whole Analytics section — rrweb-player's Replayer can throw
    // synchronously while rebuilding the DOM snapshot, so this is caught
    // and surfaced as a normal in-modal error instead of an unhandled
    // exception with no React error boundary above it.
    function mount(container: HTMLDivElement): (() => void) | undefined {
      try {
        const player = new Player({
          target: container,
          props: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            events: recording!.events as any,
            width: Math.min(960, typeof window !== "undefined" ? window.innerWidth - 80 : 960),
            height: 540,
            autoPlay: true,
            skipInactive: true,
            showController: true,
            speedOption: [1, 2, 4],
          },
        });
        return () => {
          player.$destroy();
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "This recording could not be played back");
        return undefined;
      }
    }

    return mount(containerRef.current);
  }, [recording]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-6">
          <h2 className="text-sm font-semibold text-zinc-100">Session Replay</h2>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            ✕
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {!recording && !error && <p className="text-sm text-zinc-500">Loading recording…</p>}

        <div ref={containerRef} />

        {recording && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>{recording.session.country ?? "Unknown location"}</span>
            <span>{recording.session.browser ?? "Unknown browser"}</span>
            <span>{recording.duration}s · {recording.eventCount} events</span>
            {recording.hasRageClicks && <span className="font-medium text-red-400">Rage clicks detected</span>}
          </div>
        )}
      </div>
    </div>
  );
}
