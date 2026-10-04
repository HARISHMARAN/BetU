import { TimeIqTier, type TimeIqResult } from "../types";

/** Recent accuracy scores influence Time IQ more than old ones (spec section 8). */
const RECENCY_DECAY = 0.9;

export function tierForScore(score: number): TimeIqTier {
  if (score >= 950) return TimeIqTier.TIME_ORACLE;
  if (score >= 850) return TimeIqTier.PREDICTION_EXPERT;
  if (score >= 750) return TimeIqTier.TIME_MASTER;
  if (score >= 600) return TimeIqTier.TIME_TRACKER;
  if (score >= 400) return TimeIqTier.GETTING_BETTER;
  return TimeIqTier.WILD_GUESSER;
}

/**
 * Weighted rolling average of prediction accuracy, scaled to 0-1000.
 * accuracyHistory must be ordered oldest -> newest.
 */
export function calculateTimeIq(accuracyHistory: readonly number[]): TimeIqResult {
  if (accuracyHistory.length === 0) {
    return { score: 0, tier: TimeIqTier.WILD_GUESSER };
  }

  const n = accuracyHistory.length;
  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < n; i += 1) {
    const recencyRank = n - 1 - i; // 0 = most recent
    const weight = RECENCY_DECAY ** recencyRank;
    weightedSum += weight * accuracyHistory[i];
    weightTotal += weight;
  }

  const weightedAverage = weightedSum / weightTotal;
  const score = Math.round(Math.min(1000, Math.max(0, weightedAverage * 1000)));

  return { score, tier: tierForScore(score) };
}
