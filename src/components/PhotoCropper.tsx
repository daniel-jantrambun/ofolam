import { useCallback, useEffect, useRef } from "react";
import { useI18n } from "../i18n";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clamp, visibleFrame, type Crop, type Size } from "../lib/crop";
import type { Photo } from "../lib/render";

type Props = {
  photo: Photo;
  /** Size of the card the photo will cover: its aspect ratio drives the frame. */
  target: Size;
  value: Crop;
  onChange: (crop: Crop) => void;
};

const PREVIEW_MAX = 220;

/**
 * Focal point + zoom picker. Presentational: every change goes through `onChange`.
 * The photo is drawn once in a small canvas (an ImageBitmap has no URL to put in an <img>).
 */
export default function PhotoCropper({ photo, target, value, onChange }: Props) {
  const { t } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  const natural: Size = { w: photo.width, h: photo.height };
  const frame = visibleFrame(natural, target, value);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const scale = Math.min(1, PREVIEW_MAX / Math.max(natural.w, natural.h));
    canvas.width = Math.round(natural.w * scale);
    canvas.height = Math.round(natural.h * scale);
    canvas.getContext("2d")!.drawImage(photo, 0, 0, canvas.width, canvas.height);
  }, [photo, natural.w, natural.h]);

  const updateFromPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = boxRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      onChange({
        ...value,
        x: Math.round(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)),
        y: Math.round(clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)),
      });
    },
    [value, onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => dragging.current && updateFromPointer(e);
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const zoomLabel = value.zoom.toFixed(2).replace(/\.?0+$/, "");

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t.editor.cropHint}</p>
      <div className="flex justify-center rounded-xl bg-surface-2 p-2">
        <div
          ref={boxRef}
          role="presentation"
          className="relative inline-block cursor-crosshair touch-none select-none overflow-hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={previewRef} className="block max-h-[220px] max-w-full" aria-hidden="true" />
          {/* Visible region: everything outside is dimmed */}
          <div
            className="pointer-events-none absolute border border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            style={{
              left: `${frame.left * 100}%`,
              top: `${frame.top * 100}%`,
              width: `${frame.width * 100}%`,
              height: `${frame.height * 100}%`,
            }}
          />
          <div
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
            style={{ left: `${value.x}%`, top: `${value.y}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="photo-zoom" className="font-medium text-muted">
            {t.editor.zoom}
          </label>
          <span className="flex items-center gap-2 text-muted">
            {zoomLabel}×
            {value.zoom > 1 && (
              <button
                type="button"
                onClick={() => onChange({ ...value, zoom: 1 })}
                className="link"
              >
                {t.editor.resetZoom}
              </button>
            )}
          </span>
        </div>
        <input
          id="photo-zoom"
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={ZOOM_STEP}
          value={value.zoom}
          onChange={(e) => onChange({ ...value, zoom: Number.parseFloat(e.target.value) })}
          className="range w-full"
        />
      </div>
    </div>
  );
}
