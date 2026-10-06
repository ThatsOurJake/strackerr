export const DEFAULT_API_V1_THROTTLE_LIMIT = 300;
export const DEFAULT_API_V1_THROTTLE_TTL_MS = 60_000;

export const parsePositiveInteger = (
  rawValue: string | undefined,
  fallback: number,
): number => {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};
