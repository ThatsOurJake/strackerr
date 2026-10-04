const DEFAULT_API_V1_THROTTLE_LIMIT = 300;
const DEFAULT_API_V1_THROTTLE_TTL_MS = 60_000;

const parsePositiveInteger = (
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

export const API_V1_THROTTLE_LIMIT = parsePositiveInteger(
  process.env.API_V1_THROTTLE_LIMIT,
  DEFAULT_API_V1_THROTTLE_LIMIT,
);

export const API_V1_THROTTLE_TTL_MS = parsePositiveInteger(
  process.env.API_V1_THROTTLE_TTL_MS,
  DEFAULT_API_V1_THROTTLE_TTL_MS,
);

export const API_V1_THROTTLE = {
  default: {
    limit: API_V1_THROTTLE_LIMIT,
    ttl: API_V1_THROTTLE_TTL_MS,
  },
} as const;
