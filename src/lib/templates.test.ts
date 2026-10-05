import { describe, expect, it } from "vitest";
import { type CardOptions, newSlide, setColors } from "./render";
import { applyTemplate, extractTemplate } from "./templates";

const base = {
  routeBox: null,
  mapRouteBox: null,
  background: "slides",
  slides: [newSlide("night")],
  slideIndex: 0,
  routeColor: "#111111",
  texts: {},
} as unknown as CardOptions;

describe("template route framing", () => {
  it("stores the map framing apart from the shared one", () => {
    const box = { x: 0.1, y: 0.2, w: 0.5, h: 0.4 };
    const tpl = extractTemplate({ ...base, mapRouteBox: box });
    expect(tpl.mapRouteBox).toEqual(box);
    expect(tpl.routeBox).toBeNull();
  });

  it("resets the map framing when the template has none", () => {
    const box = { x: 0.1, y: 0.2, w: 0.5, h: 0.4 };
    const next = applyTemplate({ ...base, mapRouteBox: box }, {});
    expect(next.mapRouteBox).toBeNull();
  });
});

describe("template colors", () => {
  it("stores the colors of the slide being shown", () => {
    const tpl = extractTemplate(setColors(base, { route: "#ff0000" }));
    expect(tpl.routeColor).toBe("#ff0000");
  });

  it("drops the colors set on single slides", () => {
    const next = applyTemplate(setColors(base, { route: "#ff0000" }), { routeColor: "#00ff00" });
    expect(next.routeColor).toBe("#00ff00");
    expect(next.slides[0].colors).toEqual({});
  });
});
