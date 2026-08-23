export const CacheKeys = {
  history: (userId: string, page: number) => `history:${userId}:${page}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  stats: (userId: string, year: string) => `stats:${userId}:${year}`,
};
