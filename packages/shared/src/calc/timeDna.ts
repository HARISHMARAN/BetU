import type { TimeDnaEntry } from "../types";
import { calculateAccuracy } from "./accuracy";

export interface CompletedBetDuration {
  predictedSeconds: number;
  actualSeconds: number;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function emptyEntry(categoryId: string, categoryName: string): TimeDnaEntry {
  return {
    categoryId,
    categoryName,
    betsCompleted: 0,
    averagePredictedSeconds: 0,
    averageActualSeconds: 0,
    averageAbsoluteErrorSeconds: 0,
    medianErrorSeconds: 0,
    averageUnderestimationPercentage: 0,
    averageOverestimationPercentage: 0,
    predictionAccuracy: 0,
    predictedToActualRatio: 0,
    biasPercentage: 0,
  };
}

/**
 * Aggregates completed bet durations into the Time DNA stats block (spec section 10).
 * Bets with predictedSeconds <= 0 are malformed and excluded.
 */
export function computeTimeDnaEntry(
  categoryId: string,
  categoryName: string,
  bets: readonly CompletedBetDuration[],
): TimeDnaEntry {
  const valid = bets.filter((b) => b.predictedSeconds > 0 && b.actualSeconds >= 0);
  if (valid.length === 0) return emptyEntry(categoryId, categoryName);

  const accuracies = valid.map((b) => calculateAccuracy(b.predictedSeconds, b.actualSeconds));

  const avgPredicted = average(valid.map((b) => b.predictedSeconds));
  const avgActual = average(valid.map((b) => b.actualSeconds));
  const absoluteErrors = accuracies.map((a) => a.differenceSeconds);

  const underestimations = accuracies.filter((a) => a.biasPercentage > 0).map((a) => a.biasPercentage);
  const overestimations = accuracies.filter((a) => a.biasPercentage < 0).map((a) => Math.abs(a.biasPercentage));

  return {
    categoryId,
    categoryName,
    betsCompleted: valid.length,
    averagePredictedSeconds: avgPredicted,
    averageActualSeconds: avgActual,
    averageAbsoluteErrorSeconds: average(absoluteErrors),
    medianErrorSeconds: median(absoluteErrors),
    averageUnderestimationPercentage: average(underestimations),
    averageOverestimationPercentage: average(overestimations),
    predictionAccuracy: average(accuracies.map((a) => a.accuracy)) * 100,
    predictedToActualRatio: avgActual === 0 ? 0 : avgPredicted / avgActual,
    biasPercentage: avgPredicted === 0 ? 0 : ((avgActual - avgPredicted) / avgPredicted) * 100,
  };
}
