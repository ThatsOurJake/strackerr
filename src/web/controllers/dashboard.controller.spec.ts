import { MediaType } from "@prisma/client";
import type { Response } from "express";
import type { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import type {
  LogService,
} from "../../modules/activity/log.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { createLogEntry } from "../../test-utils/log-entry.factory";
import { DashboardController } from "./dashboard.controller";

const user: AuthenticatedUser = {
  userId: "user-2",
  username: "tester",
  isAdmin: false,
};

describe("DashboardController", () => {
  let findByUser: jest.Mock;
  let groupByDay: jest.Mock;
  let cacheGet: jest.Mock;
  let cacheSet: jest.Mock;
  let controller: DashboardController;
  let response: { render: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 24, 17, 5));
    findByUser = jest.fn();
    groupByDay = jest.fn();
    cacheGet = jest.fn();
    cacheSet = jest.fn();
    controller = new DashboardController(
      { findByUser, groupByDay } as unknown as LogService,
      { get: cacheGet, set: cacheSet } as unknown as AppCacheService,
    );
    response = { render: jest.fn() };
  });

  afterEach(() => jest.useRealTimers());

  it("queries the authenticated user's last seven local calendar days and totals each type", async () => {
    const entries = [
      createLogEntry("movie-1", MediaType.MOVIE, { duration: 90, userId: user.userId }),
      createLogEntry("movie-2", MediaType.MOVIE, { duration: 30, userId: user.userId }),
      createLogEntry("game", MediaType.GAME, { duration: 75, userId: user.userId }),
    ];
    cacheGet.mockResolvedValue(null);
    findByUser.mockResolvedValue(entries);
    groupByDay.mockReturnValue([]);

    await controller.dashboard(user, response as unknown as Response);

    expect(cacheGet).toHaveBeenCalledWith("dashboard:user-2");
    expect(findByUser).toHaveBeenCalledWith("user-2", {
      dateFrom: new Date(2026, 7, 18),
    });
    expect(response.render).toHaveBeenCalledWith(
      "dashboard",
      expect.objectContaining({
        sessionCount: 3,
        hasActivity: true,
        stats: expect.arrayContaining([
          expect.objectContaining({ label: "Movie", duration: "2h" }),
          expect.objectContaining({ label: "Game", duration: "1h 15m" }),
        ]),
      }),
    );
    expect(cacheSet).toHaveBeenCalledWith(
      "dashboard:user-2",
      expect.objectContaining({ sessionCount: 3 }),
      300,
      "user-2",
    );
  });

  it("renders a user-scoped cache hit without querying logs", async () => {
    cacheGet.mockResolvedValue({ hasActivity: false, days: [] });

    await controller.dashboard(user, response as unknown as Response);

    expect(response.render).toHaveBeenCalledWith("dashboard", {
      title: "Dashboard",
      hasActivity: false,
      days: [],
    });
    expect(findByUser).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
  });
});
