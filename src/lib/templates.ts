import { palette } from "./colors";
import type { CardOptions, TextKey, TextStyle } from "./render";

/**
 * A template is a reusable layout for the card: which elements show, where they sit, how they
 * are styled. It deliberately leaves out the context the user picks separately: the format and
 * the background (color, tint, photo, map, video), plus what belongs to one activity (the photo
 * crop, the custom title, the safe-zone margins). Positions are fractions of the card, so they
 * carry over between activities and formats.
 */
export type TemplateOptions = Partial<
  Pick<
    CardOptions,
    | "routeColor"
    | "routeBox"
    | "stats"
    | "showName"
    | "showMeta"
    | "showRoute"
    | "routeTrim"
    | "legColors"
    | "showLegs"
    | "order"
    | "brandCorner"
    | "brandPos"
    | "brandColor"
    | "creditColor"
    | "creditPos"
    | "texts"
  >
>;

export type Template = {
  id: string;
  /** Translation key for built-in templates, free text for personal ones. */
  name: string;
  /** Translation key of the variation (color, size, font) for the extra built-in templates. */
  variant?: string;
  builtIn: boolean;
  options: TemplateOptions;
};

const STORED_KEYS: (keyof TemplateOptions)[] = [
  "routeColor",
  "routeBox",
  "stats",
  "showName",
  "showMeta",
  "showRoute",
  "routeTrim",
  "legColors",
  "showLegs",
  "order",
  "brandCorner",
  "brandPos",
  "brandColor",
  "creditColor",
  "creditPos",
  "texts",
];

/** The storable part of the current options. */
export function extractTemplate(o: CardOptions): TemplateOptions {
  const out: TemplateOptions = {};
  for (const k of STORED_KEYS) (out as Record<string, unknown>)[k] = o[k];
  return out;
}

/** Applies a template on top of the current options, keeping what belongs to the activity. */
export function applyTemplate(o: CardOptions, tpl: TemplateOptions): CardOptions {
  const next: CardOptions = { ...o };
  // Every stored key is reset to the template's value, or to a neutral default when absent,
  // so that a template fully describes the look (a missing position means "automatic")
  const defaults: TemplateOptions = {
    routeBox: null,
    brandPos: null,
    creditPos: null,
    texts: {},
    legColors: [],
    order: [],
  };
  for (const k of STORED_KEYS) {
    const v = k in tpl ? tpl[k] : defaults[k];
    if (v !== undefined) (next as Record<string, unknown>)[k] = v;
  }
  return next;
}

/** Built-in templates, shipped with the app. Names are keys of `t.templates`. */
export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: "classic",
    name: "classic",
    builtIn: true,
    options: {
      stats: ["distance", "time", "pace"],
      showName: true,
      showMeta: true,
      showRoute: true,
      texts: {},
    },
  },
  {
    id: "stats-right",
    name: "statsRight",
    builtIn: true,
    options: {
      stats: ["distance", "time", "pace", "elevation"],
      showName: true,
      showMeta: true,
      showRoute: true,
      routeBox: { x: 0.06, y: 0.26, w: 0.56, h: 0.5 },
      texts: {
        "stat:distance": { font: null, color: null, bold: null, size: 0.85, pos: { x: 0.66, y: 0.3 } },
        "stat:time": { font: null, color: null, bold: null, size: 0.85, pos: { x: 0.66, y: 0.42 } },
        "stat:pace": { font: null, color: null, bold: null, size: 0.85, pos: { x: 0.66, y: 0.54 } },
        "stat:elevation": { font: null, color: null, bold: null, size: 0.85, pos: { x: 0.66, y: 0.66 } },
      },
    },
  },
  {
    id: "stats-left",
    name: "statsLeft",
    builtIn: true,
    options: {
      stats: ["distance", "time", "pace", "elevation"],
      showName: true,
      showMeta: true,
      showRoute: true,
      routeBox: { x: 0.38, y: 0.26, w: 0.56, h: 0.5 },
      texts: {
        "stat:distance": { font: null, color: null, bold: null, size: 0.85, pos: { x: 0.09, y: 0.3 } },
        "stat:time": { font: null, color: null, bold: null, size: 0.85, pos: { x: 0.09, y: 0.42 } },
        "stat:pace": { font: null, color: null, bold: null, size: 0.85, pos: { x: 0.09, y: 0.54 } },
        "stat:elevation": { font: null, color: null, bold: null, size: 0.85, pos: { x: 0.09, y: 0.66 } },
      },
    },
  },
  {
    id: "minimal",
    name: "minimal",
    builtIn: true,
    options: {
      stats: ["distance", "time"],
      showName: true,
      showMeta: false,
      showRoute: false,
      texts: {
        title: { font: "display", color: null, bold: null, size: 1.3, pos: null },
      },
    },
  },
  {
    id: "flipped",
    name: "flipped",
    builtIn: true,
    options: {
      stats: ["distance", "time", "pace"],
      showName: true,
      showMeta: true,
      showRoute: true,
      texts: {
        "stat:distance": { font: null, color: null, bold: null, size: null, pos: { x: 0.09, y: 0.12 } },
        "stat:time": { font: null, color: null, bold: null, size: null, pos: { x: 0.36, y: 0.12 } },
        "stat:pace": { font: null, color: null, bold: null, size: null, pos: { x: 0.63, y: 0.12 } },
        meta: { font: null, color: null, bold: null, size: null, pos: { x: 0.09, y: 0.76 } },
        title: { font: null, color: null, bold: null, size: null, pos: { x: 0.09, y: 0.8 } },
      },
    },
  },
];

