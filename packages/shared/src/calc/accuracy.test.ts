import { describe, expect, it } from "vitest";
import { calculateAccuracy } from "./accuracy";

describe("calculateAccuracy", () => {
  it("returns 100% accuracy when actual equals predicted", () => {
    const result = calculateAccuracy(2700, 2700);
    expect(result.accuracyPercentage).toBeCloseTo(100, 5);
    expect(result.differenceSeconds).toBe(0);
    expect(result.biasPercentage).toBeCloseTo(0, 5);
  });

  it("matches spec example: predicted 60min, actual 72min -> 80% accuracy", () => {
    const result = calculateAccuracy(60 * 60, 72 * 60);
    expect(result.differenceSeconds).toBe(12 * 60);
    expect(result.accuracyPercentage).toBeCloseTo(80, 5);
  });

  it("matches spec section 6 example: predicted 45min, actual 52m18s", () => {
    const predicted = 45 * 60;
    const actual = 52 * 60 + 18;
    const result = calculateAccuracy(predicted, actual);
    expect(result.differenceSeconds).toBe(actual - predicted);
    // Per the section 7 formula: 1 - (438/2700) = 83.78%.
    // (Section 6's illustrative "86%" is prose, not derived from the formula.)
    expect(result.accuracyPercentage).toBeCloseTo(83.78, 1);
  });

  it("clamps accuracy at 0 when difference exceeds predicted duration", () => {
    const result = calculateAccuracy(600, 3000);
    expect(result.accuracy).toBe(0);
    expect(result.accuracyPercentage).toBe(0);
  });

  it("reports positive bias when actual exceeds predicted (underestimation)", () => {
    const result = calculateAccuracy(1000, 1200);
    expect(result.biasPercentage).toBeCloseTo(20, 5);
  });

  it("reports negative bias when actual is less than predicted (overestimation)", () => {
    const result = calculateAccuracy(1000, 800);
    expect(result.biasPercentage).toBeCloseTo(-20, 5);
  });

  it("throws when predictedSeconds is zero or negative", () => {
    expect(() => calculateAccuracy(0, 100)).toThrow(RangeError);
    expect(() => calculateAccuracy(-10, 100)).toThrow(RangeError);
  });

  it("throws when actualSeconds is negative", () => {
    expect(() => calculateAccuracy(100, -1)).toThrow(RangeError);
  });
});
