export const CacheKeys = {
  history: (userId: string, page: number) => `history:${userId}:${page}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  stats: (userId: string, period: string) => `stats:${userId}:${period}`,
};
