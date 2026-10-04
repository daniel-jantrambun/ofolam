import { useEffect, useRef, useState } from "react";
import { drawCover, type Slide, slideSwatch } from "../lib/render";

type Props = {
  slides: Slide[];
  /** Id of the slide shown on the card. */
  activeId: string | null;
  /** Card size, so each thumbnail is framed like the card frames the photo. */
  target: { w: number; h: number };
  onSelect: (index: number) => void;
  onMove: (from: number, to: number) => void;
  label: (index: number, total: number) => string;
};

const THUMB_H = 64;
/** Movement (px) before a press becomes a drag: below it, the press is a plain selection. */
const DRAG_THRESHOLD = 6;

/**
 * Thumbnails of the carousel slides (photos, maps, plain fills). A tap selects one; dragging reorders them, with the mouse
 * or a finger (pointer events: the native HTML drag and drop does not exist on touch screens).
 * Keyboard: Shift + arrow moves the focused photo.
 */
export default function PhotoStrip({ slides: photos, activeId, target, onSelect, onMove, label }: Props) {
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const [dragId, setDragId] = useState<string | null>(null);
  // Latest props for the window listeners, which outlive the render that started the drag
  const latest = useRef({ photos, onMove });
  latest.current = { photos, onMove };
  // A drag ends with a click on the thumbnail under the pointer: that click must not select
  const suppressClick = useRef(false);

  const startPress = (id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    let dragging = false;
    const onPointerMove = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_THRESHOLD) return;
        dragging = true;
        suppressClick.current = true;
        setDragId(id);
      }
      ev.preventDefault();
      const { photos: list, onMove: move } = latest.current;
      const from = list.findIndex((p) => p.id === id);
      // The thumbnail under the pointer gives the new place
      const to = list.findIndex((p) => {
        const r = nodes.current.get(p.id)?.getBoundingClientRect();
        return (
          !!r &&
          ev.clientX >= r.left &&
          ev.clientX <= r.right &&
          ev.clientY >= r.top &&
          ev.clientY <= r.bottom
        );
      });
      if (from !== -1 && to !== -1 && to !== from) move(from, to);
    };
    const end = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setDragId(null);
      // Let the click that follows the release go by before selections work again
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (!e.shiftKey) return;
    const to = e.key === "ArrowLeft" ? index - 1 : e.key === "ArrowRight" ? index + 1 : -1;
    if (to < 0 || to >= photos.length) return;
    e.preventDefault();
    onMove(index, to);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((sl, i) => (
        <button
          type="button"
          key={sl.id}
          ref={(el) => {
            if (el) nodes.current.set(sl.id, el);
            else nodes.current.delete(sl.id);
          }}
          onClick={() => !suppressClick.current && onSelect(i)}
          onPointerDown={(e) => startPress(sl.id, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          aria-label={label(i + 1, photos.length)}
          aria-pressed={sl.id === activeId}
          // pan-y: a horizontal swipe on a thumbnail reorders, a vertical one still scrolls the page
          className={`shrink-0 touch-pan-y select-none overflow-hidden rounded-lg border-2 transition-transform ${photos.length > 1 ? "cursor-grab" : ""} ${sl.id === activeId ? "border-primary" : "border-border opacity-70 hover:opacity-100"} ${dragId === sl.id ? "z-10 scale-110 cursor-grabbing opacity-100 shadow-lg" : ""}`}
        >
          <PhotoThumb slide={sl} target={target} />
        </button>
      ))}
    </div>
  );
}

/** Small preview of one slide: the photo framed like the card frames it, or the slide's fill. */
function PhotoThumb({ slide, target }: { slide: Slide; target: { w: number; h: number } }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const width = Math.round((THUMB_H * target.w) / target.h);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = width * 2;
    const h = THUMB_H * 2;
    canvas.width = w;
    canvas.height = h;
    if (slide.kind === "photo" && slide.photo) return drawCover(ctx, slide.photo, w, h, slide.crop);
    ctx.fillStyle = slideSwatch(slide);
    ctx.fillRect(0, 0, w, h);
    // A glyph tells a map and an empty photo apart from a plain fill
    if (slide.kind === "night" || slide.kind === "topo") return;
    ctx.strokeStyle =
      slide.kind === "map" && slide.mapStyle !== "dark" ? "rgba(23,37,43,0.55)" : "rgba(255,255,255,0.7)";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const cx = w / 2;
    const cy = h / 2;
    const u = Math.min(w, h) / 5;
    ctx.beginPath();
    if (slide.kind === "map") {
      // Folded map: three panels
      ctx.moveTo(cx - 1.5 * u, cy - 0.7 * u);
      ctx.lineTo(cx - 0.5 * u, cy - u);
      ctx.lineTo(cx + 0.5 * u, cy - 0.7 * u);
      ctx.lineTo(cx + 1.5 * u, cy - u);
      ctx.lineTo(cx + 1.5 * u, cy + 0.7 * u);
      ctx.lineTo(cx + 0.5 * u, cy + u);
      ctx.lineTo(cx - 0.5 * u, cy + 0.7 * u);
      ctx.lineTo(cx - 1.5 * u, cy + u);
      ctx.closePath();
      ctx.moveTo(cx - 0.5 * u, cy - u);
      ctx.lineTo(cx - 0.5 * u, cy + 0.7 * u);
      ctx.moveTo(cx + 0.5 * u, cy - 0.7 * u);
      ctx.lineTo(cx + 0.5 * u, cy + u);
    } else {
      // Empty photo: a frame with a mountain
      ctx.rect(cx - 1.4 * u, cy - u, 2.8 * u, 2 * u);
      ctx.moveTo(cx - 1.4 * u, cy + 0.6 * u);
      ctx.lineTo(cx - 0.4 * u, cy - 0.2 * u);
      ctx.lineTo(cx + 0.3 * u, cy + 0.5 * u);
      ctx.lineTo(cx + 0.8 * u, cy + 0.1 * u);
      ctx.lineTo(cx + 1.4 * u, cy + 0.7 * u);
    }
    ctx.stroke();
  }, [slide, width]);
  return <canvas ref={ref} style={{ width, height: THUMB_H }} className="pointer-events-none block" />;
}
