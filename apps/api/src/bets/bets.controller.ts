import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { Bet } from "@prisma/client";
import { BetsService } from "./bets.service";
import { CreateBetDto } from "./dto/create-bet.dto";
import { ListBetsQueryDto } from "./dto/list-bets-query.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { BetWithFeedback } from "./bets.types";

@UseGuards(JwtAuthGuard)
@Controller("bets")
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBetDto): Promise<Bet> {
    return this.betsService.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListBetsQueryDto): Promise<Bet[]> {
    return this.betsService.findAllForUser(user.userId, query);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<Bet> {
    return this.betsService.findOneForUser(user.userId, id);
  }

  @Post(":id/start")
  start(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<Bet> {
    return this.betsService.start(user.userId, id);
  }

  @Post(":id/pause")
  pause(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<Bet> {
    return this.betsService.pause(user.userId, id);
  }

  @Post(":id/resume")
  resume(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<Bet> {
    return this.betsService.resume(user.userId, id);
  }

  @Post(":id/finish")
  finish(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<BetWithFeedback> {
    return this.betsService.finish(user.userId, id);
  }

  @Post(":id/abandon")
  abandon(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<Bet> {
    return this.betsService.abandon(user.userId, id);
  }
}
