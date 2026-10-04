import { calculateAccuracy } from "./accuracy";
import { formatDuration } from "./formatDuration";

export interface FeedbackInput {
  predictedSeconds: number;
  actualSeconds: number;
}

const ALMOST_PERFECT_ACCURACY_THRESHOLD = 90;
const SERIOUS_BIAS_THRESHOLD = 50;

/** Contextual copy for the Result screen (spec section 6). */
export function generateResultFeedback(input: FeedbackInput): string {
  const { differenceSeconds, accuracyPercentage, biasPercentage } = calculateAccuracy(
    input.predictedSeconds,
    input.actualSeconds,
  );

  if (accuracyPercentage >= ALMOST_PERFECT_ACCURACY_THRESHOLD) {
    return `Almost perfect. You were only ${formatDuration(differenceSeconds)} off.`;
  }

  const underestimated = biasPercentage > 0;
  const absBias = Math.abs(biasPercentage);

  if (absBias < SERIOUS_BIAS_THRESHOLD) {
    const verb = underestimated ? "underestimated" : "overestimated";
    return `Close one. You ${verb} this task by ${Math.round(absBias)}%.`;
  }

  const ratio = input.actualSeconds / input.predictedSeconds;
  if (underestimated) {
    return `You seriously underestimated this one. It took ${ratio.toFixed(1)}× longer than expected.`;
  }
  return `You seriously overestimated this one. It only took ${ratio.toFixed(2)}× of what you predicted.`;
}
