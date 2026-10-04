import { Confidence } from "../types";

/** Sample-size based confidence tiers (spec section 12). */
export function confidenceForSampleSize(sampleSize: number): Confidence {
  if (sampleSize >= 15) return Confidence.HIGH;
  if (sampleSize >= 5) return Confidence.MEDIUM;
  return Confidence.LOW;
}
