import type { Dictionary } from "../i18n/en";
import type { Activity } from "./api";
import { BRAND_RATIO, type BrandColor, brandFile, getBrandLogo } from "./brand";
import { contrastText, palette, ROUTE_COLORS } from "./colors";
import { type Crop, DEFAULT_CROP, visibleFrame } from "./crop";
import {
  formatCadence,
  formatCalories,
  formatDate,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartrate,
  formatPaceOrSpeed,
  sportLabel,
} from "./format";
import { decodePolyline, fitToBoxWithTransform, trimRoute } from "./polyline";
import { drawMap, MAP_ATTRIBUTION, type MapStyle } from "./tiles";
import type { VideoClip, VideoTrim } from "./video";

export type Format = "story" | "post" | "square" | "landscape";
/**
 * What sits behind the card. "slides" is the still-image background: a list of one to ten
 * slides (photo, map or plain fill), exported as one picture each. "video" and "transparent"
 * (the sticker) stand apart.
 */
export type Background = "slides" | "video" | "transparent";
export type SlideKind = "photo" | "map" | "night" | "topo";
/** Decoded user photo. ImageBitmap keeps EXIF orientation; HTMLImageElement is the fallback. */
export type Photo = ImageBitmap | HTMLImageElement;
/**
 * Colors a slide overrides. A missing entry inherits the card-wide one (`CardOptions.routeColor`,
 * `texts[key].color`...); for texts and the credit, `null` is the explicit "automatic" color.
 */
export type SlideColors = {
  texts?: Partial<Record<TextKey, string | null>>;
  route?: string;
  legs?: (string | null)[];
  credit?: string | null;
  brand?: BrandColor;
};
/**
 * One background of the "slides" list. Every slide carries the settings of all kinds, so
 * switching its kind back and forth loses nothing; only those of its `kind` are used.
 */
export type Slide = {
  id: string;
  kind: SlideKind;
  /** Element colors of this slide only: the backgrounds differ, so the colors that suit them do too. */
  colors: SlideColors;
  /** kind "photo": the picture (null until one is chosen: drawn as a night fill) and its framing. */
  photo: Photo | null;
  crop: Crop;
  /** kind "map": basemap style and intensity, 0..1 (the tiles are veiled by 1 - intensity). */
  mapStyle: MapStyle;
  mapOpacity: number;
  /** kinds "topo" and "night": custom fill; null = default tint. */
  tint: { topo: string | null; night: string | null };
};
/** Instagram accepts more, but past ten the editor strip and the export get unwieldy. */
export const SLIDES_MAX = 10;
export const newSlide = (kind: SlideKind, from?: Partial<Slide>): Slide => ({
  photo: null,
  crop: DEFAULT_CROP,
  colors: {},
  mapStyle: "bright",
  mapOpacity: 1,
  tint: { topo: null, night: null },
  ...from,
  id: crypto.randomUUID(),
  kind,
});
export type StatKey =
  | "distance"
  | "time"
  | "pace"
  | "elevation"
  | "power"
  | "cadence"
  | "heartrate"
  | "calories";

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
export type TextKey = "title" | "meta" | "legs" | `stat:${StatKey}`;

/**
 * What the card is about: one activity, or a multisport event whose `legs` are drawn
 * together (one color each) with the total time and one compact line per leg.
 */
export type CardActivity = Activity & { legs?: Activity[]; totalTime?: number };
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

/** Everything the user can move: the route and each text block. */
export type LayerKey = "route" | TextKey;

/** Fixed stacking, deepest first: the route, then the texts. The background is below everything. */
export const DRAW_ORDER: LayerKey[] = [
  "route",
  "meta",
  "title",
  "stat:distance",
  "stat:time",
  "stat:pace",
  "stat:elevation",
  "stat:power",
  "stat:cadence",
  "stat:heartrate",
  "stat:calories",
  "legs",
];

/** Corner of the card holding the "Powered by Strava" mention. */
export type Corner = "tl" | "tr" | "bl" | "br";