const baseTemplate = (id: string) => {
  const tpl = BUILT_IN_TEMPLATES.find((t) => t.id === id);
  if (!tpl) throw new Error(`unknown base template ${id}`);
  return tpl;
};

const STAT_KEYS: TextKey[] = ["stat:distance", "stat:time", "stat:pace", "stat:elevation"];
const EMPTY: TextStyle = { font: null, color: null, bold: null, size: null, pos: null };
/** Two wide stats instead of three: big or monospaced values need the room. */
const TWO_STATS: TemplateOptions = { stats: ["distance", "time"] };
const TWO_STATS_FLIPPED: TemplateOptions = {
  stats: ["distance", "time"],
  texts: { "stat:time": { ...EMPTY, pos: { x: 0.5, y: 0.12 } } },
};

/** The base template with a style patch merged into the given text blocks. */
function styled(
  base: Template,
  variant: string,
  keys: TextKey[],
  patch: Partial<TextStyle>,
  extra: TemplateOptions = {},
): Template {
  const texts: TemplateOptions["texts"] = { ...base.options.texts, ...extra.texts };
  for (const k of keys) {
    const cur = texts[k] ?? EMPTY;
    texts[k] = { ...cur, ...patch };
  }
  return {
    id: `${base.id}-${variant}`,
    name: base.name,
    variant,
    builtIn: true,
    options: { ...base.options, ...extra, texts },
  };
}

/** Route drawn in a palette color, picked up by the stats. */
const colored = (base: Template, variant: string, color: string) =>
  styled(base, variant, STAT_KEYS, { color }, { routeColor: color });

/**
 * Extra built-in templates: variations of the base layouts on color, text size and font.
 * Shown in the "More" dialog so the strip stays short.
 */
export const MORE_TEMPLATES: Template[] = [
  // Colors
  colored(baseTemplate("classic"), "sunrise", palette.sunrise),
  colored(baseTemplate("classic"), "trail", palette.trail),
  colored(baseTemplate("classic"), "raspberry", palette.raspberry),
  colored(baseTemplate("classic"), "glacier", palette.glacier),
  colored(baseTemplate("stats-right"), "sunrise", palette.sunrise),
  colored(baseTemplate("stats-right"), "trail", palette.trail),
  colored(baseTemplate("stats-right"), "raspberry", palette.raspberry),
  colored(baseTemplate("stats-left"), "glacier", palette.glacier),
  colored(baseTemplate("flipped"), "sunrise", palette.sunrise),
  // Sizes
  styled(baseTemplate("classic"), "bigStats", STAT_KEYS, { size: 1.3 }, TWO_STATS),
  styled(baseTemplate("classic"), "bigTitle", ["title"], { size: 1.4 }),
  styled(baseTemplate("classic"), "small", [...STAT_KEYS, "title", "meta"], { size: 0.8 }),
  styled(baseTemplate("stats-right"), "bigStats", STAT_KEYS, { size: 1.1 }),
  styled(baseTemplate("flipped"), "bigStats", STAT_KEYS, { size: 1.3 }, TWO_STATS_FLIPPED),
  styled(baseTemplate("minimal"), "bigTitle", ["title"], { size: 1.8 }),
  // Fonts
  styled(baseTemplate("classic"), "serif", ["title", "meta"], { font: "serif" }),
  styled(baseTemplate("classic"), "mono", STAT_KEYS, { font: "mono" }, TWO_STATS),
  styled(baseTemplate("classic"), "display", [...STAT_KEYS, "meta"], { font: "display" }),
  styled(baseTemplate("stats-left"), "serif", ["title", "meta"], { font: "serif" }),
  styled(baseTemplate("flipped"), "mono", STAT_KEYS, { font: "mono" }, TWO_STATS_FLIPPED),
  styled(baseTemplate("minimal"), "serif", ["title"], { font: "serif" }),
];

export const TEMPLATE_NAME_MAX = 40;
export const PERSONAL_TEMPLATES_MAX = 20;
