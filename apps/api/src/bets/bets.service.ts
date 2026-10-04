import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Bet, Prisma } from "@prisma/client";
import { calculateAccuracy, calculateElapsedSeconds, calculateTimeIq, generateResultFeedback } from "@betu/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBetDto } from "./dto/create-bet.dto";
import { ListBetsQueryDto } from "./dto/list-bets-query.dto";
import { BetWithFeedback } from "./bets.types";

const TIME_IQ_HISTORY_SIZE = 50;

@Injectable()
export class BetsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateBetDto): Promise<Bet> {
    return this.prisma.bet.create({
      data: {
        userId,
        title: dto.title,
        categoryId: dto.categoryId,
        predictedSeconds: dto.predictedSeconds,
      },
    });
  }

  async findAllForUser(userId: string, query: ListBetsQueryDto): Promise<Bet[]> {
    const where: Prisma.BetWhereInput = { userId };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const since = rangeStartDate(query.range);
    if (since) {
      where.createdAt = { gte: since };
    }

    return this.prisma.bet.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async findOneForUser(userId: string, betId: string): Promise<Bet> {
    return this.requireOwnedBet(userId, betId);
  }

  async start(userId: string, betId: string): Promise<Bet> {
    const bet = await this.requireOwnedBet(userId, betId);
    if (bet.status !== "CREATED") {
      throw new BadRequestException(`Cannot start a bet in status ${bet.status}`);
    }

    return this.prisma.bet.update({
      where: { id: betId },
      data: { status: "ACTIVE", startedAt: new Date() },
    });
  }

  async pause(userId: string, betId: string): Promise<Bet> {
    const bet = await this.requireOwnedBet(userId, betId);
    if (bet.status !== "ACTIVE") {
      throw new BadRequestException(`Cannot pause a bet in status ${bet.status}`);
    }

    return this.prisma.bet.update({
      where: { id: betId },
      data: { status: "PAUSED", pausedAt: new Date() },
    });
  }

  async resume(userId: string, betId: string): Promise<Bet> {
    const bet = await this.requireOwnedBet(userId, betId);
    if (bet.status !== "PAUSED" || !bet.pausedAt) {
      throw new BadRequestException(`Cannot resume a bet in status ${bet.status}`);
    }

    const pausedDurationSeconds = Math.round((Date.now() - bet.pausedAt.getTime()) / 1000);

    return this.prisma.bet.update({
      where: { id: betId },
      data: {
        status: "ACTIVE",
        pausedAt: null,
        pausedSeconds: bet.pausedSeconds + Math.max(0, pausedDurationSeconds),
      },
    });
  }

  async finish(userId: string, betId: string): Promise<BetWithFeedback> {
    const bet = await this.requireOwnedBet(userId, betId);
    if (!bet.startedAt || (bet.status !== "ACTIVE" && bet.status !== "PAUSED")) {
      throw new BadRequestException(`Cannot finish a bet in status ${bet.status}`);
    }

    const now = new Date();
    const actualSeconds = calculateElapsedSeconds({
      startedAt: bet.startedAt,
      now,
      pausedSeconds: bet.pausedSeconds,
      pausedAt: bet.pausedAt,
    });

    const accuracy = calculateAccuracy(bet.predictedSeconds, actualSeconds);
    const feedback = generateResultFeedback({
      predictedSeconds: bet.predictedSeconds,
      actualSeconds,
    });

    const updated = await this.prisma.bet.update({
      where: { id: betId },
      data: {
        status: "COMPLETED",
        finishedAt: now,
        actualSeconds,
        accuracyScore: accuracy.accuracy,
        estimationErrorSeconds: accuracy.differenceSeconds,
        estimationErrorPercentage: accuracy.biasPercentage,
      },
    });

    await this.updateTimeIq(userId);

    return { ...updated, feedback };
  }

  async abandon(userId: string, betId: string): Promise<Bet> {
    const bet = await this.requireOwnedBet(userId, betId);
    if (bet.status === "COMPLETED" || bet.status === "ABANDONED") {
      throw new BadRequestException(`Cannot abandon a bet in status ${bet.status}`);
    }

    return this.prisma.bet.update({
      where: { id: betId },
      data: { status: "ABANDONED", finishedAt: new Date() },
    });
  }

  private async requireOwnedBet(userId: string, betId: string): Promise<Bet> {
    const bet = await this.prisma.bet.findFirst({ where: { id: betId, userId } });
    if (!bet) {
      throw new NotFoundException("Bet not found");
    }
    return bet;
  }

  private async updateTimeIq(userId: string): Promise<void> {
    const recentCompleted = await this.prisma.bet.findMany({
      where: { userId, status: "COMPLETED", accuracyScore: { not: null } },
      orderBy: { finishedAt: "desc" },
      take: TIME_IQ_HISTORY_SIZE,
    });

    const oldestToNewest = recentCompleted.reverse().map((b) => b.accuracyScore as number);
    const { score } = calculateTimeIq(oldestToNewest);

    await this.prisma.user.update({ where: { id: userId }, data: { timeIqScore: score } });
  }
}

function rangeStartDate(range: ListBetsQueryDto["range"]): Date | null {
  const now = new Date();
  switch (range) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return start;
    }
    case "month": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return start;
    }
    default:
      return null;
  }
}