export type RenderResult = {
  /** False while some map tiles are still loading. */
  complete: boolean;
  routeBox: RouteBox;
  texts: Partial<Record<TextKey, Box>>;
  /** Box of the "Powered by Strava" mention, so it can be selected on the preview. */
  brandBox: Box;
  /** Box of the "Created on ofolam.com" credit, so it can be selected on the preview. */
  creditBox: Box;
  /** Offset between `brandBox` and the logo's own top-left (the hit box is padded). */
  brandInset: { x: number; y: number };
};

export type MetaParts = "all" | "sport" | "date";

export type CardOptions = {
  format: Format;
  background: Background;
  routeColor: string;
  stats: StatKey[];
  showName: boolean;
  showMeta: boolean;
  /** What the meta line shows: sport and date, only the sport, or only the date. */
  metaParts: MetaParts;
  showRoute: boolean;
  /** Custom activity name drawn instead of Strava's; null = Strava's name. */
  titleText: string | null;
  /** Meters hidden at the start and at the end of the route (privacy). 0 = full route. */
  routeTrim: number;
  /** Multisport: one color per leg (index in `legs`); null = palette default for that index. */
  legColors: (string | null)[];
  /** Multisport: draw the compact per-leg lines. */
  showLegs: boolean;
  /**
   * Backgrounds used when `background === "slides"`, never empty. Several slides make a
   * carousel: the same card drawn once per slide.
   */
  slides: Slide[];
  /** Which slide is drawn. */
  slideIndex: number;
  /**
   * Background video, used when `background === "video"`. The card only draws the veil and the
   * elements above it: the video plays underneath in the editor and is composited at export.
   */
  video: VideoClip | null;
  /** How the video is framed: focal point only (no zoom). */
  videoCrop: Crop;
  videoTrim: VideoTrim;
  videoMuted: boolean;
  /** Where the route is drawn, as fractions of the card. `null` = automatic layout. */
  routeBox: RouteBox | null;
  /** Same as `routeBox`, but only for map slides: the trace needs its own framing over a basemap. */
  mapRouteBox: RouteBox | null;
  /** Per-block text overrides; missing = defaults. */
  texts: Partial<Record<TextKey, TextStyle>>;
  /** Where the "Powered by Strava" logo sits, and which of the official color variants is used. */
  brandCorner: Corner;
  /** Free position of the logo (top-left, fractions); null = the corner above. */
  brandPos: { x: number; y: number } | null;
  /**
   * Margins the automatic layout keeps clear (fractions of the card), e.g. the parts of a
   * story hidden by Instagram's interface. Zero = the normal padding.
   */
  safeInsets: { top: number; bottom: number; left: number; right: number };
  brandColor: BrandColor;
  /** Color of the "Created on ofolam.com" credit; null = background's text color. */
  creditColor: string | null;
  /** Free position of the credit (top-left, fractions); null = corner opposite to the logo. */
  creditPos: { x: number; y: number } | null;
  /** Dictionary for stat labels, date and number formats. */
  t: Dictionary;
};

const BACKGROUNDS: Record<SlideKind | "video" | "transparent", { fill: string | null; text: string }> = {
  transparent: { fill: null, text: palette.white },
  night: { fill: palette.night, text: palette.white },
  topo: { fill: palette.topo, text: palette.ink },
  // Without a photo loaded yet, falls back to the night fill
  photo: { fill: palette.night, text: palette.white },
  video: { fill: palette.night, text: palette.white },
  // Placeholder while tiles load; the text color is picked from the map style
  map: { fill: palette.topo, text: palette.ink },
};
const MAP_TEXT: Record<MapStyle, { fill: string; text: string }> = {
  light: { fill: "#E9EDEA", text: palette.ink },
  bright: { fill: "#F7F8F8", text: palette.ink },
  ground: { fill: "#E9EDEA", text: palette.ink },
  osm: { fill: "#E9EDEA", text: palette.ink },
  dark: { fill: "#0B0F14", text: palette.white },
};

export type RenderHooks = {
  /** Called when an asset (map tile, Strava logo) arrives after the render: the caller should redraw. */
  onTileLoaded?: () => void;
  /** Only measures the layout (boxes): no background, map tile nor route is drawn. */
  layoutOnly?: boolean;
};

/** Text of the meta line for the chosen parts. */
export const metaLabel = (parts: MetaParts, sport: string, date: string) =>
  parts === "sport" ? sport : parts === "date" ? date : `${sport}, ${date}`;

