import type { Activity } from "./api";

/**
 * Back-to-back activities (triathlon, swim & run, duathlon, …) are detected from their
 * timestamps: the next leg starts within `GAP_S` of the previous one's end.
 */
const GAP_S = 10 * 60;

/** Sport types Strava/Garmin use for transitions: kept in the total time, not drawn. */
const TRANSITION_TYPES = new Set(["Workout", "Transition"]);

export type MultiKind = "triathlon" | "duathlon" | "swimrun" | "aquabike" | "multisport";

export type MetaActivity = {
  id: string;
  kind: MultiKind;
  /** All activities in chronological order, transitions included. */
  legs: Activity[];
  /** Legs worth showing: real sports with a distance (no transitions). */
  sportLegs: Activity[];
  startDate: string;
  /** From the first start to the last finish, transitions included (seconds). */
  totalTime: number;
};

export type ListEntry = { kind: "single"; activity: Activity } | { kind: "multi"; meta: MetaActivity };

/**
 * Start in seconds. Prefers the real UTC start; falls back to the local start (cached
 * entries from before `startUtc` existed): legs of one event share a timezone, so the
 * differences between them stay right.
 */
const startS = (a: Activity) => Date.parse(a.startUtc ?? a.startDate) / 1000;
const endS = (a: Activity) => startS(a) + a.elapsedTime;

const SWIM = new Set(["Swim"]);
const RIDE = new Set(["Ride", "GravelRide", "MountainBikeRide", "VirtualRide", "EBikeRide"]);
const RUN = new Set(["Run", "TrailRun", "VirtualRun"]);
const kindOf = (s: string) => (SWIM.has(s) ? "S" : RIDE.has(s) ? "B" : RUN.has(s) ? "R" : "X");

/** Label key from the sequence of sports, e.g. S-B-R → triathlon. */
export function multiKind(sportLegs: Activity[]): MultiKind {
  const seq = sportLegs.map((a) => kindOf(a.sportType)).join("");
  if (/^S+B+R+$/.test(seq)) return "triathlon";
  if (/^R+B+R+$/.test(seq) || /^B+R+$/.test(seq) || /^R+B+$/.test(seq)) return "duathlon";
  if (/^(SR)+S?$/.test(seq) || /^(RS)+R?$/.test(seq)) return "swimrun";
  if (/^S+B+$/.test(seq)) return "aquabike";
  return "multisport";
}

export function buildMeta(legs: Activity[]): MetaActivity {
  const sorted = [...legs].sort((a, b) => startS(a) - startS(b));
  const sportLegs = sorted.filter((a) => !TRANSITION_TYPES.has(a.sportType) && a.distance > 0);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return {
    id: `multi:${sorted.map((a) => a.id).join("-")}`,
    kind: multiKind(sportLegs),
    legs: sorted,
    sportLegs,
    startDate: first.startDate,
    totalTime: Number.isFinite(endS(last) - startS(first))
      ? Math.max(0, Math.round(endS(last) - startS(first)))
      : sorted.reduce((sum, a) => sum + a.elapsedTime, 0),
  };
}

/**
 * Groups a list of activities (any order) into entries, newest first.
 */
export function groupActivities(list: Activity[]): ListEntry[] {
  const sorted = [...list].sort((a, b) => (startS(a) || 0) - (startS(b) || 0));
  const groups: Activity[][] = [];
  for (const a of sorted) {
    const g = groups[groups.length - 1];
    const prev = g?.[g.length - 1];
    if (
      prev &&
      Number.isFinite(startS(a)) &&
      Number.isFinite(endS(prev)) &&
      startS(a) - endS(prev) <= GAP_S &&
      startS(a) >= startS(prev)
    ) {
      g.push(a);
    } else {
      groups.push([a]);
    }
  }
  const entries: ListEntry[] = [];
  for (const g of groups) {
    const meta = g.length > 1 ? buildMeta(g) : null;
    // A group needs at least two real sports to be an event; otherwise keep singles
    if (meta && meta.sportLegs.length >= 2) entries.push({ kind: "multi", meta });
    else for (const activity of g) entries.push({ kind: "single", activity });
  }
  return entries.reverse();
}
