import { describe, expect, it } from "vitest";
import { calculateElapsedSeconds } from "./timer";

describe("calculateElapsedSeconds", () => {
  it("computes elapsed time purely from timestamps, not a counter", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const now = new Date("2026-01-01T10:17:34Z");
    const elapsed = calculateElapsedSeconds({ startedAt, now, pausedSeconds: 0, pausedAt: null });
    expect(elapsed).toBe(17 * 60 + 34);
  });

  it("subtracts accumulated paused duration while active", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const now = new Date("2026-01-01T10:30:00Z");
    const elapsed = calculateElapsedSeconds({ startedAt, now, pausedSeconds: 300, pausedAt: null });
    expect(elapsed).toBe(30 * 60 - 300);
  });

  it("freezes elapsed time at the pause moment while paused", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const pausedAt = new Date("2026-01-01T10:10:00Z");
    const now = new Date("2026-01-01T11:00:00Z"); // app reopened an hour later
    const elapsed = calculateElapsedSeconds({ startedAt, now, pausedSeconds: 0, pausedAt });
    expect(elapsed).toBe(10 * 60);
  });

  it("survives app restart: only timestamps matter, no in-memory counter needed", () => {
    const startedAt = new Date("2026-01-01T08:00:00Z");
    // Simulate process being killed and reopened much later
    const reopenedAt = new Date("2026-01-01T09:45:00Z");
    const elapsed = calculateElapsedSeconds({
      startedAt,
      now: reopenedAt,
      pausedSeconds: 0,
      pausedAt: null,
    });
    expect(elapsed).toBe(105 * 60);
  });

  it("never returns negative elapsed time", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const now = new Date("2026-01-01T10:00:01Z");
    const elapsed = calculateElapsedSeconds({ startedAt, now, pausedSeconds: 999999, pausedAt: null });
    expect(elapsed).toBe(0);
  });

  it("accepts ISO string timestamps as well as Date objects", () => {
    const elapsed = calculateElapsedSeconds({
      startedAt: "2026-01-01T10:00:00.000Z",
      now: "2026-01-01T10:01:00.000Z",
      pausedSeconds: 0,
      pausedAt: null,
    });
    expect(elapsed).toBe(60);
  });
});
