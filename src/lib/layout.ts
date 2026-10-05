import { clamp } from "./crop";
import type { Box } from "./render";

type Side = "left" | "right" | "top" | "bottom";

const EPS = 1e-6;

/** Gap kept between text blocks snapped or packed next to each other, and between a block and the card edge (fractions of the card). */
export const GAP_X = 0.025;
export const GAP_Y = 0.015;

export const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.h - EPS && a.y + a.h > b.y + EPS;

/** Range a box of size `size` may start in to stay inside [margin, 1 - margin]. */
const range = (size: number, margin: number) => {
  const lo = margin;
  const hi = 1 - margin - size;
  return [Math.min(lo, hi), Math.max(lo, hi)] as const;
};

/** Keeps the whole box inside the card, a small margin away from its edges. */
export function clampInside(box: Box): Box {
  const [x0, x1] = range(box.w, GAP_X);
  const [y0, y1] = range(box.h, GAP_Y);
  return { ...box, x: clamp(box.x, x0, x1), y: clamp(box.y, y0, y1) };
}

const place = (box: Box, o: Box, side: Side, gapX: number, gapY: number): Box => {
  switch (side) {
    case "left":
      return { ...box, x: o.x - box.w - gapX };
    case "right":
      return { ...box, x: o.x + o.w + gapX };
    case "top":
      return { ...box, y: o.y - box.h - gapY };
    case "bottom":
      return { ...box, y: o.y + o.h + gapY };
  }
};

/**
 * Sides of `o` ordered by how much the center of `box` leans towards them: the first one is
 * where the box was dropped relative to the center of `o`.
 */
function sidesByPreference(box: Box, o: Box): Side[] {
  // Offsets are normalized by the half-extent of the two boxes so wide blocks are not favored
  const dx = (box.x + box.w / 2 - (o.x + o.w / 2)) / ((box.w + o.w) / 2);
  const dy = (box.y + box.h / 2 - (o.y + o.h / 2)) / ((box.h + o.h) / 2);
  const horizontal: Side[] = dx < 0 ? ["left", "right"] : ["right", "left"];
  const vertical: Side[] = dy < 0 ? ["top", "bottom"] : ["bottom", "top"];
  return Math.abs(dx) >= Math.abs(dy)
    ? [horizontal[0], vertical[0], horizontal[1], vertical[1]]
    : [vertical[0], horizontal[0], vertical[1], horizontal[1]];
}

/**
 * Moves `box` out of every obstacle it overlaps: it snaps to the left, right, top or bottom of
 * the obstacle, depending on where its center lies relative to the obstacle's center. A side
 * that would push it out of the card or into another obstacle is skipped. A small gap is kept
 * between the two blocks when there is room for it.
 */
export function resolveOverlap(box: Box, obstacles: Box[], gapX = GAP_X, gapY = GAP_Y): Box {
  let current = clampInside(box);
  for (let pass = 0; pass <= obstacles.length; pass++) {
    const hit = obstacles.find((o) => overlaps(current, o));
    if (!hit) break;
    const candidates = sidesByPreference(current, hit).map((side) =>
      clampInside(place(current, hit, side, gapX, gapY)),
    );
    current =
      candidates.find((c) => !obstacles.some((o) => overlaps(c, o))) ??
      candidates.find((c) => !overlaps(c, hit)) ??
      current;
    if (overlaps(current, hit)) break;
  }
  return current;
}

/**
 * Separates boxes that overlap along `axis`: they are taken in their current order along that
 * axis and each one is pushed after the previous one only when they collide, so gaps are kept.
 * The whole run is shifted back if it would run past the end of the card.
 */
export function spreadAlong<K extends string>(
  items: { key: K; box: Box }[],
  axis: "x" | "y",
): { key: K; box: Box }[] {
  const pos = axis === "x" ? "x" : "y";
  const len = axis === "x" ? "w" : "h";
  const sorted = [...items].sort((a, b) => a.box[pos] + a.box[len] / 2 - (b.box[pos] + b.box[len] / 2));
  let cursor = Number.NEGATIVE_INFINITY;
  const placed = sorted.map(({ key, box }) => {
    const start = Math.max(box[pos], cursor);
    cursor = start + box[len];
    return { key, box: { ...box, [pos]: start } };
  });
  const overflow = Math.min(0, 1 - cursor);
  return placed.map(({ key, box }) => ({ key, box: clampInside({ ...box, [pos]: box[pos] + overflow }) }));
}

/** True when every box shares a common band along the other axis (a row for "x", a column for "y"). */
export function sharesBand(boxes: Box[], axis: "x" | "y"): boolean {
  if (boxes.length < 2) return false;
  const pos = axis === "x" ? "y" : "x";
  const len = axis === "x" ? "h" : "w";
  return Math.max(...boxes.map((b) => b[pos])) < Math.min(...boxes.map((b) => b[pos] + b[len]));
}

/**
 * Lines the boxes up along `axis` in their current order, separated by `gap`, as one run that
 * starts at `from` ("start"), ends at `to` ("end") or is centered between both ("center").
 * The coordinate on the other axis is left untouched.
 */
export function packAlong<K extends string>(
  items: { key: K; box: Box }[],
  axis: "x" | "y",
  anchor: "start" | "center" | "end",
  from: number,
  to: number,
  gap: number,
): { key: K; box: Box }[] {
  const pos = axis;
  const len = axis === "x" ? "w" : "h";
  const sorted = [...items].sort((a, b) => a.box[pos] + a.box[len] / 2 - (b.box[pos] + b.box[len] / 2));
  const total = sorted.reduce((s, i) => s + i.box[len], 0) + gap * (sorted.length - 1);
  let cursor = anchor === "start" ? from : anchor === "end" ? to - total : (from + to) / 2 - total / 2;
  return sorted.map(({ key, box }) => {
    const placed = { key, box: clampInside({ ...box, [pos]: cursor }) };
    cursor += box[len] + gap;
    return placed;
  });
}
