"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface SpeakingRecorderProps {
  userId: string;
  questionId: string;
  value: string;
  onChange: (audioUrl: string) => void;
  disabled: boolean;
  minSeconds?: number;
  maxSeconds?: number;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SpeakingRecorder({
  userId,
  questionId,
  value,
  onChange,
  disabled,
  minSeconds,
  maxSeconds,
}: SpeakingRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecording(false);

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size === 0) return;

        setUploading(true);
        const ext = (recorder.mimeType || "").includes("mp4") ? "m4a" : "webm";
        const filePath = `${userId}/${questionId}-${Date.now()}.${ext}`;

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("student-recordings")
          .upload(filePath, blob, {
            contentType: blob.type,
            upsert: true,
          });

        if (uploadError) {
          setError(`Upload failed: ${uploadError.message}`);
          setUploading(false);
          return;
        }

        const { data } = supabase.storage
          .from("student-recordings")
          .getPublicUrl(filePath);

        onChange(data.publicUrl);
        setUploading(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setElapsed(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (maxSeconds && next >= maxSeconds) {
            recorder.stop();
          }
          return next;
        });
      }, 1000);
    } catch {
      setError(
        "Microphone access was denied. Please allow microphone permissions in your browser and try again."
      );
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      {(minSeconds || maxSeconds) && (
        <p className="text-xs font-medium text-slate-600">
          Target speaking length: {minSeconds ?? 0}–{maxSeconds ?? 120} seconds
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-3">
          {!recording ? (
            <Button
              type="button"
              variant="accent"
              size="sm"
              disabled={uploading}
              onClick={startRecording}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {uploading
                ? "Uploading recording..."
                : value
                  ? "Re-record Answer"
                  : "Start Recording"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop Recording ({formatTimer(elapsed)})
            </Button>
          )}

          {recording && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Recording...
            </span>
          )}

          {!recording && !uploading && value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="text-slate-500"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      )}

      {value ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-emerald-700">
            Recorded Audio Response
          </p>
          <audio controls src={value} className="w-full">
            Your browser does not support audio playback.
          </audio>
        </div>
      ) : (
        disabled && (
          <p className="text-xs text-slate-500">No audio recording submitted.</p>
        )
      )}
    </div>
  );
}
