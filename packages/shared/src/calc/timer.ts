export interface ElapsedTimeInput {
  startedAt: Date | string;
  now: Date | string;
  pausedSeconds: number;
  pausedAt: Date | string | null;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Derives elapsed seconds purely from timestamps (spec section 5):
 * current_time - started_at - paused_duration.
 * Never increment a counter — background execution / app kills / lock screen
 * would silently drop ticks and desync the timer.
 */
export function calculateElapsedSeconds(input: ElapsedTimeInput): number {
  const startedAt = toDate(input.startedAt);
  const referenceTime = input.pausedAt ? toDate(input.pausedAt) : toDate(input.now);

  const rawSeconds = (referenceTime.getTime() - startedAt.getTime()) / 1000;
  const elapsed = rawSeconds - input.pausedSeconds;

  return Math.max(0, Math.round(elapsed));
}
