import type { Dictionary } from "../i18n/en";
import type { Activity } from "./api";

const PACE_SPORTS = new Set(["Run", "TrailRun", "VirtualRun", "Walk", "Hike"]);
const SWIM_SPORTS = new Set(["Swim"]);
/** Cadence counted in strokes per minute (Strava sends it as is). */
const STROKE_SPORTS = new Set(["Swim", "Rowing", "VirtualRow"]);

export const usesPace = (a: Activity) => PACE_SPORTS.has(a.sportType) || SWIM_SPORTS.has(a.sportType);

// Formatters are cached per BCP 47 tag: creating an Intl object is comparatively expensive
const formatters = new Map<string, Intl.NumberFormat>();
function nf(locale: string, digits: number) {
  const key = `${locale}:${digits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(key, f);
  }
  return f;
}

export function formatDistance(a: Activity, t: Dictionary): { value: string; unit: string } {
  if (SWIM_SPORTS.has(a.sportType)) return { value: nf(t.locale, 0).format(a.distance), unit: "m" };
  const km = a.distance / 1000;
  return { value: km < 10 ? nf(t.locale, 2).format(km) : nf(t.locale, 1).format(km), unit: "km" };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatPaceOrSpeed(
  a: Activity,
  t: Dictionary,
): { value: string; unit: string; label: string } {
  if (!a.averageSpeed) return { value: "–", unit: "", label: t.stats.pace };
  if (SWIM_SPORTS.has(a.sportType)) {
    return { value: formatDuration(100 / a.averageSpeed), unit: "/100 m", label: t.stats.pace };
  }
  if (PACE_SPORTS.has(a.sportType)) {
    return { value: formatDuration(1000 / a.averageSpeed), unit: "/km", label: t.stats.pace };
  }
  return { value: nf(t.locale, 1).format(a.averageSpeed * 3.6), unit: "km/h", label: t.stats.speed };
}

export const formatElevation = (a: Activity, t: Dictionary) => ({
  value: nf(t.locale, 0).format(a.elevation),
  unit: "m",
});

/**
 * Average cadence in the unit of the sport. Strava sends rides in rpm and swims/rows in strokes
 * per minute, but runs in steps of ONE leg: doubled here to get the usual steps per minute.
 */
export function formatCadence(a: Activity, t: Dictionary): { value: string; unit: string } {
  const raw = a.averageCadence ?? 0;
  if (PACE_SPORTS.has(a.sportType)) {
    return { value: nf(t.locale, 0).format(raw * 2), unit: t.cadenceUnits.steps };
  }
  if (STROKE_SPORTS.has(a.sportType)) {
    return { value: nf(t.locale, 0).format(raw), unit: t.cadenceUnits.strokes };
  }
  return { value: nf(t.locale, 0).format(raw), unit: t.cadenceUnits.rpm };
}

export const formatHeartrate = (a: Activity, t: Dictionary) => ({
  value: nf(t.locale, 0).format(a.averageHeartrate ?? 0),
  unit: "bpm",
});

export const formatCalories = (a: Activity, t: Dictionary) => ({
  value: nf(t.locale, 0).format(a.calories ?? 0),
  unit: "kcal",
});

export const formatDate = (iso: string, t: Dictionary) =>
  new Intl.DateTimeFormat(t.locale, { weekday: "long", day: "numeric", month: "long" }).format(
    // start_date_local is local time with a Z suffix: ignore the timezone
    new Date(iso.replace("Z", "")),
  );

export const sportLabel = (sportType: string, t: Dictionary) => t.sports[sportType] ?? sportType;
