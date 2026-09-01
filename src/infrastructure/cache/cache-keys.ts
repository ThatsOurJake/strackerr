export const CacheKeys = {
  history: (userId: string, month: string) => `history:${userId}:${month}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  stats: (userId: string, period: string) => `stats:${userId}:${period}`,
};
