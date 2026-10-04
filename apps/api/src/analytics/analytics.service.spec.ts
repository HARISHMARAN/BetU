import { AnalyticsService } from "./analytics.service";
import { PrismaService } from "../prisma/prisma.service";

type MockPrisma = {
  bet: { findMany: jest.Mock };
  user: { findUnique: jest.Mock };
};

function completedBet(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "bet-1",
    userId: "user-1",
    categoryId: "cat-1",
    category: { id: "cat-1", name: "Study" },
    predictedSeconds: 1800,
    actualSeconds: 2000,
    accuracyScore: 0.85,
    status: "COMPLETED",
    finishedAt: new Date(),
    ...overrides,
  };
}

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      bet: { findMany: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    service = new AnalyticsService(prisma as unknown as PrismaService);
  });

  describe("getTimeDna", () => {
    it("groups completed bets by category and computes DNA entries", async () => {
      prisma.bet.findMany.mockResolvedValue([
        completedBet({ categoryId: "cat-1", category: { id: "cat-1", name: "Study" } }),
        completedBet({ categoryId: "cat-1", category: { id: "cat-1", name: "Study" } }),
        completedBet({
          categoryId: "cat-2",
          category: { id: "cat-2", name: "Coding" },
          predictedSeconds: 2880,
          actualSeconds: 4260,
        }),
      ]);

      const result = await service.getTimeDna("user-1");

      expect(result).toHaveLength(2);
      const study = result.find((e) => e.categoryName === "Study");
      const coding = result.find((e) => e.categoryName === "Coding");
      expect(study?.betsCompleted).toBe(2);
      expect(coding?.betsCompleted).toBe(1);
    });

    it("returns an empty array when the user has no completed bets", async () => {
      prisma.bet.findMany.mockResolvedValue([]);
      const result = await service.getTimeDna("user-1");
      expect(result).toEqual([]);
    });
  });

  describe("getDashboard", () => {
    it("summarizes this week's bets and includes Time IQ", async () => {
      prisma.user.findUnique.mockResolvedValue({ timeIqScore: 782 });
      prisma.bet.findMany.mockResolvedValue([
        completedBet({ actualSeconds: 3600 }),
        completedBet({ actualSeconds: 1800 }),
      ]);

      const result = await service.getDashboard("user-1");

      expect(result.timeIq.score).toBe(782);
      expect(result.thisWeek.betsCompleted).toBe(2);
      expect(result.thisWeek.secondsTracked).toBe(5400);
      expect(result.thisWeek.predictionAccuracyPercentage).toBeCloseTo(85, 5);
    });

    it("handles a week with zero completed bets", async () => {
      prisma.user.findUnique.mockResolvedValue({ timeIqScore: 0 });
      prisma.bet.findMany.mockResolvedValue([]);

      const result = await service.getDashboard("user-1");

      expect(result.thisWeek.betsCompleted).toBe(0);
      expect(result.thisWeek.secondsTracked).toBe(0);
      expect(result.thisWeek.predictionAccuracyPercentage).toBe(0);
    });
  });

  describe("getTimeIq", () => {
    it("returns the cached score and derived tier", async () => {
      prisma.user.findUnique.mockResolvedValue({ timeIqScore: 920 });
      const result = await service.getTimeIq("user-1");
      expect(result.score).toBe(920);
      expect(result.tier).toBe("Prediction Expert");
    });
  });
});
