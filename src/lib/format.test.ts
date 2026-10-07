import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import type { Activity } from "./api";
import { formatCadence, formatCalories, formatHeartrate } from "./format";

const activity = (over: Partial<Activity>): Activity => ({
  id: 1,
  name: "Test",
  sportType: "Ride",
  startDate: "2026-10-05T08:00:00Z",
  distance: 10000,
  movingTime: 3600,
  elapsedTime: 3600,
  elevation: 0,
  averageSpeed: 3,
  polyline: null,
  ...over,
});

describe("formatCadence", () => {
  it("keeps rides in rpm", () => {
    expect(formatCadence(activity({ sportType: "Ride", averageCadence: 86.4 }), en)).toEqual({
      value: "86",
      unit: "rpm",
    });
  });

  it("doubles run cadence, sent by Strava for one leg", () => {
    expect(formatCadence(activity({ sportType: "Run", averageCadence: 80.4 }), en)).toEqual({
      value: "161",
      unit: "spm",
    });
    expect(formatCadence(activity({ sportType: "Hike", averageCadence: 50 }), fr).unit).toBe("pas/min");
  });

  it("shows swims in strokes per minute", () => {
    expect(formatCadence(activity({ sportType: "Swim", averageCadence: 30.4 }), fr)).toEqual({
      value: "30",
      unit: "mvts/min",
    });
  });
});

describe("formatHeartrate", () => {
  it("rounds to whole beats per minute", () => {
    expect(formatHeartrate(activity({ averageHeartrate: 142.6 }), en)).toEqual({ value: "143", unit: "bpm" });
  });
});

describe("formatCalories", () => {
  it("formats kilocalories with the locale's grouping", () => {
    expect(formatCalories(activity({ calories: 1347 }), en)).toEqual({ value: "1,347", unit: "kcal" });
  });
});
