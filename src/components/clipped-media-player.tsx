"use client";

import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { isVideoFileUrl, parseTimestampToSeconds } from "@/lib/media";
import { Button } from "@/components/ui/button";

interface ClippedMediaPlayerProps {
  src: string;
  startTime?: string | null;
  endTime?: string | null;
}

export function ClippedMediaPlayer({
  src,
  startTime,
  endTime,
}: ClippedMediaPlayerProps) {
  const isVideo = isVideoFileUrl(src);
  const startSec = parseTimestampToSeconds(startTime);
  const endSec = parseTimestampToSeconds(endTime);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;

    function handleLoadedMetadata() {
      if (el && startSec !== null && startSec > 0) {
        el.currentTime = startSec;
      }
    }

    function handleTimeUpdate() {
      if (!el) return;
      if (startSec !== null && el.currentTime < startSec) {
        el.currentTime = startSec;
      }
      if (endSec !== null && el.currentTime >= endSec) {
        el.pause();
        if (startSec !== null) {
          el.currentTime = startSec;
        }
      }
    }

    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    el.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
      el.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [src, isVideo, startSec, endSec]);

  function handleRewind10s() {
    const el = isVideo ? videoRef.current : audioRef.current;
    if (!el) return;
    const floor = startSec ?? 0;
    el.currentTime = Math.max(floor, el.currentTime - 10);
  }

  if (isVideo) {
    return (
      <div className="space-y-2.5">
        <video
          ref={videoRef}
          controls
          src={src}
          className="w-full rounded-xl bg-slate-900"
        >
          Your browser does not support the video element.
        </video>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRewind10s}
          title="Go back 10 seconds"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          10s
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">
          Press play to listen. You may replay the segment as needed.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRewind10s}
          title="Go back 10 seconds"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          10s
        </Button>
      </div>
      <audio ref={audioRef} controls src={src} className="w-full">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
