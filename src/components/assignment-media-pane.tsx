import { FileText, Headphones, Video } from "lucide-react";
import { getVideoEmbedUrl, isVideoFileUrl } from "@/lib/media";
import { ClippedMediaPlayer } from "@/components/clipped-media-player";
import { YouTubeAudioPlayer } from "@/components/youtube-audio-player";
import type { MediaType } from "@/types/database";

interface AssignmentMediaPaneProps {
  mediaType: MediaType;
  mediaContent: string | null;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  audioOnly?: boolean;
}

export function AssignmentMediaPane({
  mediaType,
  mediaContent,
  title,
  startTime,
  endTime,
  audioOnly = false,
}: AssignmentMediaPaneProps) {
  if (mediaType === "NONE" || !mediaContent) {
    return null;
  }

  if (mediaType === "READING_PASSAGE") {
    const paragraphs = mediaContent
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    return (
      <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5">
          <FileText className="h-4 w-4 text-[#0f766e]" />
          <h2 className="text-sm font-semibold text-[#0f2544]">
            Reading Passage
          </h2>
        </div>
        <div className="prose prose-slate max-w-none overflow-y-auto px-6 py-5 text-[15px] leading-relaxed text-slate-800 lg:max-h-[calc(100vh-14rem)]">
          {paragraphs.map((para, idx) => (
            <p key={idx} className="mb-4 whitespace-pre-line last:mb-0">
              {para}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (mediaType === "VIDEO_URL") {
    const embedUrl = getVideoEmbedUrl(mediaContent, startTime, endTime);
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            {audioOnly ? (
              <Headphones className="h-4 w-4 text-[#0f766e]" />
            ) : (
              <Video className="h-4 w-4 text-[#0f766e]" />
            )}
            <h2 className="text-sm font-semibold text-[#0f2544]">
              {audioOnly ? "Listening Audio" : "Video Material"}
            </h2>
          </div>
        </div>
        <div className="p-4">
          {audioOnly ? (
            <YouTubeAudioPlayer
              url={mediaContent}
              startTime={startTime}
              endTime={endTime}
            />
          ) : embedUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
              <iframe
                key={embedUrl}
                src={embedUrl}
                title={title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Could not embed video URL.{" "}
              <a
                href={mediaContent}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                Open video in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // AUDIO_MP4_UPLOAD
  const isVideo = isVideoFileUrl(mediaContent);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-[#0f766e]" />
          <h2 className="text-sm font-semibold text-[#0f2544]">
            {isVideo ? "Uploaded Video Recording" : "Listening Audio Track"}
          </h2>
        </div>
      </div>
      <div className="p-6">
        <ClippedMediaPlayer
          src={mediaContent}
          startTime={startTime}
          endTime={endTime}
        />
      </div>
    </div>
  );
}