/** Draws `img` like CSS `object-fit: cover`, framed by the crop (focal point + zoom). */
export function drawCover(
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

/** The slide currently drawn. */
export const activeSlide = (o: Pick<CardOptions, "slides" | "slideIndex">): Slide | null =>
  o.slides[Math.min(Math.max(0, o.slideIndex), o.slides.length - 1)] ?? null;

/** The options as drawn for a slide: its own colors laid over the card-wide ones. */
export function withSlideColors(o: CardOptions, slide: Slide | null): CardOptions {
  const c = slide?.colors;
  if (!c) return o;
  const texts = { ...o.texts };
  for (const [k, color] of Object.entries(c.texts ?? {}) as [TextKey, string | null][])
    texts[k] = { ...(texts[k] ?? DEFAULT_TEXT_STYLE), color };
  return {
    ...o,
    texts,
    routeColor: c.route ?? o.routeColor,
    legColors: c.legs ?? o.legColors,
    creditColor: c.credit !== undefined ? c.credit : o.creditColor,
    brandColor: c.brand ?? o.brandColor,
  };
}

/**
 * Changes colors where the user is looking: on the slide being shown, or on the card-wide
 * options when there is no slide (video, sticker).
 */
export function setColors(o: CardOptions, patch: SlideColors): CardOptions {
  const at = Math.min(Math.max(0, o.slideIndex), o.slides.length - 1);
  if (o.background === "slides" && o.slides[at]) {
    const merge = (c: SlideColors): SlideColors => ({
      ...c,
      ...patch,
      texts: { ...c.texts, ...patch.texts },
    });
    return { ...o, slides: o.slides.map((s, i) => (i === at ? { ...s, colors: merge(s.colors) } : s)) };
  }
  const texts = { ...o.texts };
  for (const [k, color] of Object.entries(patch.texts ?? {}) as [TextKey, string | null][])
    texts[k] = { ...(texts[k] ?? DEFAULT_TEXT_STYLE), color };
  return {
    ...o,
    texts,
    routeColor: patch.route ?? o.routeColor,
    legColors: patch.legs ?? o.legColors,
    creditColor: patch.credit !== undefined ? patch.credit : o.creditColor,
    brandColor: patch.brand ?? o.brandColor,
  };
}

/** Gives every slide the colors of the one being shown. */
export function colorsToAllSlides(o: CardOptions): CardOptions {
  const from = activeSlide(o);
  if (!from) return o;
  return {
    ...o,
    slides: o.slides.map((s) => ({
      ...s,
      colors: {
        ...from.colors,
        texts: { ...from.colors.texts },
        legs: from.colors.legs && [...from.colors.legs],
      },
    })),
  };
}

/** Flat color standing for a slide in a thumbnail (a photo draws itself instead). */
export function slideSwatch(slide: Slide): string {
  if (slide.kind === "map") return MAP_TEXT[slide.mapStyle].fill;
  if (slide.kind === "photo") return palette.night;
  return slide.tint[slide.kind] ?? BACKGROUNDS[slide.kind].fill ?? palette.night;
}

export function releasePhoto(photo: Photo | null) {
  if (photo && "close" in photo) photo.close();
}

/** Our own credit line on every picture, kept apart from the Strava mention. */
/** Drawn as two runs: a regular prefix and a bold, slightly larger site name. */
// "Made with" is the idiom for a tool credit; the prefix follows the UI language, the name never changes
const SITE_CREDIT_NAME = "OFOLAM.COM";

/** Default colors for the legs of a multisport event, by leg index. */
export const LEG_PALETTE: readonly string[] = ROUTE_COLORS.filter(
  (c) => c !== palette.white && c !== palette.ink,
);

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

function statFor(
  a: CardActivity,
  key: StatKey,
  t: Dictionary,
): { label: string; value: string; unit: string } {
  switch (key) {
    case "distance":
      return { label: t.stats.distance, ...formatDistance(a, t) };
    case "time":
      return a.legs
        ? { label: t.stats.totalTime, value: formatDuration(a.totalTime ?? a.elapsedTime), unit: "" }
        : { label: t.stats.time, value: formatDuration(a.movingTime), unit: "" };
    case "pace": {
      const p = formatPaceOrSpeed(a, t);
      return { label: p.label, value: p.value, unit: p.unit };
    }
    case "elevation":
      return { label: t.stats.elevation, ...formatElevation(a, t) };
    case "power":
      return { label: t.stats.power, value: String(Math.round(a.averageWatts ?? 0)), unit: "W" };
    case "cadence":
      return { label: t.stats.cadence, ...formatCadence(a, t) };
    case "heartrate":
      return { label: t.stats.heartrate, ...formatHeartrate(a, t) };
    case "calories":
      return { label: t.stats.calories, ...formatCalories(a, t) };
  }
}

/** Whether an activity carries the data a stat needs (sensor-based stats are not always there). */
export function hasStat(a: CardActivity, key: StatKey): boolean {
  if (key === "power") return a.averageWatts != null && a.averageWatts > 0;
  if (key === "cadence") return a.averageCadence != null && a.averageCadence > 0;
  if (key === "heartrate") return a.averageHeartrate != null && a.averageHeartrate > 0;
  if (key === "calories") return a.calories != null && a.calories > 0;
  return true;
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
 * `opts.routeBox` / `opts.mapRouteBox` is null), so the editor can start a drag from it.
 */
export function renderCard(
  canvas: HTMLCanvasElement,
  a: CardActivity,
  cardOpts: CardOptions,
  hooks: RenderHooks = {},
): RenderResult {
  // The slide's own colors win over the card-wide ones
  const opts = withSlideColors(cardOpts, cardOpts.background === "slides" ? activeSlide(cardOpts) : null);
  const { w, h } = SIZES[opts.format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  // A map needs a trace to follow: the activity's, or any leg's for a multisport event
  const hasTrace = !!a.polyline || !!a.legs?.some((l) => l.polyline);
  // What is actually behind the card: the active slide's kind, or video / transparent
  const slide = opts.background === "slides" ? activeSlide(opts) : null;
  const kind: SlideKind | "video" | "transparent" =
    opts.background === "slides" ? (slide?.kind ?? "night") : opts.background;
  const mapStyle = slide?.mapStyle ?? "bright";
  const isMap = kind === "map" && hasTrace;
  const tint = slide && (kind === "topo" || kind === "night") ? slide.tint[kind] : null;
  const bg = isMap
    ? { fill: MAP_TEXT[mapStyle].fill, text: MAP_TEXT[mapStyle].text }
    : tint
      ? { fill: tint, text: contrastText(tint) }
      : BACKGROUNDS[kind];
  const P = 96;
  // Automatic layout margins: the base padding, pushed inwards by the safe insets
  const PT = Math.max(P, Math.round(opts.safeInsets.top * h));
  const PB = Math.max(P, Math.round(opts.safeInsets.bottom * h));
  const PL = Math.max(P, Math.round(opts.safeInsets.left * w));
  const PR = Math.max(P, Math.round(opts.safeInsets.right * w));

  const photo = kind === "photo" ? (slide?.photo ?? null) : null;
  const hasPhoto = !!photo;
  const hasVideo = kind === "video" && !!opts.video;

  ctx.clearRect(0, 0, w, h);
  // The background is drawn later (see "Fond"): a map needs the route's projection,
  // which depends on the layout measured below.

  // On a transparent, photo or dark map background, a soft shadow keeps the text readable
  const needsShadow = kind === "transparent" || hasPhoto || hasVideo || (isMap && mapStyle === "dark");
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

  // Each element is prepared as a closure so it can be drawn in the fixed stacking order,
  // after the automatic layout has been measured in the natural reading order.
  const layers = new Map<LayerKey, () => void>();

  // --- Title ---
  // `top` is where the automatic layout ends: it drives the route's automatic box even
  // when the title blocks are moved elsewhere.
  // With a top safe inset, a credits line placed at the top sits inside the visible area (see
  // "Credits" below) instead of in the margin: the content starts under it, never behind it.
  const creditsOnTop = opts.brandCorner === "tl" || opts.brandCorner === "tr";
  // Without an inset the line lives in the margin; the content only steps down a little so the
  // Strava logo keeps clear space around it.
  const headerH = !creditsOnTop ? 0 : opts.safeInsets.top > 0 ? 52 + 20 : 28;
  let top = PT + headerH;
  if (opts.showMeta) {
    const metaStyle = styleOf("meta");
    const k = sizeOf(metaStyle);
    const metaFont = `${weightOf(metaStyle, 500)} ${32 * k}px ${familyOf(metaStyle, BODY)}`;
    const metaText = metaLabel(
      opts.metaParts,
      sportLabel(a.sportType, opts.t),
      formatDate(a.startDate, opts.t),
    );
    const mx = metaStyle.pos ? metaStyle.pos.x * w : PL;
    const my = metaStyle.pos ? metaStyle.pos.y * h : top;
    layers.set("meta", () =>
      withShadow(() => {
        ctx.font = metaFont;
        ctx.fillStyle = metaStyle.color ?? bg.text;
        ctx.globalAlpha = metaStyle.color ? 1 : 0.8;
        ctx.fillText(metaText, mx, my + 32 * k);
        texts.meta = toBox(mx, my, ctx.measureText(metaText).width, 40 * k);
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
    const lines = wrapLines(ctx, opts.titleText?.trim() || a.name, w - PL - PR, 2);
    // The anchor (tx, ty) is the top-left of the block's box, so a drag that reads the
    // box back as the new position leaves the text exactly where it is.
    const tx = titleStyle.pos ? titleStyle.pos.x * w : PL;
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
  // A multisport event only shows its total time; distance, pace and elevation make no sense
  const stats: StatKey[] = (a.legs ? opts.stats.filter((k) => k === "time") : opts.stats).filter((k) =>
    hasStat(a, k),
  );
  const footerH = 40;
  const statsH = stats.length ? 150 : 0;
  // Compact per-leg lines sit above the stats row
  const legs = a.legs && opts.showLegs ? a.legs : [];
  const legStyle = styleOf("legs");
  const legK = sizeOf(legStyle);
  const legLineH = 38 * legK;
  const legsH = legs.length ? legs.length * legLineH + 24 : 0;
  const bottom = h - PB - footerH - (statsH ? statsH + 32 : 0) - legsH;

  if (legs.length) {
    const lx = legStyle.pos ? legStyle.pos.x * w : PL;
    const ly = legStyle.pos ? legStyle.pos.y * h : bottom + 24;
    const font = `${weightOf(legStyle, 500)} ${28 * legK}px ${familyOf(legStyle, BODY)}`;
    const lines = legs.map((leg) => {
      const d = formatDistance(leg, opts.t);
      return `${sportLabel(leg.sportType, opts.t)}  ·  ${d.value} ${d.unit}  ·  ${formatDuration(leg.movingTime)}`;
    });
    layers.set("legs", () =>
      withShadow(() => {
        ctx.font = font;
        ctx.fillStyle = legStyle.color ?? bg.text;
        ctx.globalAlpha = legStyle.color ? 1 : 0.85;
        let widest = 0;
        lines.forEach((line, i) => {
          ctx.fillText(line, lx, ly + legLineH * (i + 1) - 8 * legK);
          widest = Math.max(widest, ctx.measureText(line).width);
        });
        ctx.globalAlpha = 1;
        texts.legs = toBox(lx, ly, widest, legLineH * lines.length);
      }),
    );
  }

  if (stats.length) {
    const colW = (w - PL - PR) / stats.length;
    const valueSize = stats.length >= 4 ? 76 : 96;
    stats.forEach((key, i) => {
      const style = styleOf(`stat:${key}`);
      const k = sizeOf(style);
      const s = statFor(a, key, opts.t);
      const x = style.pos ? style.pos.x * w : PL + i * colW;
      const baseY = style.pos ? style.pos.y * h : bottom + legsH + 32;
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
  const autoBox: RouteBox = { x: PL / w, y: top / h, w: (w - PL - PR) / w, h: (bottom - top - 24) / h };
  const routeBox = (kind === "map" ? opts.mapRouteBox : opts.routeBox) ?? autoBox;
  const result: RenderResult = {
    complete: true,
    routeBox,
    texts,
    brandBox: { x: 0, y: 0, w: 0, h: 0 },
    creditBox: { x: 0, y: 0, w: 0, h: 0 },
    brandInset: { x: 0, y: 0 },
  };

  // The route is fitted even when hidden: a map background follows its box.
  // A multisport event draws every leg that has a GPS trace, in its own color, on a shared
  // projection; a single activity is the one-leg case.
  let transform: import("./polyline").MercatorTransform | null = null;
  const legSources: { leg: Activity; index: number }[] = a.legs
    ? a.legs.map((leg, index) => ({ leg, index })).filter(({ leg }) => !!leg.polyline)
    : a.polyline
      ? [{ leg: a, index: 0 }]
      : [];
  if (legSources.length) {
    const lineWidth = Math.round(Math.min(w, h) * 0.012);
    // The reported box hugs the drawn route (points + end dots). Fitting happens inside
    // the box minus that padding, so reading the box back as `routeBox` redraws the route
    // exactly where it is.
    const pad = lineWidth * 1.3;
    // Privacy trim applies to the very start and the very end of the whole event
    const decoded = legSources.map(({ leg }, i) =>
      trimRoute(
        decodePolyline(leg.polyline as string),
        i === 0 ? opts.routeTrim : 0,
        i === legSources.length - 1 ? opts.routeTrim : 0,
      ),
    );
    const fit = fitToBoxWithTransform(decoded.flat(), {
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
      // Split the fitted points back per leg
      const paths: { path: Path2D; color: string; first: [number, number]; last: [number, number] }[] = [];
      let offset = 0;
      decoded.forEach((legPts, i) => {
        const slice = pts.slice(offset, offset + legPts.length);
        offset += legPts.length;
        if (slice.length < 2) return;
        const path = new Path2D();
        path.moveTo(slice[0][0], slice[0][1]);
        for (const [x, y] of slice.slice(1)) path.lineTo(x, y);
        const legIndex = legSources[i].index;
        const color = a.legs
          ? (opts.legColors[legIndex] ?? LEG_PALETTE[legIndex % LEG_PALETTE.length])
          : opts.routeColor;
        paths.push({ path, color, first: slice[0], last: slice[slice.length - 1] });
      });

      // A map background always shows the trace it follows, whatever the Elements tab says
      if ((opts.showRoute || isMap) && paths.length) {
        layers.set("route", () => {
          ctx.save();
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          if (needsShadow) {
            ctx.strokeStyle = "rgba(0,0,0,0.28)";
            ctx.lineWidth = lineWidth + 10;
            for (const { path } of paths) ctx.stroke(path);
          }
          ctx.lineWidth = lineWidth;
          for (const { path, color } of paths) {
            ctx.strokeStyle = color;
            ctx.stroke(path);
          }

          // Start: ring; finish: solid dot (of the first / last leg)
          const [sx, sy] = paths[0].first;
          const [ex, ey] = paths[paths.length - 1].last;
          ctx.beginPath();
          ctx.arc(ex, ey, lineWidth * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = paths[paths.length - 1].color;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx, sy, lineWidth * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = bg.fill ?? palette.white;
          ctx.fill();
          ctx.lineWidth = lineWidth * 0.6;
          ctx.strokeStyle = paths[0].color;
          ctx.stroke();
          ctx.restore();
        });
      }
    }
  }

  // --- Background ---
  if (hooks.layoutOnly) {
    // Nothing to paint: only the boxes matter
  } else if (hasPhoto || hasVideo) {
    // A video is not drawn here: the canvas stays transparent under the veil (see CardOptions.video)
    if (photo) drawCover(ctx, photo, w, h, slide?.crop);
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
    result.complete = drawMap(ctx, w, h, transform, mapStyle, hooks.onTileLoaded);
    // Soften the map so the route and texts stand out: a veil of the base color on top
    const veil = 1 - Math.min(1, Math.max(0, slide?.mapOpacity ?? 1));
    if (veil > 0) {
      ctx.save();
      ctx.globalAlpha = veil;
      ctx.fillStyle = bg.fill!;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  } else if (bg.fill) {
    ctx.fillStyle = bg.fill;
    ctx.fillRect(0, 0, w, h);
  }

  // Draw deepest first
  for (const key of DRAW_ORDER) {
    if (hooks.layoutOnly && key === "route") continue;
    layers.get(key)?.();
  }

  // --- Credits: always on top, never reordered nor hidden ---
  // "Powered by Strava" stands alone in its corner with clear space around it (Strava brand
  // guidelines). Our own credit and the map attribution sit on the opposite side of the same
  // edge, stacked, so nothing reads as a co-branding with Strava.
  withShadow(() => {
    ctx.fillStyle = bg.text;
    ctx.globalAlpha = 0.6;
    // Official logo, 36 px high on a 1080 px card (Strava requires ≥ 30 px at 1×)
    const logoH = 36;
    const logoW = logoH * BRAND_RATIO;
    // Corner placement, unless the logo was dragged somewhere; the credits then take the
    // opposite side of whichever half the logo sits in
    const cornerRight = opts.brandCorner === "tr" || opts.brandCorner === "br";
    const cornerTop = opts.brandCorner === "tl" || opts.brandCorner === "tr";
    // Credits stay in the corner opposite to `brandCorner` even when the logo was dragged
    // elsewhere, so the two never collide
    const right = cornerRight;
    const topSide = cornerTop;
    // Credits baseline. With the normal padding the line sits just outside the margin (a
    // visual choice); with safe insets it must stay entirely on the visible side of the limit.
    const by = topSide
      ? opts.safeInsets.top > 0
        ? PT + logoH + 4
        : PT - 16
      : opts.safeInsets.bottom > 0
        ? h - PB - 14
        : h - PB + 10;
    const logoTop = opts.brandPos ? opts.brandPos.y * h : by - logoH + 6;
    const bx = opts.brandPos ? opts.brandPos.x * w : cornerRight ? w - PR - logoW : PL;
    const logo = getBrandLogo(brandFile(opts.brandColor, bg.text), hooks.onTileLoaded);
    if (logo) {
      ctx.globalAlpha = 1;
      ctx.drawImage(logo, bx, logoTop, logoW, logoH);
      ctx.globalAlpha = 0.6;
    } else {
      // Logo not loaded yet: plain text placeholder at the same spot
      ctx.font = `500 24px ${BODY}`;
      ctx.fillText("Powered by Strava", bx, logoTop + logoH - 6);
      result.complete = false;
    }
    // Generous hit box with clear space around the logo
    result.brandBox = toBox(bx - 12, logoTop - 12, logoW + 24, logoH + 24);
    result.brandInset = { x: 12 / w, y: 12 / h };

    // Opposite side: our credit (same size as the logo's wordmark), then the map attribution
    // stacked above/below it when the map is shown
    // Site credit: "CREATED ON " regular + "OFOLAM.COM" bold and a little larger, full
    // opacity so it reads clearly black or white in "auto" mode
    // Contrast comes from three differences at once: family (sans vs condensed display),
    // weight (regular vs bold) and size
    const prefixFont = `400 26px ${BODY}`;
    const nameFont = `700 40px ${DISPLAY}`;
    ctx.font = prefixFont;
    const prefix = `${opts.t.card.madeWith} `;
    const prefixW = ctx.measureText(prefix).width;
    ctx.font = nameFont;
    const nameW = ctx.measureText(SITE_CREDIT_NAME).width;
    const creditW = prefixW + nameW;
    // The credit's box top-left is its anchor, so a drag reads it back exactly
    const creditTop = opts.creditPos ? opts.creditPos.y * h : by - 40;
    const creditX = opts.creditPos ? opts.creditPos.x * w : right ? PL : w - PR - creditW;
    const creditBase = creditTop + 40;
    ctx.fillStyle = opts.creditColor ?? bg.text;
    ctx.font = prefixFont;
    ctx.globalAlpha = 0.75;
    ctx.fillText(prefix, creditX, creditBase);
    ctx.font = nameFont;
    ctx.globalAlpha = 1;
    ctx.fillText(SITE_CREDIT_NAME, creditX + prefixW, creditBase);
    result.creditBox = toBox(creditX, creditTop, creditW, 52);

    if (isMap) {
      // Map attribution stacked away from the edge, same color, softer
      ctx.font = `400 20px ${BODY}`;
      const aw = ctx.measureText(MAP_ATTRIBUTION).width;
      ctx.globalAlpha = opts.creditColor ? 0.85 : 0.6;
      ctx.fillText(MAP_ATTRIBUTION, right ? PL : w - PR - aw, topSide ? by + 30 : by - 34);
    }
    ctx.globalAlpha = 1;
  });

  return result;
}
