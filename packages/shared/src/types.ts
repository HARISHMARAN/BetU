export enum BetStatus {
  CREATED = "created",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
  ABANDONED = "abandoned",
}

export enum Confidence {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum TimeIqTier {
  WILD_GUESSER = "Wild Guesser",
  GETTING_BETTER = "Getting Better",
  TIME_TRACKER = "Time Tracker",
  TIME_MASTER = "Time Master",
  PREDICTION_EXPERT = "Prediction Expert",
  TIME_ORACLE = "Time Oracle",
}

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
  pausedSeconds: number;
  pausedAt: string | null;
  status: BetStatus;
  accuracyScore: number | null;
  estimationErrorSeconds: number | null;
  estimationErrorPercentage: number | null;
  betuPredictionSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccuracyResult {
  differenceSeconds: number;
  accuracy: number;
  accuracyPercentage: number;
  biasPercentage: number;
}

export interface PredictionProfile {
  userId: string;
  categoryId: string;
  completedBets: number;
  averagePredictedSeconds: number;
  averageActualSeconds: number;
  averageErrorPercentage: number;
  predictionMultiplier: number;
  predictionAccuracy: number;
  updatedAt: string;
}

export interface BetuPredictionResult {
  userPredictionSeconds: number;
  betuPredictionSeconds: number;
  confidence: Confidence;
  historicalMultiplier: number;
  sampleSize: number;
}

export interface TimeDnaEntry {
  categoryId: string;
  categoryName: string;
  betsCompleted: number;
  averagePredictedSeconds: number;
  averageActualSeconds: number;
  averageAbsoluteErrorSeconds: number;
  medianErrorSeconds: number;
  averageUnderestimationPercentage: number;
  averageOverestimationPercentage: number;
  predictionAccuracy: number;
  predictedToActualRatio: number;
  biasPercentage: number;
}

export interface TimeIqResult {
  score: number;
  tier: TimeIqTier;
}
