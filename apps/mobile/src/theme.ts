/**
 * BetU design tokens. "You vs You" — bold, confident, game-like.
 * Deep ink background, electric green for stakes/wins, amber for the
 * primary BET action so it visually dominates every screen it's on.
 */
export const colors = {
  background: "#0E1013",
  surface: "#17191D",
  surfaceRaised: "#1F2228",
  border: "#2A2D34",

  textPrimary: "#F5F6F7",
  textSecondary: "#9BA1AC",
  textMuted: "#6B7280",

  bet: "#FFB020", // the BET action color — warm, urgent, dominant
  betPressed: "#E09A1A",

  win: "#2ED191", // underestimation / good accuracy
  loss: "#FF5D5D", // overestimation / large miss
  neutral: "#6B7280",

  accuracyHigh: "#2ED191",
  accuracyMedium: "#FFB020",
  accuracyLow: "#FF5D5D",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 40, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: "700" as const },
  heading: { fontSize: 18, fontWeight: "700" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  mono: { fontSize: 48, fontWeight: "700" as const, letterSpacing: 1 },
} as const;
