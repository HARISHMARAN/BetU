import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BetsService } from "./bets.service";
import { PrismaService } from "../prisma/prisma.service";

type MockPrisma = {
  bet: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  user: {
    update: jest.Mock;
  };
};

function buildBet(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "bet-1",
    userId: "user-1",
    categoryId: "cat-1",
    title: "Study AWS",
    predictedSeconds: 2700,
    actualSeconds: null,
    startedAt: null,
    finishedAt: null,
    pausedAt: null,
    pausedSeconds: 0,
    status: "CREATED",
    accuracyScore: null,
    estimationErrorSeconds: null,
    estimationErrorPercentage: null,
    betuPredictionSeconds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("BetsService", () => {
  let service: BetsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      bet: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
    };
    service = new BetsService(prisma as unknown as PrismaService);
  });

  describe("create", () => {
    it("creates a bet in CREATED status", async () => {
      prisma.bet.create.mockResolvedValue(buildBet());
      const result = await service.create("user-1", {
        title: "Study AWS",
        categoryId: "cat-1",
        predictedSeconds: 2700,
      });
      expect(prisma.bet.create).toHaveBeenCalledWith({
        data: { userId: "user-1", title: "Study AWS", categoryId: "cat-1", predictedSeconds: 2700 },
      });
      expect(result.status).toBe("CREATED");
    });
  });

  describe("start", () => {
    it("throws NotFoundException when bet does not belong to user", async () => {
      prisma.bet.findFirst.mockResolvedValue(null);
      await expect(service.start("user-1", "bet-1")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects starting a bet that is not in CREATED status", async () => {
      prisma.bet.findFirst.mockResolvedValue(buildBet({ status: "ACTIVE" }));
      await expect(service.start("user-1", "bet-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("sets startedAt and status ACTIVE", async () => {
      prisma.bet.findFirst.mockResolvedValue(buildBet({ status: "CREATED" }));
      prisma.bet.update.mockResolvedValue(buildBet({ status: "ACTIVE", startedAt: new Date() }));

      const result = await service.start("user-1", "bet-1");

      expect(prisma.bet.update).toHaveBeenCalledWith({
        where: { id: "bet-1" },
        data: { status: "ACTIVE", startedAt: expect.any(Date) },
      });
      expect(result.status).toBe("ACTIVE");
    });
  });

  describe("pause", () => {
    it("rejects pausing a bet that is not ACTIVE", async () => {
      prisma.bet.findFirst.mockResolvedValue(buildBet({ status: "CREATED" }));
      await expect(service.pause("user-1", "bet-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("sets pausedAt and status PAUSED", async () => {
      prisma.bet.findFirst.mockResolvedValue(buildBet({ status: "ACTIVE", startedAt: new Date() }));
      prisma.bet.update.mockResolvedValue(buildBet({ status: "PAUSED" }));

      await service.pause("user-1", "bet-1");

      expect(prisma.bet.update).toHaveBeenCalledWith({
        where: { id: "bet-1" },
        data: { status: "PAUSED", pausedAt: expect.any(Date) },
      });
    });
  });

  describe("resume", () => {
    it("rejects resuming a bet that is not PAUSED", async () => {
      prisma.bet.findFirst.mockResolvedValue(buildBet({ status: "ACTIVE" }));
      await expect(service.resume("user-1", "bet-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("accumulates pausedSeconds and clears pausedAt", async () => {
      const pausedAt = new Date(Date.now() - 60_000); // paused 60s ago
      prisma.bet.findFirst.mockResolvedValue(
        buildBet({ status: "PAUSED", pausedAt, pausedSeconds: 10 }),
      );
      prisma.bet.update.mockResolvedValue(buildBet({ status: "ACTIVE" }));

      await service.resume("user-1", "bet-1");

      const callArg = prisma.bet.update.mock.calls[0][0];
      expect(callArg.where).toEqual({ id: "bet-1" });
      expect(callArg.data.status).toBe("ACTIVE");
      expect(callArg.data.pausedAt).toBeNull();
      // ~60s elapsed while paused + 10 already accumulated
      expect(callArg.data.pausedSeconds).toBeGreaterThanOrEqual(69);
      expect(callArg.data.pausedSeconds).toBeLessThanOrEqual(71);
    });
  });

  describe("finish", () => {
    it("rejects finishing a bet that was never started", async () => {
      prisma.bet.findFirst.mockResolvedValue(buildBet({ status: "CREATED" }));
      await expect(service.finish("user-1", "bet-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("computes actualSeconds, accuracy, and updates the user's Time IQ", async () => {
      const startedAt = new Date(Date.now() - 45 * 60_000); // started 45 min ago
      const bet = buildBet({
        status: "ACTIVE",
        startedAt,
        pausedSeconds: 0,
        predictedSeconds: 45 * 60,
      });
      prisma.bet.findFirst.mockResolvedValue(bet);
      prisma.bet.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...bet, ...data }),
      );
      prisma.bet.findMany.mockResolvedValue([{ accuracyScore: 0.9 }, { accuracyScore: 0.95 }]);

      const result = await service.finish("user-1", "bet-1");

      expect(result.status).toBe("COMPLETED");
      expect(result.actualSeconds).toBeGreaterThanOrEqual(45 * 60 - 2);
      expect(result.actualSeconds).toBeLessThanOrEqual(45 * 60 + 2);
      expect(result.accuracyScore).toBeGreaterThan(0.9);
      expect(result.feedback).toBeTruthy();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { timeIqScore: expect.any(Number) },
      });
    });

    it("freezes elapsed time at the pause moment when finishing a paused bet", async () => {
      const startedAt = new Date(Date.now() - 20 * 60_000);
      const pausedAt = new Date(Date.now() - 5 * 60_000); // paused 5 min ago, after 15 min active
      const bet = buildBet({
        status: "PAUSED",
        startedAt,
        pausedAt,
        pausedSeconds: 0,
        predictedSeconds: 20 * 60,
      });
      prisma.bet.findFirst.mockResolvedValue(bet);
      prisma.bet.update.mockImplementation(({ data }) => Promise.resolve({ ...bet, ...data }));
      prisma.bet.findMany.mockResolvedValue([]);

      const result = await service.finish("user-1", "bet-1");

      // 15 min elapsed before pause, frozen there
      expect(result.actualSeconds).toBeGreaterThanOrEqual(15 * 60 - 2);
      expect(result.actualSeconds).toBeLessThanOrEqual(15 * 60 + 2);
    });
  });

  describe("abandon", () => {
    it("rejects abandoning an already completed bet", async () => {
      prisma.bet.findFirst.mockResolvedValue(buildBet({ status: "COMPLETED" }));
      await expect(service.abandon("user-1", "bet-1")).rejects.toBeInstanceOf(BadRequestException);
    });

    it("marks the bet ABANDONED without computing accuracy", async () => {
      prisma.bet.findFirst.mockResolvedValue(buildBet({ status: "ACTIVE" }));
      prisma.bet.update.mockResolvedValue(buildBet({ status: "ABANDONED" }));

      const result = await service.abandon("user-1", "bet-1");

      expect(prisma.bet.update).toHaveBeenCalledWith({
        where: { id: "bet-1" },
        data: { status: "ABANDONED", finishedAt: expect.any(Date) },
      });
      expect(result.status).toBe("ABANDONED");
    });
  });
});
