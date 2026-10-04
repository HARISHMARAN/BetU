/** Formats seconds as "X min Y sec" per the display style used throughout the spec. */
export function formatDuration(totalSeconds: number): string {
  const abs = Math.round(Math.abs(totalSeconds));
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;

  if (minutes === 0) return `${seconds} sec`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}

/** Same as formatDuration but prefixed with +/- for displaying a difference. */
export function formatSignedDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return formatDuration(0);
  const sign = totalSeconds > 0 ? "+" : "-";
  return `${sign}${formatDuration(totalSeconds)}`;
}
