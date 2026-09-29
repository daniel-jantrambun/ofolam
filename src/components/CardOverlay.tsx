import { useRef } from "react";
import type { Box } from "../lib/render";
import { clamp } from "../lib/crop";

export type OverlayItem = {
  key: string;
  box: Box;
  /** Pinch resizes the item (the route); text blocks only move. */
  resizable?: boolean;
  /** Item can only be selected, not dragged nor grouped (the Strava mention). */
  fixed?: boolean;
};

export type BoxChange = { key: string; box: Box };

type Props = {
  items: OverlayItem[];
  /** Selected keys; the last one is the primary selection. */
  selected: string[];
  onSelect: (keys: string[]) => void;
  onChange: (changes: BoxChange[]) => void;
};

const MIN_SIZE = 0.1;
const MAX_SIZE = 1.5;
/** Long press delay (ms) to add an item to the selection on touch devices. */
const LONG_PRESS_MS = 450;
/** Movement (fraction of the layer) that cancels a long press. */
const LONG_PRESS_TOLERANCE = 0.01;

const inside = (p: { x: number; y: number }, b: Box) =>
  p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

type Gesture = {
  /** Items moved by this gesture, with their box when it started. */
  targets: { key: string; box: Box }[];
  center: { x: number; y: number };
  dist: number;
  /** Only one resizable item → pinch resizes it. */
  resizable: boolean;
};

/**
 * Transparent layer over the preview canvas.
 * - Tap an item to select it, tap outside every item to clear the selection.
 * - Cmd/Ctrl + click, or a long press, toggles an item in a multi-selection.
 * - Drag moves the selected item(s); pinch resizes a single resizable item.
 * Never part of the exported image.
 */
export default function CardOverlay({ items, selected, onSelect, onChange }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const longPress = useRef<{ timer: number; key: string; origin: { x: number; y: number } } | null>(null);

  /** Pointer position as fractions of the layer. */
  const toFraction = (e: React.PointerEvent) => {
    const rect = layerRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const measure = () => {
    const pts = [...pointers.current.values()];
    const center = {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
    const dist = pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    return { center, dist };
  };

  const itemAt = (p: { x: number; y: number }) => [...items].reverse().find((i) => inside(p, i.box)) ?? null;
  const groupable = (key: string) => !items.find((i) => i.key === key)?.fixed;

  const startGesture = (keys: string[]) => {
    const targets = keys
      .map((key) => items.find((i) => i.key === key))
      .filter((i): i is OverlayItem => !!i && !i.fixed)
      .map((i) => ({ key: i.key, box: i.box }));
    gesture.current = targets.length
      ? { targets, ...measure(), resizable: targets.length === 1 && !!items.find((i) => i.key === targets[0].key)?.resizable }
      : null;
  };

  const cancelLongPress = () => {
    if (longPress.current) window.clearTimeout(longPress.current.timer);
    longPress.current = null;
  };

  const toggle = (key: string) =>
    onSelect(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const p = toFraction(e);
    const additive = e.metaKey || e.ctrlKey;

    if (pointers.current.size === 0) {
      const target = itemAt(p);
      if (!target) {
        if (!additive) onSelect([]);
        return;
      }
      if (additive) {
        if (groupable(target.key)) toggle(target.key);
        return;
      }
      // Touch: a long press adds the item to the selection instead of moving it
      if (e.pointerType === "touch" && groupable(target.key)) {
        cancelLongPress();
        longPress.current = {
          key: target.key,
          origin: p,
          timer: window.setTimeout(() => {
            longPress.current = null;
            gesture.current = null;
            navigator.vibrate?.(10);
            toggle(target.key);
          }, LONG_PRESS_MS),
        };
      }
      // Dragging a selected item moves the whole selection; otherwise select just this one
      const keys = selected.includes(target.key) ? selected : [target.key];
      if (!selected.includes(target.key)) onSelect(keys);
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.set(e.pointerId, p);
      startGesture(keys);
      return;
    }

    // Second finger: pinch on the current gesture
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, p);
    cancelLongPress();
    startGesture(gesture.current?.targets.map((t) => t.key) ?? selected);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = toFraction(e);
    pointers.current.set(e.pointerId, p);
    if (longPress.current) {
      const o = longPress.current.origin;
      if (Math.hypot(p.x - o.x, p.y - o.y) > LONG_PRESS_TOLERANCE) cancelLongPress();
    }
    const g = gesture.current;
    if (!g) return;
    const { center, dist } = measure();
    const scale = g.resizable && g.dist > 0 && dist > 0 ? dist / g.dist : 1;
    const dx = center.x - g.center.x;
    const dy = center.y - g.center.y;
    onChange(
      g.targets.map(({ key, box }) => {
        const w = clamp(box.w * scale, MIN_SIZE, MAX_SIZE);
        const h = box.h * (w / box.w);
        const cx = box.x + box.w / 2 + dx;
        const cy = box.y + box.h / 2 + dy;
        return { key, box: { x: clamp(cx, 0, 1) - w / 2, y: clamp(cy, 0, 1) - h / 2, w, h } };
      }),
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture(e.pointerId);
    cancelLongPress();
    if (pointers.current.size && gesture.current) startGesture(gesture.current.targets.map((t) => t.key));
    else gesture.current = null;
  };

  const multi = selected.length > 1;

  return (
    <div
      ref={layerRef}
      role="presentation"
      className="absolute inset-0 touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((i) => {
        const on = selected.includes(i.key);
        return (
          <div
            key={i.key}
            className={`pointer-events-none absolute rounded border border-dashed border-primary ${on ? (i.fixed ? "" : "cursor-move") : "opacity-0"}`}
            style={{
              left: `${i.box.x * 100}%`,
              top: `${i.box.y * 100}%`,
              width: `${i.box.w * 100}%`,
              height: `${i.box.h * 100}%`,
            }}
          >
            {/* Selection badge: shows the item belongs to a multi-selection */}
            {on && multi && (
              <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            )}
          </div>
        );
      })}
    </div>
  );
}
