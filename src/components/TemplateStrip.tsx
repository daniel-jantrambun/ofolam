import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { Dictionary } from "../i18n/en";
import { type CardActivity, type CardOptions, renderCard, SIZES } from "../lib/render";
import { applyTemplate, type Template } from "../lib/templates";

type Props = {
  activity: CardActivity;
  opts: CardOptions;
  /** Shown in the strip. */
  templates: Template[];
  /** Shown in the "More" dialog. */
  more: Template[];
  onApply: (tpl: Template) => void;
  onDelete: (tpl: Template) => void;
  /** Bumped when an async asset (tile, logo) arrives, to refresh the thumbnails. */
  refreshTick: number;
};

const THUMB_H = 96;

function labelOf(tpl: Template, t: Dictionary): string {
  if (!tpl.builtIn) return tpl.name;
  const base = t.templates[tpl.name as keyof typeof t.templates];
  const name = typeof base === "string" ? base : tpl.name;
  if (!tpl.variant) return name;
  const variant = t.templates.variants[tpl.variant as keyof typeof t.templates.variants] ?? tpl.variant;
  return `${name} · ${variant}`;
}

/** Horizontal strip of live thumbnails: the current activity drawn with each template. */
export default function TemplateStrip({
  activity,
  opts,
  templates,
  more,
  onApply,
  onDelete,
  refreshTick,
}: Props) {
  const { t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <div className="flex items-start gap-3">
      <div className="-mx-1 flex min-w-0 flex-1 gap-3 overflow-x-auto px-1 pb-2">
        {templates.map((tpl) => (
          <div key={tpl.id} className="relative shrink-0">
            <TemplateButton
              activity={activity}
              opts={opts}
              tpl={tpl}
              refreshTick={refreshTick}
              onApply={onApply}
            />
            {!tpl.builtIn && (
              <button
                type="button"
                onClick={() => onDelete(tpl)}
                aria-label={t.templates.delete}
                title={t.templates.delete}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] leading-none text-secondary-foreground shadow"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {more.length > 0 && (
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="btn btn-outline btn-sm mt-1 shrink-0"
          aria-haspopup="dialog"
        >
          {t.templates.more}
        </button>
      )}
      {moreOpen && (
        <MoreDialog
          activity={activity}
          opts={opts}
          templates={more}
          refreshTick={refreshTick}
          onApply={(tpl) => {
            setMoreOpen(false);
            onApply(tpl);
          }}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </div>
  );
}

function TemplateButton({
  activity,
  opts,
  tpl,
  refreshTick,
  onApply,
}: {
  activity: CardActivity;
  opts: CardOptions;
  tpl: Template;
  refreshTick: number;
  onApply: (tpl: Template) => void;
}) {
  const { t } = useI18n();
  const label = labelOf(tpl, t);
  return (
    <button
      type="button"
      onClick={() => onApply(tpl)}
      className="group flex flex-col items-center gap-1"
      title={label}
    >
      <Thumb activity={activity} opts={applyTemplate(opts, tpl.options)} refreshTick={refreshTick} />
      <span className="max-w-[7rem] truncate text-xs text-muted group-hover:text-foreground">{label}</span>
    </button>
  );
}

/** Modal grid of the extra templates. Closes on Escape, on the backdrop and after a pick. */
function MoreDialog({
  activity,
  opts,
  templates,
  refreshTick,
  onApply,
  onClose,
}: {
  activity: CardActivity;
  opts: CardOptions;
  templates: Template[];
  refreshTick: number;
  onApply: (tpl: Template) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-secondary/50 p-0 sm:items-center sm:p-6">
      {/* The backdrop closes the dialog; keyboard users have the close button and Escape */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.templates.moreTitle}
        className="card relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-b-none sm:rounded-b-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-xl font-bold">{t.templates.moreTitle}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t.templates.close}
            title={t.templates.close}
            className="btn btn-ghost btn-sm"
          >
            <div className="text-2xl">×</div>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 overflow-y-auto p-4 sm:grid-cols-4 md:grid-cols-5">
          {templates.map((tpl) => (
            <TemplateButton
              key={tpl.id}
              activity={activity}
              opts={opts}
              tpl={tpl}
              refreshTick={refreshTick}
              onApply={onApply}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Renders the card at full size off screen, then scales it down into a small canvas. */
function Thumb({
  activity,
  opts,
  refreshTick,
}: {
  activity: CardActivity;
  opts: CardOptions;
  refreshTick: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const { w, h } = SIZES[opts.format];
  const width = Math.round((THUMB_H * w) / h);
  useEffect(() => {
    void refreshTick; // a tile or logo arrived: draw again with it
    const canvas = ref.current;
    if (!canvas) return;
    try {
      const off = document.createElement("canvas");
      renderCard(off, activity, opts);
      canvas.width = width * 2;
      canvas.height = THUMB_H * 2;
      canvas.getContext("2d")?.drawImage(off, 0, 0, canvas.width, canvas.height);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [activity, opts, width, refreshTick]);
  return (
    <canvas
      ref={ref}
      style={{ width, height: THUMB_H }}
      className={`rounded-lg border border-border bg-surface-2 ${failed ? "opacity-40" : ""}`}
    />
  );
}
