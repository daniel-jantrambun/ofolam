import { useId, useState } from "react";
import { useI18n } from "../i18n";
import { clampTrim, type VideoTrim } from "../lib/video";

type Props = {
  duration: number;
  value: VideoTrim;
  /** `moved` tells which handle changed, so the preview can jump to it. */
  onChange: (trim: VideoTrim, moved: "start" | "end") => void;
};

const STEP = 0.1;
/** Seconds rounded to the hundredth, the precision of the fields. */
const round2 = (s: number) => Math.round(s * 100) / 100;

/** m:ss.s, precise enough to pick a cut point by eye. */
const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${rest}`;
};

/**
 * Two handles on one track for quick picks, and two fields in seconds for precise ones.
 * The kept part of the clip is capped to VIDEO_MAX_SECONDS.
 */
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
      <div className="flex items-end justify-between gap-3 text-sm">
        <TimeField label={t.editor.trimStart} value={value.start} onCommit={(s) => move("start", s)} />
        <span className="pb-2 font-medium text-foreground">
          {t.editor.trimLength(String(round2(value.end - value.start)))}
        </span>
        <TimeField label={t.editor.trimEnd} value={value.end} onCommit={(s) => move("end", s)} alignEnd />
      </div>
    </div>
  );
}

/**
 * Seconds field. Typing only edits a draft, applied on Enter or blur: applying every keystroke
 * would push the other end around while a number is half typed. Arrow keys step by 0.1 s
 * (1 s with Shift) and apply at once.
 */
function TimeField({
  label,
  value,
  onCommit,
  alignEnd = false,
}: {
  label: string;
  value: number;
  onCommit: (seconds: number) => void;
  alignEnd?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(round2(value));

  const commit = () => {
    if (draft === null) return;
    const seconds = Number.parseFloat(draft.replace(",", "."));
    setDraft(null);
    if (Number.isFinite(seconds)) onCommit(round2(seconds));
  };

  return (
    <div className={`flex flex-col gap-1 ${alignEnd ? "items-end" : ""}`}>
      <label htmlFor={id} className="text-muted">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const base = Number.parseFloat((draft ?? String(value)).replace(",", "."));
              const step = (e.shiftKey ? 1 : STEP) * (e.key === "ArrowUp" ? 1 : -1);
              setDraft(null);
              onCommit(round2((Number.isFinite(base) ? base : value) + step));
            }
          }}
          aria-describedby={`${id}-unit`}
          className="w-20 rounded-xl border border-border bg-surface px-3 py-1.5 text-right tabular-nums text-foreground outline-none focus:border-primary"
        />
        <span id={`${id}-unit`} className="text-muted" title={t.editor.trimSeconds}>
          s
        </span>
      </div>
    </div>
  );
}
