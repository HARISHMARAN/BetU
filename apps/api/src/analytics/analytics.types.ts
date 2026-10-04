import type { TimeIqTier } from "@betu/shared";

export interface DashboardWeekSummary {
  betsCompleted: number;
  secondsTracked: number;
  predictionAccuracyPercentage: number;
}

export interface DashboardResponse {
  timeIq: { score: number; tier: TimeIqTier };
  thisWeek: DashboardWeekSummary;
}
