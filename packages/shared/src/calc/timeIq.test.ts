import { describe, expect, it } from "vitest";
import { calculateTimeIq, tierForScore } from "./timeIq";
import { TimeIqTier } from "../types";

describe("calculateTimeIq", () => {
  it("returns 0 / Wild Guesser for no bet history", () => {
    const result = calculateTimeIq([]);
    expect(result.score).toBe(0);
    expect(result.tier).toBe(TimeIqTier.WILD_GUESSER);
  });

  it("returns 1000 / Time Oracle for perfect accuracy history", () => {
    const result = calculateTimeIq([1, 1, 1, 1, 1]);
    expect(result.score).toBe(1000);
    expect(result.tier).toBe(TimeIqTier.TIME_ORACLE);
  });

  it("returns 0 / Wild Guesser for consistently zero accuracy", () => {
    const result = calculateTimeIq([0, 0, 0]);
    expect(result.score).toBe(0);
    expect(result.tier).toBe(TimeIqTier.WILD_GUESSER);
  });

  it("weights recent accuracy more heavily than older accuracy", () => {
    // oldest -> newest: starts bad, ends great
    const improving = calculateTimeIq([0.2, 0.2, 0.2, 0.9, 0.9, 0.9]);
    // oldest -> newest: starts great, ends bad
    const declining = calculateTimeIq([0.9, 0.9, 0.9, 0.2, 0.2, 0.2]);
    expect(improving.score).toBeGreaterThan(declining.score);
  });

  it("clamps score within 0-1000 regardless of input noise", () => {
    const result = calculateTimeIq([1, 1, 1]);
    expect(result.score).toBeLessThanOrEqual(1000);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it.each([
    [0, TimeIqTier.WILD_GUESSER],
    [399, TimeIqTier.WILD_GUESSER],
    [400, TimeIqTier.GETTING_BETTER],
    [599, TimeIqTier.GETTING_BETTER],
    [600, TimeIqTier.TIME_TRACKER],
    [749, TimeIqTier.TIME_TRACKER],
    [750, TimeIqTier.TIME_MASTER],
    [849, TimeIqTier.TIME_MASTER],
    [850, TimeIqTier.PREDICTION_EXPERT],
    [949, TimeIqTier.PREDICTION_EXPERT],
    [950, TimeIqTier.TIME_ORACLE],
    [1000, TimeIqTier.TIME_ORACLE],
  ])("maps score %i to tier %s", (score, expectedTier) => {
    expect(tierForScore(score)).toBe(expectedTier);
  });
});
