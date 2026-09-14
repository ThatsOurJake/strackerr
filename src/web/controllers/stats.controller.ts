import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import { CacheKeys } from "../../infrastructure/cache/cache-keys";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { STATS_PERIODS, StatsService } from "../../modules/stats/stats.service";
import { formatDuration, mediaTypeDetails, toEntryViewModel } from "../activity-view-model";
import { buildWeeklyNostalgiaCard, buildYearTypeBreakdownRows } from "./stats.controller.helpers";

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
    const [totals, chart, topItems, averageDurations, weeklyNostalgiaInsight] = await Promise.all([
      this.statsService.totalTimeByType(user.userId, range),
      this.statsService.activityChart(user.userId, period, range),
      this.statsService.topItems(user.userId, range),
      this.statsService.averageSessionDurationByType(user.userId, range),
      period === "this-week"
        ? this.statsService.thisWeekPriorYearsInsight(user.userId)
        : Promise.resolve(null),
    ]);
    const timeByType = Object.entries(totals).map(([type, minutes]) => ({
      ...mediaTypeDetails(type as Parameters<typeof mediaTypeDetails>[0]),
      duration: formatDuration(minutes ?? 0),
      minutes: minutes ?? 0,
    }));
    const chartInHours = {
      labels: chart.labels,
      values: chart.values.map((minutes) =>
        Number((minutes / 60).toFixed(1)),
      ),
      series: chart.series.map((item) => ({
        ...item,
        values: item.values.map((minutes) => Number((minutes / 60).toFixed(1))),
      })),
    };
    const averageSessionDurationByType = averageDurations.map((item) => ({
      ...mediaTypeDetails(item.type),
      value: formatDuration(item.averageMinutes),
      subtitle: `${item.sessionCount} sessions`,
    }));
    const weeklyNostalgia = buildWeeklyNostalgiaCard(weeklyNostalgiaInsight);
    const model = {
      periods: STATS_PERIODS.map((item) => ({ ...item, active: item.slug === period })),
      period,
      periodRangeLabel: this.statsService.formatRangeLabel(range),
      timeByType,
      averageSessionDurationByType,
      weeklyNostalgia,
      chartJson: JSON.stringify(chartInHours),
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

  @Get("this-time-past-years")
  async thisTimePastYears(
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const deepDive = await this.statsService.thisWeekAcrossYears(user.userId);
    const weekKey = deepDive.currentWeekRange.from.toISOString().slice(0, 10);
    const cacheKey = CacheKeys.statsPastYears(user.userId, weekKey);
    const cached = await this.cacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return response.render("stats-past-years", { title: "This time past years", ...cached });
    }

    const years = deepDive.years.map((year) => ({
      year: year.year,
      dateRangeLabel: this.statsService.formatRangeLabel(year.range),
      totalDuration: formatDuration(year.totalMinutes),
      entryCount: year.entryCount,
      hasActivity: year.entryCount > 0,
      typeBreakdownRows: buildYearTypeBreakdownRows(year.typeBreakdown, year.totalMinutes),
      topItems: year.topItems.map((item) => ({
        ...toEntryViewModel({
          id: "stats-nostalgia",
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
    }));

    const model = {
      currentWeekLabel: this.statsService.formatRangeLabel(deepDive.currentWeekRange),
      years,
      hasYears: years.length > 0,
      hasAnyActivity: years.some((year) => year.hasActivity),
    };

    await this.cacheService.set(cacheKey, model, 900, user.userId);
    return response.render("stats-past-years", { title: "This time past years", ...model });
  }
}
