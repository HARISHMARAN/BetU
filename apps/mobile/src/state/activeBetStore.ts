import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { calculateAccuracy, calculateElapsedSeconds, generateResultFeedback } from "@betu/shared";
import { betsApi } from "../api/client";

const ACTIVE_BET_KEY = "betu_active_bet";
const PENDING_FINISH_KEY = "betu_pending_finish";

export interface LocalActiveBet {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  predictedSeconds: number;
  startedAt: string;
  pausedAt: string | null;
  pausedSeconds: number;
  status: "ACTIVE" | "PAUSED";
}

export interface BetResult {
  betId: string;
  title: string;
  predictedSeconds: number;
  actualSeconds: number;
  accuracyPercentage: number;
  estimationErrorSeconds: number;
  estimationErrorPercentage: number;
  feedback: string;
}

interface PendingFinish {
  betId: string;
  title: string;
  predictedSeconds: number;
  actualSeconds: number;
}

interface ActiveBetState {
  activeBet: LocalActiveBet | null;
  isLoaded: boolean;
  load: () => Promise<void>;
  start: (input: {
    title: string;
    categoryId: string;
    categoryName: string;
    predictedSeconds: number;
  }) => Promise<LocalActiveBet>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<BetResult>;
  abandon: () => Promise<void>;
}

async function persist(bet: LocalActiveBet | null): Promise<void> {
  if (bet) {
    await AsyncStorage.setItem(ACTIVE_BET_KEY, JSON.stringify(bet));
  } else {
    await AsyncStorage.removeItem(ACTIVE_BET_KEY);
  }
}

/**
 * If a finish failed to reach the server (offline), we keep the one
 * most-recent locally-computed result and retry it on next app load.
 * Deliberately a single slot, not a general queue — see mobile README
 * for the offline-support scope this covers.
 */
async function retryPendingFinish(): Promise<void> {
  const raw = await AsyncStorage.getItem(PENDING_FINISH_KEY);
  if (!raw) return;

  const pending = JSON.parse(raw) as PendingFinish;
  try {
    await betsApi.finish(pending.betId);
    await AsyncStorage.removeItem(PENDING_FINISH_KEY);
  } catch {
    // still offline or server rejected it — try again next load
  }
}

export const useActiveBetStore = create<ActiveBetState>((set, get) => ({
  activeBet: null,
  isLoaded: false,

  load: async () => {
    const raw = await AsyncStorage.getItem(ACTIVE_BET_KEY);
    set({ activeBet: raw ? (JSON.parse(raw) as LocalActiveBet) : null, isLoaded: true });
    void retryPendingFinish();
  },

  start: async (input) => {
    const created = await betsApi.create({
      title: input.title,
      categoryId: input.categoryId,
      predictedSeconds: input.predictedSeconds,
    });
    const started = await betsApi.start(created.id);

    const bet: LocalActiveBet = {
      id: started.id,
      title: input.title,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      predictedSeconds: input.predictedSeconds,
      startedAt: started.startedAt as string,
      pausedAt: null,
      pausedSeconds: 0,
      status: "ACTIVE",
    };

    await persist(bet);
    set({ activeBet: bet });
    return bet;
  },

  pause: async () => {
    const current = get().activeBet;
    if (!current || current.status !== "ACTIVE") return;

    const updated: LocalActiveBet = { ...current, status: "PAUSED", pausedAt: new Date().toISOString() };
    await persist(updated);
    set({ activeBet: updated });

    void betsApi.pause(current.id).catch(() => {
      // best-effort sync; local timer state remains correct regardless
    });
  },

  resume: async () => {
    const current = get().activeBet;
    if (!current || current.status !== "PAUSED" || !current.pausedAt) return;

    const pausedForSeconds = Math.max(
      0,
      Math.round((Date.now() - new Date(current.pausedAt).getTime()) / 1000),
    );
    const updated: LocalActiveBet = {
      ...current,
      status: "ACTIVE",
      pausedAt: null,
      pausedSeconds: current.pausedSeconds + pausedForSeconds,
    };
    await persist(updated);
    set({ activeBet: updated });

    void betsApi.resume(current.id).catch(() => {
      // best-effort sync; local timer state remains correct regardless
    });
  },

  finish: async () => {
    const current = get().activeBet;
    if (!current) {
      throw new Error("No active bet to finish");
    }

    const actualSeconds = calculateElapsedSeconds({
      startedAt: current.startedAt,
      now: new Date(),
      pausedSeconds: current.pausedSeconds,
      pausedAt: current.pausedAt,
    });

    await persist(null);
    set({ activeBet: null });

    try {
      const server = await betsApi.finish(current.id);
      return {
        betId: current.id,
        title: current.title,
        predictedSeconds: current.predictedSeconds,
        actualSeconds: server.actualSeconds ?? actualSeconds,
        accuracyPercentage: (server.accuracyScore ?? 0) * 100,
        estimationErrorSeconds: server.estimationErrorSeconds ?? 0,
        estimationErrorPercentage: server.estimationErrorPercentage ?? 0,
        feedback: server.feedback ?? generateResultFeedback({ predictedSeconds: current.predictedSeconds, actualSeconds }),
      };
    } catch {
      // Offline right now: compute locally and queue one retry for later.
      const accuracy = calculateAccuracy(current.predictedSeconds, actualSeconds);
      const pending: PendingFinish = {
        betId: current.id,
        title: current.title,
        predictedSeconds: current.predictedSeconds,
        actualSeconds,
      };
      await AsyncStorage.setItem(PENDING_FINISH_KEY, JSON.stringify(pending));

      return {
        betId: current.id,
        title: current.title,
        predictedSeconds: current.predictedSeconds,
        actualSeconds,
        accuracyPercentage: accuracy.accuracyPercentage,
        estimationErrorSeconds: accuracy.differenceSeconds,
        estimationErrorPercentage: accuracy.biasPercentage,
        feedback: generateResultFeedback({ predictedSeconds: current.predictedSeconds, actualSeconds }),
      };
    }
  },

  abandon: async () => {
    const current = get().activeBet;
    if (!current) return;

    await persist(null);
    set({ activeBet: null });

    void betsApi.abandon(current.id).catch(() => {
      // best-effort; bet remains ACTIVE server-side if this never syncs
    });
  },
}));
