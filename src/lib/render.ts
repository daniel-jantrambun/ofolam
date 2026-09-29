import type { Dictionary } from "../i18n/en";
import type { Activity } from "./api";
import { contrastText, palette } from "./colors";
import { type Crop, DEFAULT_CROP, visibleFrame } from "./crop";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPaceOrSpeed,
  sportLabel,
} from "./format";
import { decodePolyline, fitToBoxWithTransform } from "./polyline";
import { drawMap, MAP_ATTRIBUTION, type MapStyle } from "./tiles";

export type Format = "story" | "post" | "square" | "landscape";
export type Background = "transparent" | "night" | "topo" | "photo" | "map";
/** Decoded user photo. ImageBitmap keeps EXIF orientation; HTMLImageElement is the fallback. */
export type Photo = ImageBitmap | HTMLImageElement;
export type StatKey = "distance" | "time" | "pace" | "elevation";

export const SIZES: Record<Format, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
  square: { w: 1080, h: 1080 },
  landscape: { w: 1920, h: 1080 },
};

/** A box in fractions (0..1) of the card size. */
export type Box = { x: number; y: number; w: number; h: number };
/** Box the route is fitted into. */
export type RouteBox = Box;

/** Text blocks the user can style and move. Stats are keyed by their StatKey. */
export type TextKey = "title" | "meta" | `stat:${StatKey}`;
export type FontKey = "display" | "sans" | "serif" | "mono";
export type TextStyle = {
  font: FontKey | null; // null = default font of the block
  color: string | null; // null = background's text color
  bold: boolean | null; // null = default weight of the block
  /** Size multiplier applied to the block's default font size. null = 1. */
  size: number | null;
  /** Top-left corner, fractions of the card. null = automatic layout. */
  pos: { x: number; y: number } | null;
};
export const DEFAULT_TEXT_STYLE: TextStyle = { font: null, color: null, bold: null, size: null, pos: null };
export const TEXT_SIZE_MIN = 0.5;
export const TEXT_SIZE_MAX = 2;

export const FONTS: Record<FontKey, string> = {
  display: '"Barlow Condensed", "Arial Narrow", sans-serif',
  sans: '"Barlow", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'Menlo, Consolas, "Liberation Mono", monospace',
};

/** Everything the user can stack: the route and each text block. */
export type LayerKey = "route" | TextKey;

/** Default stacking, deepest first. Unknown keys (new stats) go on top in this order. */
export const DEFAULT_ORDER: LayerKey[] = [
  "route",
  "meta",
  "title",
  "stat:distance",
  "stat:time",
  "stat:pace",
  "stat:elevation",
];

/** Full stacking order (deepest first) from a partial user order. */
export function layerOrder(order: LayerKey[]): LayerKey[] {
  return [...order, ...DEFAULT_ORDER.filter((k) => !order.includes(k))];
}

/** Corner of the card holding the "Powered by Strava" mention. */
export type Corner = "tl" | "tr" | "bl" | "br";

export type RenderResult = {
  /** False while some map tiles are still loading. */
  complete: boolean;
  routeBox: RouteBox;
  texts: Partial<Record<TextKey, Box>>;
  order: LayerKey[];
  /** Box of the "Powered by Strava" mention, so it can be selected on the preview. */
  brandBox: Box;
};

export type CardOptions = {
  format: Format;
  background: Background;
  routeColor: string;
  stats: StatKey[];
  showName: boolean;
  showMeta: boolean;
  showRoute: boolean;
  /** Background photo, used when `background === "photo"`. */
  photo: Photo | null;
  /** How the photo is framed: focal point + zoom. */
  photoCrop: Crop;
  /** Basemap style, used when `background === "map"`. The map follows the route's box. */
  mapStyle: MapStyle;
  /** Custom fill for the "topo" and "night" backgrounds; null = default tint. */
  bgTint: { topo: string | null; night: string | null };
  /** Where the route is drawn, as fractions of the card. `null` = automatic layout. */
  routeBox: RouteBox | null;
  /** Per-block text overrides; missing = defaults. */
  texts: Partial<Record<TextKey, TextStyle>>;
  /** Stacking order, deepest first. The background is always below everything. */
  order: LayerKey[];
  /** Where the "Powered by Strava" mention sits. */
  brandCorner: Corner;
  /** Dictionary for stat labels, date and number formats. */
  t: Dictionary;
};

