/**
 * Single source of truth for app colors.
 *
 * - `palette` : raw brand colors, named after what they evoke.
 * - `colors`  : semantic roles used across the app (primary, secondary, ...).
 *
 * The CSS theme in `src/index.css` mirrors these values so Tailwind classes
 * (`bg-primary`, `text-muted`, ...) stay in sync with the canvas renderer and
 * the PWA manifest, which cannot read CSS variables.
 */
export const palette = {
  topo: "#EEF1EC",
  contour: "#C9D3C6",
  ink: "#17252B",
  inkSoft: "#4A5A60",
  bib: "#2B50FF",
  strava: "#FC4C02",
  night: "#0F1C2E",
  white: "#FFFFFF",
  ember: "#FF6B2C",
  raspberry: "#E83F6F",
} as const;

export const colors = {
  primary: palette.bib,
  primaryForeground: palette.white,
  secondary: palette.ink,
  secondaryForeground: palette.white,
  background: palette.topo,
  foreground: palette.ink,
  muted: palette.inkSoft,
  border: palette.contour,
  accent: palette.strava,
  accentForeground: palette.white,
} as const;

/** Route colors offered in the editor. */
export const ROUTE_COLORS = [
  colors.primary,
  palette.ember,
  palette.white,
  palette.ink,
  palette.raspberry,
] as const;

/** Fill presets for the "Light" and "Night" backgrounds; the first one is the default. */
export const LIGHT_TINTS = [palette.topo, "#F5EFE0", "#F1E7D8", "#E8EEF5", "#F6E8E8", "#E6F1EA"] as const;
export const NIGHT_TINTS = [
  palette.night,
  palette.ink,
  "#1C1C1E",
  "#0B1F3A",
  "#10261F",
  "#241A2E",
  "#2A1418",
] as const;

/** Relative luminance (sRGB, 0..1) of a #RRGGBB color. */
export function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** Text color that reads well on `fill`. */
export const contrastText = (fill: string) => (luminance(fill) > 0.4 ? palette.ink : palette.white);
