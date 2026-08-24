import { MediaType } from "@prisma/client";
import { createLogEntry } from "../../test-utils/log-entry.factory";
import type { LogService } from "../activity/log.service";
import { DateRange, StatsPeriodSlug, StatsService } from "./stats.service";

describe("StatsService", () => {
  let findByUser: jest.Mock;
  let service: StatsService;

  beforeEach(() => {
    findByUser = jest.fn().mockResolvedValue([]);
    service = new StatsService({ findByUser } as unknown as LogService);
  });

  describe("resolveDateRange", () => {
    const now = new Date(2026, 7, 19, 12, 30);
    const cases: Array<{
      slug: StatsPeriodSlug;
      from: Date | null;
      to: Date | null;
    }> = [
        { slug: "this-week", from: new Date(2026, 7, 17), to: new Date(2026, 7, 19, 23, 59, 59, 999) },
        { slug: "last-week", from: new Date(2026, 7, 10), to: new Date(2026, 7, 16, 23, 59, 59, 999) },
        { slug: "last-30-days", from: new Date(2026, 6, 21), to: new Date(2026, 7, 19, 23, 59, 59, 999) },
        { slug: "last-3-months", from: new Date(2026, 4, 19), to: new Date(2026, 7, 19, 23, 59, 59, 999) },
        { slug: "last-6-months", from: new Date(2026, 1, 19), to: new Date(2026, 7, 19, 23, 59, 59, 999) },
        { slug: "this-year", from: new Date(2026, 0, 1), to: new Date(2026, 7, 19, 23, 59, 59, 999) },
        { slug: "last-year", from: new Date(2025, 0, 1), to: new Date(2025, 11, 31, 23, 59, 59, 999) },
        { slug: "all-time", from: null, to: null },
      ];

    it.each(cases)("resolves $slug boundaries", ({ slug, from, to }) => {
      const range = service.resolveDateRange(slug, now);

      if (!from || !to) {
        expect(range).toBeNull();
        return;
      }

      expect(range).toEqual({ from, to });
    });
  });

  it("scopes aggregation queries to the requested user and date range", async () => {
    const range = { from: new Date(2026, 7, 17), to: new Date(2026, 7, 19) };

    await service.totalTimeByType("user-2", range);

    expect(findByUser).toHaveBeenCalledWith("user-2", {
      dateFrom: range.from,
      dateTo: range.to,
    });
  });

  it("totals time by media type", async () => {
    findByUser.mockResolvedValue([
      createLogEntry("movie-1", MediaType.MOVIE, { loggedAt: new Date(2026, 7, 18), duration: 90 }),
      createLogEntry("movie-2", MediaType.MOVIE, { loggedAt: new Date(2026, 7, 19), duration: 30 }),
      createLogEntry("game", MediaType.GAME, { loggedAt: new Date(2026, 7, 19), duration: 60 }),
    ]);

    await expect(service.totalTimeByType("user-1", null)).resolves.toEqual({
      MOVIE: 120,
      GAME: 60,
    });
  });

  it("orders and limits top items by total time", async () => {
    findByUser.mockResolvedValue([
      createLogEntry("movie-1", MediaType.MOVIE, { loggedAt: new Date(2026, 7, 18), duration: 50, mediaItemId: "movie" }),
      createLogEntry("movie-2", MediaType.MOVIE, { loggedAt: new Date(2026, 7, 19), duration: 60, mediaItemId: "movie" }),
      createLogEntry("game", MediaType.GAME, { loggedAt: new Date(2026, 7, 19), duration: 100, mediaItemId: "game" }),
    ]);

    const items = await service.topItems("user-1", null, 1);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ totalMinutes: 110, mediaItem: { id: "movie" } });
  });

  describe("activityChart", () => {
    const range = (from: Date, to: Date): DateRange => ({ from, to });

    it("buckets weekly periods by day", async () => {
      findByUser.mockResolvedValue([
        createLogEntry("monday", MediaType.MOVIE, { loggedAt: new Date(2026, 7, 17), duration: 30 }),
        createLogEntry("sunday", MediaType.GAME, { loggedAt: new Date(2026, 7, 23), duration: 60 }),
      ]);

      const chart = await service.activityChart("user-1", "this-week", range(new Date(2026, 7, 17), new Date(2026, 7, 23)));

      expect(chart.labels).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
      expect(chart.values).toEqual([30, 0, 0, 0, 0, 0, 60]);
    });

    it("buckets multi-month periods by week", async () => {
      findByUser.mockResolvedValue([
        createLogEntry("week-1", MediaType.MOVIE, { loggedAt: new Date(2026, 4, 20), duration: 20 }),
        createLogEntry("week-2", MediaType.GAME, { loggedAt: new Date(2026, 4, 27), duration: 40 }),
      ]);

      const chart = await service.activityChart("user-1", "last-3-months", range(new Date(2026, 4, 19), new Date(2026, 5, 1)));

      expect(chart.labels).toEqual(["5/18", "5/25", "6/1"]);
      expect(chart.values).toEqual([20, 40, 0]);
    });

    it("buckets yearly periods by month", async () => {
      findByUser.mockResolvedValue([
        createLogEntry("jan", MediaType.MOVIE, { loggedAt: new Date(2026, 0, 5), duration: 20 }),
        createLogEntry("aug", MediaType.GAME, { loggedAt: new Date(2026, 7, 19), duration: 40 }),
      ]);

      const chart = await service.activityChart("user-1", "this-year", range(new Date(2026, 0, 1), new Date(2026, 11, 31)));

      expect(chart.labels).toHaveLength(12);
      expect(chart.values[0]).toBe(20);
      expect(chart.values[7]).toBe(40);
    });

    it("buckets all-time activity by year", async () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 7, 19));
      findByUser.mockResolvedValue([
        createLogEntry("old", MediaType.MOVIE, { loggedAt: new Date(2024, 1, 1), duration: 20 }),
        createLogEntry("new", MediaType.GAME, { loggedAt: new Date(2026, 7, 19), duration: 40 }),
      ]);

      const chart = await service.activityChart("user-1", "all-time", null);

      expect(chart).toEqual({ labels: ["2024", "2025", "2026"], values: [20, 0, 40] });
      jest.useRealTimers();
    });
  });
});