const BACKGROUNDS: Record<Background, { fill: string | null; text: string }> = {
  transparent: { fill: null, text: palette.white },
  night: { fill: palette.night, text: palette.white },
  topo: { fill: palette.topo, text: palette.ink },
  // Without a photo loaded yet, falls back to the night fill
  photo: { fill: palette.night, text: palette.white },
  // Placeholder while tiles load; the text color is picked from the map style
  map: { fill: palette.topo, text: palette.ink },
};
const MAP_TEXT: Record<MapStyle, { fill: string; text: string }> = {
  light: { fill: "#E9EDEA", text: palette.ink },
  dark: { fill: "#0B0F14", text: palette.white },
};

export type RenderHooks = {
  /** Called when a map tile arrives after the render: the caller should redraw. */
  onTileLoaded?: () => void;
};

/** Draws `img` like CSS `object-fit: cover`, framed by the crop (focal point + zoom). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: Photo,
  w: number,
  h: number,
  crop: Crop = DEFAULT_CROP,
) {
  const iw = img.width;
  const ih = img.height;
  const f = visibleFrame({ w: iw, h: ih }, { w, h }, crop);
  ctx.drawImage(img, f.left * iw, f.top * ih, f.width * iw, f.height * ih, 0, 0, w, h);
}

/** Loads a picked file into a drawable image, honouring EXIF orientation when supported. */
export async function loadPhoto(file: File): Promise<Photo> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Unsupported format for createImageBitmap: fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image illisible"));
      img.src = url;
    });
    return img;
  } finally {
    // The decoded bitmap stays usable after revoking the URL
    URL.revokeObjectURL(url);
  }
}

export function releasePhoto(photo: Photo | null) {
  if (photo && "close" in photo) photo.close();
}

const DISPLAY = FONTS.display;
const BODY = FONTS.sans;

/** Weight actually used: the override when set, else the block's default. */
const weightOf = (style: TextStyle, defaultWeight: number) =>
  style.bold === null ? defaultWeight : style.bold ? 700 : 400;
const familyOf = (style: TextStyle, defaultFamily: string) =>
  style.font ? FONTS[style.font] : defaultFamily;
const sizeOf = (style: TextStyle) => Math.min(TEXT_SIZE_MAX, Math.max(TEXT_SIZE_MIN, style.size ?? 1));

/** Call before the first render: the canvas does not wait for web fonts. */
export async function ensureFonts() {
  await Promise.all([document.fonts.load(`700 96px ${DISPLAY}`), document.fonts.load(`500 32px ${BODY}`)]);
}

