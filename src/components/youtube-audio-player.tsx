"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Headphones, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { extractYouTubeVideoId, parseTimestampToSeconds } from "@/lib/media";
import { Button } from "@/components/ui/button";

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YTNamespace {
  Player: new (
    elementId: string,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (ev: { target: YTPlayerInstance }) => void;
        onStateChange?: (ev: { data: number; target: YTPlayerInstance }) => void;
      };
    }
  ) => YTPlayerInstance;
  PlayerState?: {
    PLAYING: number;
    PAUSED: number;
    ENDED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeApi(): Promise<YTNamespace> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      if (window.YT) resolve(window.YT);
    };

    if (!document.getElementById("yt-iframe-api-script")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface YouTubeAudioPlayerProps {
  url: string;
  startTime?: string | null;
  endTime?: string | null;
}

export function YouTubeAudioPlayer({
  url,
  startTime,
  endTime,
}: YouTubeAudioPlayerProps) {
  const videoId = extractYouTubeVideoId(url);
  const startSec = parseTimestampToSeconds(startTime) ?? 0;
  const endSec = parseTimestampToSeconds(endTime);
  const rawId = useId();
  const containerId = `yt-audio-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const playerRef = useRef<YTPlayerInstance | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startSec);
  const [duration, setDuration] = useState<number>(endSec ?? 0);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;

    setReady(false);
    setPlaying(false);
    setCurrentTime(startSec);

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      const playerVars: Record<string, string | number> = {
        autoplay: 0,
        controls: 0,
        rel: 0,
        start: startSec,
      };
      if (endSec !== null && endSec > startSec) {
        playerVars.end = endSec;
      }

      const instance = new YT.Player(containerId, {
        videoId,
        width: 1,
        height: 1,
        playerVars,
        events: {
          onReady: (ev) => {
            if (cancelled) return;
            const total = ev.target.getDuration() || 0;
            setDuration(endSec !== null && endSec > 0 ? endSec : total);
            if (startSec > 0) ev.target.seekTo(startSec, true);
            setReady(true);
          },
          onStateChange: (ev) => {
            if (cancelled) return;
            const isPlaying = ev.data === 1;
            setPlaying(isPlaying);
            if (ev.data === 0) {
              setPlaying(false);
            }
          },
        },
      });
      playerRef.current = instance;

      pollRef.current = setInterval(() => {
        const p = playerRef.current;
        if (!p || typeof p.getCurrentTime !== "function") return;
        const t = p.getCurrentTime();
        setCurrentTime(t);
        if (endSec !== null && t >= endSec && p.getPlayerState() === 1) {
          p.pauseVideo();
          p.seekTo(startSec, true);
          setPlaying(false);
        }
      }, 250);
    });

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId, startSec, endSec, containerId]);

  if (!videoId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Audio-Only mode requires a valid YouTube URL.
      </div>
    );
  }

  const effectiveEnd = endSec !== null && endSec > startSec ? endSec : duration;
  const segmentLength = Math.max(1, effectiveEnd - startSec);
  const elapsedInSegment = Math.max(
    0,
    Math.min(segmentLength, currentTime - startSec)
  );
  const progressPct = Math.round((elapsedInSegment / segmentLength) * 100);

  function togglePlay() {
    const p = playerRef.current;
    if (!p || !ready) return;
    if (playing) {
      p.pauseVideo();
    } else {
      if (endSec !== null && p.getCurrentTime() >= endSec) {
        p.seekTo(startSec, true);
      }
      p.playVideo();
    }
  }

  function handleReplay() {
    const p = playerRef.current;
    if (!p || !ready) return;
    p.seekTo(startSec, true);
    p.playVideo();
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const p = playerRef.current;
    if (!p || !ready) return;
    const offset = Number(e.target.value);
    const targetSec = startSec + offset;
    p.seekTo(targetSec, true);
    setCurrentTime(targetSec);
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
      {/* Masked 1x1 YouTube iframe (audio-only playback via official YouTube IFrame API) */}
      <div className="pointer-events-none h-0 w-0 overflow-hidden opacity-0">
        <div id={containerId} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0f2544] text-white">
          <Headphones className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0f2544]">
            Listening Audio Track
          </p>
          <p className="text-xs text-slate-500">
            Press play to listen. You can pause or replay the segment anytime.
          </p>
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className="space-y-1.5">
        <input
          type="range"
          min={0}
          max={segmentLength}
          step={1}
          disabled={!ready}
          value={Math.floor(elapsedInSegment)}
          onChange={handleScrub}
          aria-label="Audio playback position"
          className="h-2 w-full cursor-pointer accent-[#0f2544] disabled:opacity-50"
        />
        <div className="flex items-center justify-between font-mono text-[11px] text-slate-600">
          <span>{formatClock(elapsedInSegment)}</span>
          <span>
            {effectiveEnd > 0 ? formatClock(segmentLength) : `${progressPct}%`}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={!ready}
          onClick={togglePlay}
        >
          {!ready ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading audio...
            </>
          ) : playing ? (
            <>
              <Pause className="h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Play Audio
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!ready}
          onClick={handleReplay}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Replay Segment
        </Button>
      </div>
    </div>
  );
}
