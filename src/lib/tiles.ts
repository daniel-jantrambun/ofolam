import type { MercatorTransform } from "./polyline";

/**
 * Raster basemap tiles drawn under the route, in the exact projection the route uses.
 *
 * The provider is configured through Vite env vars (see `.env.example`), with
 * {z}/{x}/{y} placeholders. Default: Stadia Maps (OpenStreetMap data), free for
 * non-commercial use, no key on localhost, domain registration in production.
 * Whatever the provider, it must send CORS headers so the canvas stays exportable.
 */
export type MapStyle = "light" | "bright" | "dark" | "ground" | "osm";

const DEFAULT_TILES: Record<MapStyle, string> = {
  light: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}@2x.png",
  bright: "https://tiles.stadiamaps.com/tiles/alidade_bright/{z}/{x}/{y}@2x.png",
  ground: "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}@2x.png",
  osm: "https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}@2x.png",
  dark: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png",
};
const DEFAULT_ATTRIBUTION = "© Stadia Maps © OpenMapTiles © OpenStreetMap contributors";

const env = import.meta.env as Record<string, string | undefined>;
const TILES: Record<MapStyle, string> = {
  light: env.VITE_TILES_LIGHT || DEFAULT_TILES.light,
  bright: env.VITE_TILES_BRIGHT || DEFAULT_TILES.bright,
  ground: env.VITE_TILES_GROUND || DEFAULT_TILES.ground,
  osm: env.VITE_TILES_OSM || DEFAULT_TILES.osm,
  dark: env.VITE_TILES_DARK || DEFAULT_TILES.dark,
};
export const MAP_ATTRIBUTION = env.VITE_TILES_ATTRIBUTION || DEFAULT_ATTRIBUTION;

/** Logical tile size; we fetch @2x images (512 px) for a sharp 1080 px canvas. */
const TILE = 256;
const MAX_ZOOM = 19;
/** A failed tile is retried after this delay. */
const RETRY_DELAY_MS = 4000;

const tileUrl = (style: MapStyle, z: number, x: number, y: number) =>
  TILES[style].replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));

const cache = new Map<string, HTMLImageElement | "loading" | "failed">();
/**
 * Redraw callbacks waiting for a tile in flight. Every caller that hits a "loading" tile registers
 * here: otherwise a render started without a callback (template thumbnails, carousel export)
 * would swallow the arrival and the main canvas would never be redrawn.
 */
const waiters = new Map<string, Set<() => void>>();

const notify = (url: string) => {
  const cbs = waiters.get(url);
  waiters.delete(url);
  for (const cb of cbs ?? []) cb();
};

/** Returns the tile if cached, otherwise starts loading it and reports back through `onLoad`. */
export function getTile(
  style: MapStyle,
  z: number,
  x: number,
  y: number,
  onLoad?: () => void,
): HTMLImageElement | null {
  const url = tileUrl(style, z, x, y);
  const hit = cache.get(url);
  if (hit instanceof HTMLImageElement) return hit;
  if (onLoad && hit === "loading") {
    const set = waiters.get(url) ?? new Set();
    set.add(onLoad);
    waiters.set(url, set);
  }
  if (hit) return null;
  if (onLoad) waiters.set(url, new Set([onLoad]));
  cache.set(url, "loading");
  const img = new Image();
  img.crossOrigin = "anonymous"; // required: a tainted canvas could not be exported
  img.onload = () => {
    cache.set(url, img);
    notify(url);
  };
  img.onerror = () => {
    // Transient network errors (QUIC resets, flaky connections) must not leave a hole in the
    // map until the page is reloaded: forget the failure after a while and redraw, which retries.
    cache.set(url, "failed");
    window.setTimeout(() => {
      cache.delete(url);
      notify(url);
    }, RETRY_DELAY_MS);
  };
  img.src = url;
  return null;
}

/**
 * Draws the tiles covering a w×h canvas for the given Mercator→pixel transform.
 * Missing tiles are requested; `onTileLoaded` fires for each arrival so the caller can redraw.
 * Returns true when every visible tile was drawn.
 */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: MercatorTransform,
  style: MapStyle,
  onTileLoaded?: () => void,
): boolean {
  // Pixels per Mercator unit of a tile pyramid at zoom z: TILE·2^z / 2π. Pick the
  // nearest integer zoom, then stretch tiles by the remaining ratio.
  const z = Math.max(0, Math.min(MAX_ZOOM, Math.round(Math.log2((t.scale * 2 * Math.PI) / TILE))));
  const n = 2 ** z;
  const tileMerc = (2 * Math.PI) / n; // Mercator units per tile
  const tilePx = tileMerc * t.scale; // drawn size of one tile, in canvas px

  // Mercator coords of the canvas edges
  const mercX = (px: number) => (px - t.tx) / t.scale;
  const mercY = (py: number) => (t.ty - py) / t.scale;
  const tx0 = Math.floor((mercX(0) + Math.PI) / tileMerc);
  const tx1 = Math.floor((mercX(w) + Math.PI) / tileMerc);
  const ty0 = Math.max(0, Math.floor((Math.PI - mercY(0)) / tileMerc));
  const ty1 = Math.min(n - 1, Math.floor((Math.PI - mercY(h)) / tileMerc));

  let complete = true;
  ctx.save();
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const wrappedX = ((tx % n) + n) % n; // wrap around the antimeridian
      const img = getTile(style, z, wrappedX, ty, onTileLoaded);
      if (!img) {
        complete = false;
        continue;
      }
      const px = t.scale * (tx * tileMerc - Math.PI) + t.tx;
      const py = t.ty - t.scale * (Math.PI - ty * tileMerc);
      // +0.5 px overlap hides hairline seams between stretched tiles
      ctx.drawImage(img, px, py, tilePx + 0.5, tilePx + 0.5);
    }
  }
  ctx.restore();
  return complete;
}
