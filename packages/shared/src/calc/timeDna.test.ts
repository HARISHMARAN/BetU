import { describe, expect, it } from "vitest";
import { computeTimeDnaEntry } from "./timeDna";

describe("computeTimeDnaEntry", () => {
  it("matches spec example: Coding category bias +47.9%, accuracy 68%", () => {
    // Constructed so avg predicted = 48min, avg actual = 71min (spec section 10 example)
    const bets = [
      { predictedSeconds: 48 * 60, actualSeconds: 71 * 60 },
      { predictedSeconds: 48 * 60, actualSeconds: 71 * 60 },
    ];
    const entry = computeTimeDnaEntry("cat-coding", "Coding", bets);

    expect(entry.betsCompleted).toBe(2);
    expect(entry.averagePredictedSeconds).toBe(48 * 60);
    expect(entry.averageActualSeconds).toBe(71 * 60);
    expect(entry.biasPercentage).toBeCloseTo(47.9, 1);
  });

  it("returns zeroed entry with 0 bets for empty history", () => {
    const entry = computeTimeDnaEntry("cat-x", "Other", []);
    expect(entry.betsCompleted).toBe(0);
    expect(entry.averagePredictedSeconds).toBe(0);
    expect(entry.averageActualSeconds).toBe(0);
    expect(entry.predictionAccuracy).toBe(0);
    expect(entry.biasPercentage).toBe(0);
  });

  it("computes underestimation and overestimation averages separately", () => {
    const bets = [
      { predictedSeconds: 1000, actualSeconds: 1200 }, // underestimated by 20%
      { predictedSeconds: 1000, actualSeconds: 800 }, // overestimated by 20%
    ];
    const entry = computeTimeDnaEntry("cat-mixed", "Mixed", bets);
    expect(entry.averageUnderestimationPercentage).toBeCloseTo(20, 5);
    expect(entry.averageOverestimationPercentage).toBeCloseTo(20, 5);
  });

  it("computes median error correctly for even and odd counts", () => {
    const bets = [
      { predictedSeconds: 1000, actualSeconds: 1000 }, // error 0
      { predictedSeconds: 1000, actualSeconds: 1100 }, // error 100
      { predictedSeconds: 1000, actualSeconds: 1300 }, // error 300
    ];
    const entry = computeTimeDnaEntry("cat-median", "Median", bets);
    expect(entry.medianErrorSeconds).toBe(100);
  });

  it("computes predicted/actual ratio", () => {
    const bets = [{ predictedSeconds: 60 * 60, actualSeconds: 84 * 60 }];
    const entry = computeTimeDnaEntry("cat-ratio", "Ratio", bets);
    expect(entry.predictedToActualRatio).toBeCloseTo(60 / 84, 5);
  });

  it("ignores bets with zero or negative predictedSeconds", () => {
    const bets = [
      { predictedSeconds: 0, actualSeconds: 500 },
      { predictedSeconds: 1000, actualSeconds: 1000 },
    ];
    const entry = computeTimeDnaEntry("cat-guard", "Guard", bets);
    expect(entry.betsCompleted).toBe(1);
  });
});
