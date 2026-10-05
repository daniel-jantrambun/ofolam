import { GAP_X, GAP_Y, overlaps } from "./layout";
import type { Box, RenderResult } from "./render";

const EPS = 1e-6;
const outsideMargin = (b: Box) =>
  b.x < GAP_X - EPS || b.y < GAP_Y - EPS || b.x + b.w > 1 - GAP_X + EPS || b.y + b.h > 1 - GAP_Y + EPS;

/**
 * Problems of a render, as keys: pairs of blocks (texts, Strava logo, credit) that overlap, and
 * texts that run past the margin kept along the card edge (`edge|key`).
 */
export function collidingPairs(r: RenderResult): Set<string> {
  const entries: [string, Box][] = [
    ...(Object.entries(r.texts) as [string, Box][]),
    ["brand", r.brandBox],
    ["credit", r.creditBox],
  ];
  const pairs = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (overlaps(entries[i][1], entries[j][1])) pairs.add([entries[i][0], entries[j][0]].sort().join("|"));
    }
  }
  for (const [key, box] of Object.entries(r.texts) as [string, Box][]) {
    if (outsideMargin(box)) pairs.add(`edge|${key}`);
  }
  return pairs;
}

/** True when `next` has a problem (overlap, edge) that `base` did not have. */
export const hasNewCollision = (base: Set<string>, next: Set<string>) => [...next].some((p) => !base.has(p));

/** What `next` adds on top of `base`: a text past the card edge, and/or overlapping blocks. */
export function newProblems(base: Set<string>, next: Set<string>) {
  const added = [...next].filter((p) => !base.has(p));
  return {
    edge: added.some((p) => p.startsWith("edge|")),
    overlap: added.some((p) => !p.startsWith("edge|")),
  };
}

/**
 * Largest value in [min, requested] for which `fits` holds, assuming `fits` is monotonic (true
 * for small values, false from some threshold). Null when even `min` does not fit.
 */
export function largestFitting(
  requested: number,
  min: number,
  fits: (v: number) => boolean,
  steps = 8,
): number | null {
  if (fits(requested)) return requested;
  if (!fits(min)) return null;
  let lo = min;
  let hi = requested;
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}
