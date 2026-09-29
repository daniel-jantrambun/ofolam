import type { Activity } from "./api";
import type { Dictionary } from "../i18n/en";

const PACE_SPORTS = new Set(["Run", "TrailRun", "VirtualRun", "Walk", "Hike"]);
const SWIM_SPORTS = new Set(["Swim"]);

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

export function formatPaceOrSpeed(a: Activity, t: Dictionary): { value: string; unit: string; label: string } {
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

export const formatDate = (iso: string, t: Dictionary) =>
  new Intl.DateTimeFormat(t.locale, { weekday: "long", day: "numeric", month: "long" }).format(
    // start_date_local est en heure locale mais suffixé Z : on ignore le fuseau
    new Date(iso.replace("Z", "")),
  );

export const sportLabel = (sportType: string, t: Dictionary) => t.sports[sportType] ?? sportType;
