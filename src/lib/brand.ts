/**
 * Official "Powered by Strava" logo (Strava API brand guidelines), drawn from the SVG files
 * in `public/strava/`. Same-origin, so the canvas stays exportable.
 */
export type BrandColor = "auto" | "black" | "white" | "orange";
export const BRAND_COLORS: BrandColor[] = ["auto", "black", "white", "orange"];

/** Intrinsic size of the horizontal logo files (365×37). */
export const BRAND_RATIO = 365 / 37;

const cache = new Map<string, HTMLImageElement | "loading" | "failed">();

/** Resolved file color for a brand color choice, given the card's text color. */
export function brandFile(color: BrandColor, textColor: string): Exclude<BrandColor, "auto"> {
  if (color !== "auto") return color;
  return textColor.toLowerCase() === "#ffffff" ? "white" : "black";
}

/** Returns the logo image when loaded, otherwise starts loading it and reports through `onLoad`. */
export function getBrandLogo(
  file: Exclude<BrandColor, "auto">,
  onLoad?: () => void,
): HTMLImageElement | null {
  const url = `/strava/powered-by-strava-${file}.svg`;
  const hit = cache.get(url);
  if (hit instanceof HTMLImageElement) return hit;
  if (hit) return null;
  cache.set(url, "loading");
  const img = new Image();
  img.onload = () => {
    cache.set(url, img);
    onLoad?.();
  };
  img.onerror = () => cache.set(url, "failed");
  img.src = url;
  return null;
}
