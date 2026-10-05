import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Minimal stand-in for HTMLImageElement: tests trigger load/error by hand. */
class FakeImage {
  static instances: FakeImage[] = [];
  crossOrigin = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  constructor() {
    FakeImage.instances.push(this);
  }
}

type TilesModule = typeof import("./tiles");

async function loadModule(): Promise<TilesModule> {
  vi.resetModules(); // the tile cache is module-level state: start each test clean
  return import("./tiles");
}

describe("getTile", () => {
  beforeEach(() => {
    FakeImage.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("HTMLImageElement", FakeImage);
    vi.stubGlobal("window", { setTimeout: globalThis.setTimeout.bind(globalThis) });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts a single request and returns null until the tile arrives", async () => {
    const { getTile } = await loadModule();
    expect(getTile("light", 3, 1, 2)).toBeNull();
    expect(getTile("light", 3, 1, 2)).toBeNull();
    expect(FakeImage.instances).toHaveLength(1);
    expect(FakeImage.instances[0].crossOrigin).toBe("anonymous");
  });

  it("notifies every caller that asked for a tile in flight, not only the first one", async () => {
    const { getTile } = await loadModule();
    const first = vi.fn(); // e.g. a template thumbnail rendered without a callback would be undefined
    const second = vi.fn(); // the main canvas
    getTile("light", 3, 1, 2, undefined);
    getTile("light", 3, 1, 2, first);
    getTile("light", 3, 1, 2, second);

    FakeImage.instances[0].onload?.();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does not notify twice for the same arrival and serves the tile from cache afterwards", async () => {
    const { getTile } = await loadModule();
    const cb = vi.fn();
    getTile("light", 3, 1, 2, cb);
    getTile("light", 3, 1, 2, cb);
    const img = FakeImage.instances[0];
    img.onload?.();

    expect(cb).toHaveBeenCalledTimes(1);
    expect(getTile("light", 3, 1, 2)).toBe(img);
  });

  it("keeps tiles of different styles independent", async () => {
    const { getTile } = await loadModule();
    const light = vi.fn();
    const dark = vi.fn();
    getTile("light", 3, 1, 2, light);
    getTile("dark", 3, 1, 2, dark);
    expect(FakeImage.instances).toHaveLength(2);

    FakeImage.instances[1].onload?.();
    expect(dark).toHaveBeenCalledTimes(1);
    expect(light).not.toHaveBeenCalled();
  });

  it("retries a failed tile after the delay and notifies the waiting callers", async () => {
    const { getTile } = await loadModule();
    const cb = vi.fn();
    getTile("light", 3, 1, 2, cb);
    FakeImage.instances[0].onerror?.();
    expect(cb).not.toHaveBeenCalled();
    expect(getTile("light", 3, 1, 2)).toBeNull(); // still marked as failed, no new request
    expect(FakeImage.instances).toHaveLength(1);

    vi.advanceTimersByTime(4000);
    expect(cb).toHaveBeenCalledTimes(1);

    // The redraw triggered by the callback requests the tile again
    getTile("light", 3, 1, 2, cb);
    expect(FakeImage.instances).toHaveLength(2);
    FakeImage.instances[1].onload?.();
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
