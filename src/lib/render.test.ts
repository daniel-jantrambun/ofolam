import { describe, expect, it } from "vitest";
import { metaLabel } from "./render";

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
