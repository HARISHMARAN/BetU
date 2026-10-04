import { Controller, Get, UseGuards } from "@nestjs/common";
import type { TimeDnaEntry, TimeIqResult } from "@betu/shared";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { DashboardResponse } from "./analytics.types";

@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard")
  getDashboard(@CurrentUser() user: AuthenticatedUser): Promise<DashboardResponse> {
    return this.analyticsService.getDashboard(user.userId);
  }

  @Get("time-dna")
  getTimeDna(@CurrentUser() user: AuthenticatedUser): Promise<TimeDnaEntry[]> {
    return this.analyticsService.getTimeDna(user.userId);
  }

  @Get("time-iq")
  getTimeIq(@CurrentUser() user: AuthenticatedUser): Promise<TimeIqResult> {
    return this.analyticsService.getTimeIq(user.userId);
  }
}
