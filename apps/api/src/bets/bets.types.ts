import type { Bet } from "@prisma/client";

export interface BetWithFeedback extends Bet {
  feedback?: string;
}
