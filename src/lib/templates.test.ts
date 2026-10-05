import { describe, expect, it } from "vitest";
import type { CardOptions } from "./render";
import { applyTemplate, extractTemplate } from "./templates";

const base = { routeBox: null, mapRouteBox: null } as CardOptions;

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
