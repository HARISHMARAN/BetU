import type { BetStatus, Confidence, TimeDnaEntry, TimeIqTier } from "@betu/shared";

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface Bet {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  predictedSeconds: number;
  actualSeconds: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  pausedAt: string | null;
  pausedSeconds: number;
  status: BetStatus;
  accuracyScore: number | null;
  estimationErrorSeconds: number | null;
  estimationErrorPercentage: number | null;
  betuPredictionSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BetWithFeedback extends Bet {
  feedback?: string;
}

export interface PublicUser {
  id: string;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
  authProvider: "GUEST" | "EMAIL" | "APPLE" | "GOOGLE";
  timeIqScore: number;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

export interface DashboardResponse {
  timeIq: { score: number; tier: TimeIqTier };
  thisWeek: {
    betsCompleted: number;
    secondsTracked: number;
    predictionAccuracyPercentage: number;
  };
}

export type { TimeDnaEntry, Confidence };
