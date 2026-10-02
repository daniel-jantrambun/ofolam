// Mediabunny is loaded on demand (dynamic import): it only matters once a video is picked
import { type Crop, type Size, visibleFrame } from "./crop";

/** Longest clip we export: the length of an Instagram story. */
export const VIDEO_MAX_SECONDS = 60;
/** Shortest clip the trimmer allows. */
export const VIDEO_MIN_SECONDS = 1;
const FRAME_RATE = 30;

/** A video picked by the user. Everything stays on the device. */
export type VideoClip = {
  file: File;
  /** Object URL used by the editor's <video> preview. */
  url: string;
  /** Display size, rotation applied. */
  width: number;
  height: number;
  duration: number;
  hasAudio: boolean;
  /** First frame, used by the crop picker. */
  poster: ImageBitmap;
};

/** Part of the clip that is exported, in seconds of the source. */
export type VideoTrim = { start: number; end: number };

/** True when the browser can encode video (WebCodecs): the "Video" background is hidden otherwise. */
export function canExportVideo(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof VideoDecoder !== "undefined";
}

/** Default trim: the beginning of the clip, capped to the maximum length. */
export function defaultTrim(duration: number): VideoTrim {
  return { start: 0, end: Math.min(duration, VIDEO_MAX_SECONDS) };
}

/**
 * Keeps a trim valid after one of its ends moved: inside the clip, at least
 * VIDEO_MIN_SECONDS long and at most VIDEO_MAX_SECONDS. The end that did not move follows.
 */
export function clampTrim(trim: VideoTrim, duration: number, moved: "start" | "end"): VideoTrim {
  const minLen = Math.min(VIDEO_MIN_SECONDS, duration);
  let start = Math.min(Math.max(0, trim.start), duration);
  let end = Math.min(Math.max(0, trim.end), duration);
  if (moved === "start") {
    start = Math.min(start, duration - minLen);
    end = Math.min(Math.max(end, start + minLen), start + VIDEO_MAX_SECONDS);
  } else {
    end = Math.max(end, minLen);
    start = Math.max(Math.min(start, end - minLen), end - VIDEO_MAX_SECONDS);
  }
  return { start, end };
}

/** Reads a picked file: size, duration, audio, first frame. Throws when the browser cannot decode it. */
export async function loadVideo(file: File): Promise<VideoClip> {
  const { ALL_FORMATS, BlobSource, CanvasSink, Input } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) throw new Error("Unsupported video");
    const [duration, audio] = await Promise.all([input.computeDuration(), input.getPrimaryAudioTrack()]);
    const sink = new CanvasSink(track, { poolSize: 1 });
    const first = await sink.getCanvas(await track.getFirstTimestamp());
    if (!first) throw new Error("Empty video");
    const poster = await createImageBitmap(first.canvas);
    return {
      file,
      url: URL.createObjectURL(file),
      width: track.displayWidth,
      height: track.displayHeight,
      duration,
      hasAudio: !!audio && (await audio.canDecode()),
      poster,
    };
  } finally {
    input.dispose();
  }
}

export function releaseVideo(clip: VideoClip | null) {
  if (!clip) return;
  URL.revokeObjectURL(clip.url);
  clip.poster.close();
}

/** Region of the source frame shown on the card, in display pixels (same math as the photo crop). */
export function videoCropRect(clip: Size, card: Size, crop: Crop) {
  const f = visibleFrame(clip, card, { ...crop, zoom: 1 });
  return {
    left: Math.round(f.left * clip.w),
    top: Math.round(f.top * clip.h),
    width: Math.round(f.width * clip.w),
    height: Math.round(f.height * clip.h),
  };
}

export type VideoExport = {
  clip: VideoClip;
  trim: VideoTrim;
  muted: boolean;
  crop: Crop;
  card: Size;
  /** Everything drawn above the video (veil, route, texts, credits), at the card size. */
  overlay: CanvasImageSource;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

/**
 * Burns the overlay into the trimmed, cropped clip and encodes it as an MP4
 * (H.264 + AAC, the formats Instagram accepts), entirely in the browser.
 */
export async function exportVideo({
  clip,
  trim,
  muted,
  crop,
  card,
  overlay,
  onProgress,
  signal,
}: VideoExport): Promise<Blob> {
  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, QUALITY_HIGH } =
    await import("mediabunny");
  const input = new Input({ source: new BlobSource(clip.file), formats: ALL_FORMATS });
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });
  const frame = document.createElement("canvas");
  frame.width = card.w;
  frame.height = card.h;
  const ctx = frame.getContext("2d")!;

  try {
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      trim,
      video: {
        crop: videoCropRect({ w: clip.width, h: clip.height }, card, crop),
        width: card.w,
        height: card.h,
        fit: "fill",
        frameRate: FRAME_RATE,
        codec: "avc",
        quality: QUALITY_HIGH,
        forceTranscode: true,
        process: (sample) => {
          ctx.clearRect(0, 0, card.w, card.h);
          sample.draw(ctx, 0, 0, card.w, card.h);
          ctx.drawImage(overlay, 0, 0, card.w, card.h);
          return frame;
        },
        processedWidth: card.w,
        processedHeight: card.h,
      },
      audio: muted ? { discard: true } : { codec: "aac" },
      showWarnings: false,
    });
    if (!conversion.isValid) throw new Error("Video cannot be converted");
    if (onProgress) conversion.onProgress = onProgress;
    const onAbort = () => void conversion.cancel();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      await conversion.execute();
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
    const buffer = output.target.buffer;
    if (!buffer) throw new Error("Empty output");
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    input.dispose();
  }
}
