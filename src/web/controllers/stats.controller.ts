import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import { CacheKeys } from "../../infrastructure/cache/cache-keys";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { STATS_PERIODS, StatsService } from "../../modules/stats/stats.service";
import { formatDuration, mediaTypeDetails, toEntryViewModel } from "../activity-view-model";

const DEFAULT_STATS_PERIOD = "this-week";

@Controller("stats")
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly cacheService: AppCacheService,
  ) { }

  @Get()
  async stats(
    @Query("period") requestedPeriod: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const period = requestedPeriod ?? DEFAULT_STATS_PERIOD;
    if (!this.statsService.isValidPeriod(period)) {
      return response.redirect(`/stats?period=${DEFAULT_STATS_PERIOD}`);
    }

    const cacheKey = CacheKeys.stats(user.userId, period);
    const cached = await this.cacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return response.render("stats", { title: "Stats", ...cached });
    }

    const range = this.statsService.resolveDateRange(period);
    const [totals, chart, topItems] = await Promise.all([
      this.statsService.totalTimeByType(user.userId, range),
      this.statsService.activityChart(user.userId, period, range),
      this.statsService.topItems(user.userId, range),
    ]);
    const timeByType = Object.entries(totals).map(([type, minutes]) => ({
      ...mediaTypeDetails(type as Parameters<typeof mediaTypeDetails>[0]),
      duration: formatDuration(minutes),
      minutes,
    }));
    const model = {
      periods: STATS_PERIODS.map((item) => ({ ...item, active: item.slug === period })),
      period,
      timeByType,
      chartJson: JSON.stringify(chart),
      topItems: topItems.map((item) => ({
        ...toEntryViewModel({
          id: "stats",
          userId: user.userId,
          mediaItemId: item.mediaItem.id,
          loggedAt: new Date(),
          duration: item.totalMinutes,
          notes: null,
          platform: null,
          playerCount: null,
          won: null,
          source: "MANUAL",
          createdAt: new Date(),
          mediaItem: item.mediaItem,
        }),
        duration: formatDuration(item.totalMinutes),
      })),
      hasActivity: timeByType.length > 0,
    };
    await this.cacheService.set(cacheKey, model, 900, user.userId);
    return response.render("stats", { title: "Stats", ...model });
  }
}
