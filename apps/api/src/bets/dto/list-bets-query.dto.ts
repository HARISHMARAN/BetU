import { IsIn, IsOptional, IsString } from "class-validator";

export const BET_HISTORY_RANGES = ["today", "week", "month", "all"] as const;
export type BetHistoryRange = (typeof BET_HISTORY_RANGES)[number];

export class ListBetsQueryDto {
  @IsOptional()
  @IsIn(BET_HISTORY_RANGES)
  range?: BetHistoryRange;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
