import { describe, expect, it } from "vitest";
import {
  activeSlide,
  type CardActivity,
  type CardOptions,
  colorsToAllSlides,
  DEFAULT_TEXT_STYLE,
  hasStat,
  metaLabel,
  newSlide,
  setColors,
  withSlideColors,
} from "./render";

describe("metaLabel", () => {
  it("shows sport and date by default", () => {
    expect(metaLabel("all", "Run", "5 Oct 2026")).toBe("Run, 5 Oct 2026");
  });

  it("shows only the sport", () => {
    expect(metaLabel("sport", "Run", "5 Oct 2026")).toBe("Run");
  });

  it("shows only the date", () => {
    expect(metaLabel("date", "Run", "5 Oct 2026")).toBe("5 Oct 2026");
  });
});

describe("per-slide colors", () => {
  const base = (): CardOptions =>
    ({
      background: "slides",
      slides: [newSlide("night"), newSlide("topo")],
      slideIndex: 0,
      routeColor: "#111111",
      legColors: [],
      creditColor: null,
      brandColor: "auto",
      texts: {},
    }) as unknown as CardOptions;

  it("writes colors on the shown slide only", () => {
    const o = setColors(base(), { route: "#ff0000", texts: { title: "#00ff00" } });
    expect(o.slides[0].colors).toEqual({ route: "#ff0000", texts: { title: "#00ff00" } });
    expect(o.slides[1].colors).toEqual({});
    expect(o.routeColor).toBe("#111111");
  });

  it("lays the slide colors over the card-wide ones", () => {
    const o = setColors(base(), { route: "#ff0000", credit: "#abcdef", texts: { title: "#00ff00" } });
    const first = withSlideColors(o, activeSlide(o));
    expect(first.routeColor).toBe("#ff0000");
    expect(first.creditColor).toBe("#abcdef");
    expect(first.texts.title?.color).toBe("#00ff00");
    // Another slide keeps the card-wide colors
    const second = withSlideColors(o, o.slides[1]);
    expect(second.routeColor).toBe("#111111");
    expect(second.texts.title).toBeUndefined();
  });

  it("keeps an explicit automatic color distinct from no override", () => {
    const o = setColors(
      { ...base(), creditColor: "#123456", texts: { title: { ...DEFAULT_TEXT_STYLE, color: "#654321" } } },
      { credit: null, texts: { title: null } },
    );
    const shown = withSlideColors(o, activeSlide(o));
    expect(shown.creditColor).toBeNull();
    expect(shown.texts.title?.color).toBeNull();
  });

  it("edits the card-wide colors when there is no slide", () => {
    const o = setColors(
      { ...base(), background: "transparent" },
      { route: "#ff0000", texts: { meta: "#fff" } },
    );
    expect(o.routeColor).toBe("#ff0000");
    expect(o.texts.meta?.color).toBe("#fff");
    expect(o.slides[0].colors).toEqual({});
  });

  it("copies the shown slide's colors to every slide", () => {
    const o = colorsToAllSlides(setColors(base(), { route: "#ff0000", texts: { title: "#00ff00" } }));
    expect(o.slides[1].colors).toEqual(o.slides[0].colors);
    expect(o.slides[1].colors.texts).not.toBe(o.slides[0].colors.texts);
    expect(o.slides[1].colors.route).toBe("#ff0000");
  });
});

describe("hasStat", () => {
  const a = (over: Partial<CardActivity>): CardActivity =>
    ({ sportType: "Run", averageHeartrate: null, calories: null, ...over }) as CardActivity;

  it("hides heart rate and calories when the activity lacks them", () => {
    expect(hasStat(a({}), "heartrate")).toBe(false);
    expect(hasStat(a({}), "calories")).toBe(false);
    expect(hasStat(a({ calories: 0 }), "calories")).toBe(false);
  });

  it("offers them when present", () => {
    expect(hasStat(a({ averageHeartrate: 150 }), "heartrate")).toBe(true);
    expect(hasStat(a({ calories: 420 }), "calories")).toBe(true);
  });
});
