/** Default categories seeded for every new user (spec section 9). */
export const DEFAULT_CATEGORY_NAMES = [
  "Study",
  "Work",
  "Coding",
  "Exercise",
  "Reading",
  "Cleaning",
  "Personal",
  "Other",
] as const;

export type DefaultCategoryName = (typeof DEFAULT_CATEGORY_NAMES)[number];
