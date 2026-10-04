import { Injectable, NotFoundException } from "@nestjs/common";
import { computeTimeDnaEntry, tierForScore, type TimeDnaEntry, type TimeIqResult } from "@betu/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DashboardResponse } from "./analytics.types";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTimeDna(userId: string): Promise<TimeDnaEntry[]> {
    const bets = await this.prisma.bet.findMany({
      where: { userId, status: "COMPLETED", actualSeconds: { not: null } },
      include: { category: true },
    });

    const byCategory = new Map<string, { name: string; durations: { predictedSeconds: number; actualSeconds: number }[] }>();

    for (const bet of bets) {
      const bucket = byCategory.get(bet.categoryId) ?? { name: bet.category.name, durations: [] };
      bucket.durations.push({ predictedSeconds: bet.predictedSeconds, actualSeconds: bet.actualSeconds as number });
      byCategory.set(bet.categoryId, bucket);
    }

    return Array.from(byCategory.entries()).map(([categoryId, { name, durations }]) =>
      computeTimeDnaEntry(categoryId, name, durations),
    );
  }

  async getDashboard(userId: string): Promise<DashboardResponse> {
    const [timeIq, weekBets] = await Promise.all([this.getTimeIq(userId), this.getWeekBets(userId)]);

    const secondsTracked = weekBets.reduce((sum, b) => sum + (b.actualSeconds ?? 0), 0);
    const accuracyScores = weekBets.map((b) => b.accuracyScore).filter((v): v is number => v !== null);
    const predictionAccuracyPercentage =
      accuracyScores.length === 0
        ? 0
        : (accuracyScores.reduce((sum, v) => sum + v, 0) / accuracyScores.length) * 100;

    return {
      timeIq,
      thisWeek: {
        betsCompleted: weekBets.length,
        secondsTracked,
        predictionAccuracyPercentage,
      },
    };
  }

  async getTimeIq(userId: string): Promise<TimeIqResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return { score: user.timeIqScore, tier: tierForScore(user.timeIqScore) };
  }

  private getWeekBets(userId: string) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    return this.prisma.bet.findMany({
      where: { userId, status: "COMPLETED", finishedAt: { gte: weekStart } },
    });
  }
}
