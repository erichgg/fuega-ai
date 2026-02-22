/**
 * Shared feature flag checker for V2 gamification features.
 * Flags are environment variables that default to false (safe state).
 * Checked server-side only — client receives feature availability from the API.
 */

export type FeatureFlag =
  | "ENABLE_BADGE_DISTRIBUTION"
  | "ENABLE_COSMETICS_SHOP"
  | "ENABLE_TIP_JAR"
  | "ENABLE_NOTIFICATIONS";

/**
 * Check if a feature flag is enabled.
 * Returns true only if the env var is explicitly "true" or "1".
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const value = process.env[flag];
  return value === "true" || value === "1";
}

/**
 * Get all feature flags and their current states.
 */
export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  const flags: FeatureFlag[] = [
    "ENABLE_BADGE_DISTRIBUTION",
    "ENABLE_COSMETICS_SHOP",
    "ENABLE_TIP_JAR",
    "ENABLE_NOTIFICATIONS",
  ];

  return flags.reduce(
    (acc, flag) => {
      acc[flag] = isFeatureEnabled(flag);
      return acc;
    },
    {} as Record<FeatureFlag, boolean>
  );
}
