import { useI18n } from "../i18n";
import { clampTrim, type VideoTrim } from "../lib/video";

type Props = {
  duration: number;
  value: VideoTrim;
  /** `moved` tells which handle changed, so the preview can jump to it. */
  onChange: (trim: VideoTrim, moved: "start" | "end") => void;
};

const STEP = 0.1;

/** m:ss.s, precise enough to pick a cut point by eye. */
const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${rest}`;
};

/** Two handles on one track: the kept part of the clip, capped to VIDEO_MAX_SECONDS. */
export default function VideoTrimmer({ duration, value, onChange }: Props) {
  const { t } = useI18n();
  const pct = (s: number) => `${(duration > 0 ? s / duration : 0) * 100}%`;
  const move = (which: "start" | "end", seconds: number) =>
    onChange(clampTrim({ ...value, [which]: seconds }, duration, which), which);

  return (
    <div className="space-y-2">
      <div className="relative h-8">
        <div className="absolute inset-x-2.5 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-2">
          <div
            className="absolute inset-y-0 rounded-full bg-primary/60"
            style={{ left: pct(value.start), width: pct(value.end - value.start) }}
          />
        </div>
        <input
          type="range"
          className="trim-range"
          min={0}
          max={duration}
          step={STEP}
          value={value.start}
          onChange={(e) => move("start", Number.parseFloat(e.target.value))}
          aria-label={t.editor.trimStart}
          aria-valuetext={formatTime(value.start)}
        />
        <input
          type="range"
          className="trim-range"
          min={0}
          max={duration}
          step={STEP}
          value={value.end}
          onChange={(e) => move("end", Number.parseFloat(e.target.value))}
          aria-label={t.editor.trimEnd}
          aria-valuetext={formatTime(value.end)}
        />
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{formatTime(value.start)}</span>
        <span className="font-medium text-foreground">
          {t.editor.trimLength((value.end - value.start).toFixed(1))}
        </span>
        <span>{formatTime(value.end)}</span>
      </div>
    </div>
  );
}
