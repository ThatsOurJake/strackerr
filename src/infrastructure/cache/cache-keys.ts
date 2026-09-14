export const CacheKeys = {
  history: (userId: string, month: string) => `history:${userId}:${month}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  stats: (userId: string, period: string) => `stats:${userId}:${period}`,
  statsPastYears: (userId: string, weekKey: string) => `stats:${userId}:this-time-past-years:${weekKey}`,
};
