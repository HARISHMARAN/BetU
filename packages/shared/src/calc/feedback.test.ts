import { describe, expect, it } from "vitest";
import { generateResultFeedback } from "./feedback";

describe("generateResultFeedback", () => {
  it("returns 'almost perfect' message for near-exact predictions", () => {
    // predicted 45min, actual 48min -> 3 min off, ~93% accuracy
    const msg = generateResultFeedback({ predictedSeconds: 45 * 60, actualSeconds: 48 * 60 });
    expect(msg).toContain("Almost perfect");
    expect(msg).toContain("3 min");
  });

  it("returns 'close one, underestimated' for moderate underestimation", () => {
    // predicted 60min, actual 72min -> +20% bias, 80% accuracy
    const msg = generateResultFeedback({ predictedSeconds: 60 * 60, actualSeconds: 72 * 60 });
    expect(msg).toContain("Close one");
    expect(msg.toLowerCase()).toContain("underestimated");
    expect(msg).toContain("20%");
  });

  it("returns 'close one, overestimated' for moderate overestimation", () => {
    // predicted 60min, actual 48min -> -20% bias
    const msg = generateResultFeedback({ predictedSeconds: 60 * 60, actualSeconds: 48 * 60 });
    expect(msg).toContain("Close one");
    expect(msg.toLowerCase()).toContain("overestimated");
  });

  it("returns 'seriously underestimated' with multiplier for large underestimation", () => {
    // predicted 30min, actual 63min -> 2.1x
    const msg = generateResultFeedback({ predictedSeconds: 30 * 60, actualSeconds: 63 * 60 });
    expect(msg.toLowerCase()).toContain("seriously underestimated");
    expect(msg).toContain("2.1");
  });

  it("returns 'seriously overestimated' for large overestimation", () => {
    // predicted 60min, actual 15min -> took 0.25x
    const msg = generateResultFeedback({ predictedSeconds: 60 * 60, actualSeconds: 15 * 60 });
    expect(msg.toLowerCase()).toContain("seriously overestimated");
  });

  it("handles exact match", () => {
    const msg = generateResultFeedback({ predictedSeconds: 1000, actualSeconds: 1000 });
    expect(msg).toContain("Almost perfect");
  });
});
