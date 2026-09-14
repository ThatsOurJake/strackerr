import type { Response } from "express";
import type { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { StatsService } from "../../modules/stats/stats.service";
import { StatsController } from "./stats.controller";

const user: AuthenticatedUser = { userId: "user-2", username: "tester", isAdmin: false };

describe("StatsController", () => {
  let statsService: {
    isValidPeriod: jest.Mock;
    resolveDateRange: jest.Mock;
    totalTimeByType: jest.Mock;
    activityChart: jest.Mock;
    topItems: jest.Mock;
    averageSessionDurationByType: jest.Mock;
    thisWeekPriorYearsInsight: jest.Mock;
    thisWeekAcrossYears: jest.Mock;
    formatRangeLabel: jest.Mock;
  };
  let cacheGet: jest.Mock;
  let cacheSet: jest.Mock;
  let controller: StatsController;
  let response: { redirect: jest.Mock; render: jest.Mock };

  beforeEach(() => {
    statsService = {
      isValidPeriod: jest.fn(),
      resolveDateRange: jest.fn(),
      totalTimeByType: jest.fn(),
      activityChart: jest.fn(),
      topItems: jest.fn(),
      averageSessionDurationByType: jest.fn(),
      thisWeekPriorYearsInsight: jest.fn(),
      thisWeekAcrossYears: jest.fn(),
      formatRangeLabel: jest.fn().mockReturnValue("17 Aug 2026 - 23 Aug 2026"),
    };
    cacheGet = jest.fn();
    cacheSet = jest.fn();
    controller = new StatsController(
      statsService as unknown as StatsService,
      { get: cacheGet, set: cacheSet } as unknown as AppCacheService,
    );
    response = { redirect: jest.fn(), render: jest.fn() };
  });

  it("redirects an invalid period to this week before cache or data access", async () => {
    statsService.isValidPeriod.mockReturnValue(false);

    await controller.stats("invalid", user, response as unknown as Response);

    expect(response.redirect).toHaveBeenCalledWith("/stats?period=this-week");
    expect(cacheGet).not.toHaveBeenCalled();
    expect(statsService.resolveDateRange).not.toHaveBeenCalled();
  });

  it("defaults to this week and scopes all aggregations and cache entries to the user", async () => {
    const range = { from: new Date(2026, 7, 24), to: new Date(2026, 7, 24, 23, 59, 59, 999) };
    statsService.isValidPeriod.mockReturnValue(true);
    statsService.resolveDateRange.mockReturnValue(range);
    statsService.totalTimeByType.mockResolvedValue({ MOVIE: 60 });
    statsService.activityChart.mockResolvedValue({
      labels: ["Mon", "Tue"],
      values: [60, 200],
      series: [
        { key: "movie", label: "Movie", color: "#F59E0B", values: [60, 0] },
        { key: "tv", label: "TV", color: "#3B82F6", values: [0, 0] },
        { key: "game", label: "Game", color: "#22C55E", values: [0, 200] },
        { key: "boardgame", label: "Board game", color: "#F97316", values: [0, 0] },
        { key: "music", label: "Music", color: "#EC4899", values: [0, 0] },
      ],
    });
    statsService.topItems.mockResolvedValue([]);
    statsService.averageSessionDurationByType.mockResolvedValue([
      { type: "MOVIE", sessionCount: 1, totalMinutes: 60, averageMinutes: 60 },
    ]);
    statsService.thisWeekPriorYearsInsight.mockResolvedValue({
      range: { from: new Date(2026, 7, 17), to: new Date(2026, 7, 23) },
      priorYearsCount: 2,
      daysCovered: 3,
      aggregateTotalMinutes: 160,
      aggregateEntryCount: 3,
      typeBreakdown: [{ key: "movie", label: "Movie", color: "#F59E0B", minutes: 60 }],
      previousYear: {
        year: 2025,
        totalMinutes: 60,
        entryCount: 1,
        typeBreakdown: [{ key: "movie", label: "Movie", color: "#F59E0B", minutes: 60 }],
      },
      throwbackItem: {
        mediaItem: {
          id: "movie-1",
          type: "MOVIE",
          title: "The Matrix",
          imageUrl: null,
          parent: null,
        },
        durationMinutes: 60,
        loggedAt: new Date(2025, 7, 12),
        year: 2025,
      },
    });
    cacheGet.mockResolvedValue(null);

    await controller.stats(undefined, user, response as unknown as Response);

    expect(cacheGet).toHaveBeenCalledWith("stats:user-2:this-week");
    expect(statsService.totalTimeByType).toHaveBeenCalledWith("user-2", range);
    expect(statsService.activityChart).toHaveBeenCalledWith("user-2", "this-week", range);
    expect(statsService.topItems).toHaveBeenCalledWith("user-2", range);
    expect(statsService.averageSessionDurationByType).toHaveBeenCalledWith("user-2", range);
    expect(statsService.thisWeekPriorYearsInsight).toHaveBeenCalledWith("user-2");
    expect(response.render).toHaveBeenCalledWith(
      "stats",
      expect.objectContaining({
        periodRangeLabel: "17 Aug 2026 - 23 Aug 2026",
        chartJson: JSON.stringify({
          labels: ["Mon", "Tue"],
          values: [1, 3.3],
          series: [
            { key: "movie", label: "Movie", color: "#F59E0B", values: [1, 0] },
            { key: "tv", label: "TV", color: "#3B82F6", values: [0, 0] },
            { key: "game", label: "Game", color: "#22C55E", values: [0, 3.3] },
            { key: "boardgame", label: "Board game", color: "#F97316", values: [0, 0] },
            { key: "music", label: "Music", color: "#EC4899", values: [0, 0] },
          ],
        }),
        averageSessionDurationByType: expect.any(Array),
        weeklyNostalgia: expect.objectContaining({
          hasData: true,
        }),
      }),
    );
    expect(cacheSet).toHaveBeenCalledWith(
      "stats:user-2:this-week",
      expect.objectContaining({ period: "this-week", hasActivity: true }),
      900,
      "user-2",
    );
  });

  it("does not compute weekly nostalgia insight for non-weekly periods", async () => {
    const range = { from: new Date(2026, 7, 1), to: new Date(2026, 7, 31, 23, 59, 59, 999) };
    statsService.isValidPeriod.mockReturnValue(true);
    statsService.resolveDateRange.mockReturnValue(range);
    statsService.totalTimeByType.mockResolvedValue({ MOVIE: 120 });
    statsService.activityChart.mockResolvedValue({ labels: [], values: [], series: [] });
    statsService.topItems.mockResolvedValue([]);
    statsService.averageSessionDurationByType.mockResolvedValue([]);
    cacheGet.mockResolvedValue(null);

    await controller.stats("last-30-days", user, response as unknown as Response);

    expect(statsService.thisWeekPriorYearsInsight).not.toHaveBeenCalled();
    expect(response.render).toHaveBeenCalledWith(
      "stats",
      expect.objectContaining({
        weeklyNostalgia: expect.objectContaining({ hasData: false }),
      }),
    );
  });

  it("renders a user-scoped cache hit without aggregating", async () => {
    statsService.isValidPeriod.mockReturnValue(true);
    cacheGet.mockResolvedValue({ period: "last-week", hasActivity: false });

    await controller.stats("last-week", user, response as unknown as Response);

    expect(response.render).toHaveBeenCalledWith("stats", {
      title: "Stats",
      period: "last-week",
      hasActivity: false,
    });
    expect(statsService.totalTimeByType).not.toHaveBeenCalled();
  });

  it("renders the past-years deep-dive view with user-scoped cache keying", async () => {
    const currentWeekRange = {
      from: new Date("2026-08-17T00:00:00.000Z"),
      to: new Date("2026-08-23T23:59:59.999Z"),
    };
    statsService.thisWeekAcrossYears.mockResolvedValue({
      currentWeekRange,
      years: [
        {
          year: 2026,
          range: currentWeekRange,
          totalMinutes: 90,
          entryCount: 2,
          topItems: [],
          typeBreakdown: [{ key: "movie", label: "Movie", color: "#F59E0B", minutes: 90 }],
        },
      ],
    });
    cacheGet.mockResolvedValue(null);

    await controller.thisTimePastYears(user, response as unknown as Response);

    expect(cacheGet).toHaveBeenCalledWith("stats:user-2:this-time-past-years:2026-08-17");
    expect(response.render).toHaveBeenCalledWith(
      "stats-past-years",
      expect.objectContaining({
        currentWeekLabel: "17 Aug 2026 - 23 Aug 2026",
        hasYears: true,
      }),
    );
    expect(cacheSet).toHaveBeenCalledWith(
      "stats:user-2:this-time-past-years:2026-08-17",
      expect.any(Object),
      900,
      "user-2",
    );
  });

  it("serves deep-dive view from cache when present", async () => {
    statsService.thisWeekAcrossYears.mockResolvedValue({
      currentWeekRange: {
        from: new Date("2026-08-17T00:00:00.000Z"),
        to: new Date("2026-08-23T23:59:59.999Z"),
      },
      years: [],
    });
    cacheGet.mockResolvedValue({ hasYears: false, years: [] });

    await controller.thisTimePastYears(user, response as unknown as Response);

    expect(response.render).toHaveBeenCalledWith("stats-past-years", {
      title: "This time past years",
      hasYears: false,
      years: [],
    });
    expect(cacheSet).not.toHaveBeenCalled();
  });
});
