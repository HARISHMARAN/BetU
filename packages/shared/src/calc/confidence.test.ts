import { describe, expect, it } from "vitest";
import { confidenceForSampleSize } from "./confidence";
import { Confidence } from "../types";

describe("confidenceForSampleSize", () => {
  it.each([
    [0, Confidence.LOW],
    [1, Confidence.LOW],
    [4, Confidence.LOW],
    [5, Confidence.MEDIUM],
    [14, Confidence.MEDIUM],
    [15, Confidence.HIGH],
    [100, Confidence.HIGH],
  ])("maps sample size %i to confidence %s", (sampleSize, expected) => {
    expect(confidenceForSampleSize(sampleSize)).toBe(expected);
  });
});
