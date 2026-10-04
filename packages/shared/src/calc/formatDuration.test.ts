import { describe, expect, it } from "vitest";
import { formatDuration, formatSignedDuration } from "./formatDuration";

describe("formatDuration", () => {
  it("formats whole minutes without seconds", () => {
    expect(formatDuration(45 * 60)).toBe("45 min");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(52 * 60 + 18)).toBe("52 min 18 sec");
  });

  it("formats pure seconds under a minute", () => {
    expect(formatDuration(34)).toBe("34 sec");
  });

  it("formats zero as 0 sec", () => {
    expect(formatDuration(0)).toBe("0 sec");
  });
});

describe("formatSignedDuration", () => {
  it("prefixes positive durations with +", () => {
    expect(formatSignedDuration(7 * 60 + 18)).toBe("+7 min 18 sec");
  });

  it("prefixes negative durations with -", () => {
    expect(formatSignedDuration(-(3 * 60))).toBe("-3 min");
  });

  it("has no sign prefix for zero", () => {
    expect(formatSignedDuration(0)).toBe("0 sec");
  });
});
