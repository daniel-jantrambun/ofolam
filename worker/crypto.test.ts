import { describe, expect, it } from "vitest";
import { athleteKey } from "./crypto";

// 32 random bytes, base64 (test-only)
const KEY = "q0mQ0zY0d3h5bW9ja2tleWZvcnRlc3RzMTIzNDU2Nzg=";

describe("athleteKey", () => {
  it("is deterministic, so a returning athlete finds their row", async () => {
    expect(await athleteKey("strava", 12345, KEY)).toBe(await athleteKey("strava", 12345, KEY));
  });

  it("differs per athlete and per provider", async () => {
    const a = await athleteKey("strava", 12345, KEY);
    expect(await athleteKey("strava", 12346, KEY)).not.toBe(a);
    expect(await athleteKey("garmin", 12345, KEY)).not.toBe(a);
  });

  it("never contains the provider id, and is base64url without padding", async () => {
    const key = await athleteKey("strava", 12345, KEY);
    expect(key).not.toContain("12345");
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
