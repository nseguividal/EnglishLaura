/**
 * Parses a timestamp string ("MM:SS", "HH:MM:SS", or raw seconds "90")
 * into whole seconds. Returns null if empty or invalid.
 */
export function parseTimestampToSeconds(
  value: string | null | undefined
): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return null;

  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  }

  return null;
}

/**
 * Converts YouTube or Vimeo share URLs into safe embed iframe URLs,
 * optionally applying start and end timestamps (in MM:SS or seconds).
 */
export function getVideoEmbedUrl(
  url: string | null | undefined,
  startTime?: string | null,
  endTime?: string | null
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const startSec = parseTimestampToSeconds(startTime);
  const endSec = parseTimestampToSeconds(endTime);

  function appendYouTubeParams(videoId: string): string {
    const params = new URLSearchParams();
    params.set("rel", "0");
    if (startSec !== null && startSec >= 0) {
      params.set("start", String(startSec));
    }
    if (
      endSec !== null &&
      endSec > 0 &&
      (startSec === null || endSec > startSec)
    ) {
      params.set("end", String(endSec));
    }
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/embed/")[1]?.split("/")[0];
        return id ? appendYouTubeParams(id) : trimmed;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
        return id ? appendYouTubeParams(id) : null;
      }
      const v = parsed.searchParams.get("v");
      return v ? appendYouTubeParams(v) : null;
    }

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return id ? appendYouTubeParams(id) : null;
    }

    // Vimeo
    if (host === "vimeo.com") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      if (id && /^\d+$/.test(id)) {
        const base = `https://player.vimeo.com/video/${id}`;
        return startSec !== null ? `${base}#t=${startSec}s` : base;
      }
      return null;
    }

    if (host === "player.vimeo.com") {
      return startSec !== null ? `${trimmed}#t=${startSec}s` : trimmed;
    }

    return null;
  } catch {
    return null;
  }
}

export function extractYouTubeVideoId(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split("/")[0] || null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/shorts/")[1]?.split("/")[0] || null;
      }
      return parsed.searchParams.get("v") || null;
    }
    if (host === "youtu.be") {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function isVideoFileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}