function statFor(a: Activity, key: StatKey, t: Dictionary): { label: string; value: string; unit: string } {
  switch (key) {
    case "distance":
      return { label: t.stats.distance, ...formatDistance(a, t) };
    case "time":
      return { label: t.stats.time, value: formatDuration(a.movingTime), unit: "" };
    case "pace": {
      const p = formatPaceOrSpeed(a, t);
      return { label: p.label, value: p.value, unit: p.unit };
    }
    case "elevation":
      return { label: t.stats.elevation, ...formatElevation(a, t) };
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && lines.join(" ").length < text.length) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

/**
 * Draws the card. Returns the box the route was fitted into (the automatic one when
 * `opts.routeBox` is null), so the editor can start a drag from it.
 */
export function renderCard(
  canvas: HTMLCanvasElement,
  a: Activity,
  opts: CardOptions,
  hooks: RenderHooks = {},
): RenderResult {
  const { w, h } = SIZES[opts.format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const isMap = opts.background === "map" && !!a.polyline;
  const tint =
    opts.background === "topo" || opts.background === "night" ? opts.bgTint[opts.background] : null;
  const bg = isMap
    ? { fill: MAP_TEXT[opts.mapStyle].fill, text: MAP_TEXT[opts.mapStyle].text }
    : tint
      ? { fill: tint, text: contrastText(tint) }
      : BACKGROUNDS[opts.background];
  const P = 96;

  const hasPhoto = opts.background === "photo" && !!opts.photo;

  ctx.clearRect(0, 0, w, h);
  // The background is drawn later (see "Fond"): a map needs the route's projection,
  // which depends on the layout measured below.

  // On a transparent, photo or dark map background, a soft shadow keeps the text readable
  const needsShadow = opts.background === "transparent" || hasPhoto || (isMap && opts.mapStyle === "dark");
  const withShadow = (fn: () => void) => {
    ctx.save();
    if (needsShadow) {
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 2;
    }
    fn();
    ctx.restore();
  };

  ctx.textBaseline = "alphabetic";
  const texts: Partial<Record<TextKey, Box>> = {};
  const styleOf = (key: TextKey): TextStyle => opts.texts[key] ?? DEFAULT_TEXT_STYLE;
  const toBox = (x: number, y: number, bw: number, bh: number): Box => ({
    x: x / w,
    y: y / h,
    w: bw / w,
    h: bh / h,
  });

  // Each element is prepared as a closure so it can be drawn in the user's stacking
  // order, after the automatic layout has been measured in the natural reading order.
  const layers = new Map<LayerKey, () => void>();

  // --- Title ---
  // `top` is where the automatic layout ends: it drives the route's automatic box even
  // when the title blocks are moved elsewhere.
  let top = P;
  if (opts.showMeta) {
    const metaStyle = styleOf("meta");
    const k = sizeOf(metaStyle);
    const metaFont = `${weightOf(metaStyle, 500)} ${32 * k}px ${familyOf(metaStyle, BODY)}`;
    const meta = `${sportLabel(a.sportType, opts.t)}, ${formatDate(a.startDate, opts.t)}`;
    const mx = metaStyle.pos ? metaStyle.pos.x * w : P;
    const my = metaStyle.pos ? metaStyle.pos.y * h : top;
    layers.set("meta", () =>
      withShadow(() => {
        ctx.font = metaFont;
        ctx.fillStyle = metaStyle.color ?? bg.text;
        ctx.globalAlpha = metaStyle.color ? 1 : 0.8;
        ctx.fillText(meta, mx, my + 32 * k);
        texts.meta = toBox(mx, my, ctx.measureText(meta).width, 40 * k);
        ctx.globalAlpha = 1;
      }),
    );
    top += 32 * k + 24;
  }
  if (opts.showName) {
    const titleStyle = styleOf("title");
    const k = sizeOf(titleStyle);
    const titleFont = `${weightOf(titleStyle, 700)} ${72 * k}px ${familyOf(titleStyle, DISPLAY)}`;
    const lineH = 68 * k;
    ctx.font = titleFont;
    const lines = wrapLines(ctx, a.name, w - 2 * P, 2);
    // The anchor (tx, ty) is the top-left of the block's box, so a drag that reads the
    // box back as the new position leaves the text exactly where it is.
    const tx = titleStyle.pos ? titleStyle.pos.x * w : P;
    const ty = titleStyle.pos ? titleStyle.pos.y * h : top + 8;
    layers.set("title", () =>
      withShadow(() => {
        ctx.font = titleFont;
        ctx.fillStyle = titleStyle.color ?? bg.text;
        lines.forEach((line, i) => {
          ctx.fillText(line, tx, ty + 60 * k + lineH * i);
        });
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
        texts.title = toBox(tx, ty, widest, lineH * lines.length + 8 * k);
      }),
    );
    top += lineH * lines.length;
  }
  if (opts.showMeta || opts.showName) top += 48;

  // --- Stats (bottom) ---
  const footerH = 40;
  const statsH = opts.stats.length ? 150 : 0;
  const bottom = h - P - footerH - (statsH ? statsH + 32 : 0);

  if (opts.stats.length) {
    const colW = (w - 2 * P) / opts.stats.length;
    const valueSize = opts.stats.length >= 4 ? 76 : 96;
    opts.stats.forEach((key, i) => {
      const style = styleOf(`stat:${key}`);
      const k = sizeOf(style);
      const s = statFor(a, key, opts.t);
      const x = style.pos ? style.pos.x * w : P + i * colW;
      const baseY = style.pos ? style.pos.y * h : bottom + 32;
      const vSize = valueSize * k;
      const labelFont = `${weightOf(style, 500)} ${30 * k}px ${familyOf(style, BODY)}`;
      const valueFont = `${weightOf(style, 700)} ${vSize}px ${familyOf(style, DISPLAY)}`;
      const unitFont = `${weightOf(style, 600)} ${36 * k}px ${familyOf(style, DISPLAY)}`;
      layers.set(`stat:${key}`, () =>
        withShadow(() => {
          ctx.font = labelFont;
          ctx.fillStyle = style.color ?? bg.text;
          ctx.globalAlpha = style.color ? 1 : 0.75;
          ctx.fillText(s.label, x, baseY + 30 * k);
          const labelW = ctx.measureText(s.label).width;
          ctx.globalAlpha = 1;
          ctx.font = valueFont;
          ctx.fillText(s.value, x, baseY + 40 * k + vSize);
          let valueW = ctx.measureText(s.value).width;
          if (s.unit) {
            ctx.font = unitFont;
            ctx.fillText(` ${s.unit}`, x + valueW, baseY + 40 * k + vSize);
            valueW += ctx.measureText(` ${s.unit}`).width;
          }
          texts[`stat:${key}`] = toBox(x, baseY, Math.max(labelW, valueW), 40 * k + vSize + 12 * k);
        }),
      );
    });
  }

  // --- Route ---
  const autoBox: RouteBox = { x: P / w, y: top / h, w: (w - 2 * P) / w, h: (bottom - top - 24) / h };
  const routeBox = opts.routeBox ?? autoBox;
  const order = layerOrder(opts.order);
  const result: RenderResult = {
    complete: true,
    routeBox,
    texts,
    order,
    brandBox: { x: 0, y: 0, w: 0, h: 0 },
  };

  // The route is fitted even when hidden: a map background follows its box.
  let transform: import("./polyline").MercatorTransform | null = null;
  if (a.polyline) {
    const lineWidth = Math.round(Math.min(w, h) * 0.012);
    // The reported box hugs the drawn route (points + end dots). Fitting happens inside
    // the box minus that padding, so reading the box back as `routeBox` redraws the route
    // exactly where it is.
    const pad = lineWidth * 1.3;
    const fit = fitToBoxWithTransform(decodePolyline(a.polyline), {
      x: routeBox.x * w + pad,
      y: routeBox.y * h + pad,
      w: Math.max(1, routeBox.w * w - 2 * pad),
      h: Math.max(1, routeBox.h * h - 2 * pad),
    });
    const pts = fit.points;
    transform = fit.transform;
    if (pts.length >= 2) {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const [x, y] of pts) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      result.routeBox = {
        x: (minX - pad) / w,
        y: (minY - pad) / h,
        w: (maxX - minX + 2 * pad) / w,
        h: (maxY - minY + 2 * pad) / h,
      };
      const path = new Path2D();
      path.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) path.lineTo(x, y);

      if (opts.showRoute) {
        layers.set("route", () => {
          ctx.save();
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          if (needsShadow) {
            ctx.strokeStyle = "rgba(0,0,0,0.28)";
            ctx.lineWidth = lineWidth + 10;
            ctx.stroke(path);
          }
          ctx.strokeStyle = opts.routeColor;
          ctx.lineWidth = lineWidth;
          ctx.stroke(path);

          // Start: ring; finish: solid dot
          const [sx, sy] = pts[0];
          const [ex, ey] = pts[pts.length - 1];
          ctx.beginPath();
          ctx.arc(ex, ey, lineWidth * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = opts.routeColor;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx, sy, lineWidth * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = bg.fill ?? palette.white;
          ctx.fill();
          ctx.lineWidth = lineWidth * 0.6;
          ctx.strokeStyle = opts.routeColor;
          ctx.stroke();
          ctx.restore();
        });
      }
    }
  }

  // --- Background ---
  if (hasPhoto) {
    drawCover(ctx, opts.photo!, w, h, opts.photoCrop);
    // Dark veil at the top and bottom, where the title and the stats sit
    const veil = ctx.createLinearGradient(0, 0, 0, h);
    veil.addColorStop(0, "rgba(0,0,0,0.45)");
    veil.addColorStop(0.35, "rgba(0,0,0,0.05)");
    veil.addColorStop(0.65, "rgba(0,0,0,0.05)");
    veil.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, w, h);
  } else if (isMap && transform) {
    // Placeholder color under the tiles, visible until they arrive
    ctx.fillStyle = bg.fill!;
    ctx.fillRect(0, 0, w, h);
    result.complete = drawMap(ctx, w, h, transform, opts.mapStyle, hooks.onTileLoaded);
  } else if (bg.fill) {
    ctx.fillStyle = bg.fill;
    ctx.fillRect(0, 0, w, h);
  }

  // Draw deepest first
  for (const key of order) layers.get(key)?.();

  // --- Strava mention: always on top, never reordered nor hidden ---
  withShadow(() => {
    ctx.font = `500 24px ${BODY}`;
    ctx.fillStyle = bg.text;
    ctx.globalAlpha = 0.6;
    // TODO: replace with the official "Powered by Strava" logo (brand guidelines)
    const brand = "Powered by Strava";
    const bw = ctx.measureText(brand).width;
    const right = opts.brandCorner === "tr" || opts.brandCorner === "br";
    const topSide = opts.brandCorner === "tl" || opts.brandCorner === "tr";
    const bx = right ? w - P - bw : P;
    const by = topSide ? P - 16 : h - P + 10;
    ctx.fillText(brand, bx, by);
    // Generous hit box: the mention is small on a phone screen
    result.brandBox = toBox(bx - 12, by - 36, bw + 24, 48);
    if (isMap) {
      // Map data attribution (required by the OpenStreetMap licence), opposite corner of the same edge
      ctx.font = `400 20px ${BODY}`;
      const aw = ctx.measureText(MAP_ATTRIBUTION).width;
      ctx.fillText(MAP_ATTRIBUTION, right ? P : w - P - aw, by);
    }
    ctx.globalAlpha = 1;
  });

  return result;
}
