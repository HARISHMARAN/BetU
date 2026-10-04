import type { AccuracyResult } from "../types";

/**
 * Core BetU scoring formula (spec section 7).
 * accuracy = max(0, 1 - (|actual - predicted| / predicted))
 */
export function calculateAccuracy(
  predictedSeconds: number,
  actualSeconds: number,
): AccuracyResult {
  if (predictedSeconds <= 0) {
    throw new RangeError("predictedSeconds must be greater than 0");
  }
  if (actualSeconds < 0) {
    throw new RangeError("actualSeconds must not be negative");
  }

  const differenceSeconds = Math.abs(actualSeconds - predictedSeconds);
  const accuracy = Math.max(0, 1 - differenceSeconds / predictedSeconds);
  const biasPercentage = ((actualSeconds - predictedSeconds) / predictedSeconds) * 100;

  return {
    differenceSeconds,
    accuracy,
    accuracyPercentage: accuracy * 100,
    biasPercentage,
  };
}
