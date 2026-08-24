import type { Response } from "express";
import type { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import type {
  LogDayGroup,
  LogService,
} from "../../modules/activity/log.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { HistoryController } from "./history.controller";

const user: AuthenticatedUser = {
  userId: "user-2",
  username: "tester",
  isAdmin: false,
};

describe("HistoryController", () => {
  let findByUser: jest.Mock;
  let groupByDay: jest.Mock;
  let cacheGet: jest.Mock;
  let cacheSet: jest.Mock;
  let controller: HistoryController;
  let response: { render: jest.Mock };

  beforeEach(() => {
    findByUser = jest.fn();
    groupByDay = jest.fn();
    cacheGet = jest.fn();
    cacheSet = jest.fn();
    controller = new HistoryController(
      { findByUser, groupByDay } as unknown as LogService,
      { get: cacheGet, set: cacheSet } as unknown as AppCacheService,
    );
    response = { render: jest.fn() };
  });

  it("renders 30 days on page one and exposes the next page", async () => {
    const groups: LogDayGroup[] = Array.from({ length: 31 }, (_, index) => ({
      date: `2026-07-${String(31 - index).padStart(2, "0")}`,
      entries: [],
    }));
    cacheGet.mockResolvedValue(null);
    findByUser.mockResolvedValue([]);
    groupByDay.mockReturnValue(groups);

    await controller.history(undefined, user, response as unknown as Response);

    expect(cacheGet).toHaveBeenCalledWith("history:user-2:1");
    expect(findByUser).toHaveBeenCalledWith("user-2");
    expect(response.render).toHaveBeenCalledWith(
      "history",
      expect.objectContaining({
        isInitial: true,
        hasMore: true,
        nextPage: 2,
        days: expect.any(Array),
      }),
    );
    expect(response.render.mock.calls[0][1].days).toHaveLength(30);
    expect(cacheSet).toHaveBeenCalledWith(
      "history:user-2:1",
      expect.objectContaining({ hasMore: true, nextPage: 2 }),
      300,
      "user-2",
    );
  });

  it("renders a cached partial without querying logs", async () => {
    const cached = { days: [], hasMore: false, nextPage: 3 };
    cacheGet.mockResolvedValue(cached);

    await controller.partial("2", user, response as unknown as Response);

    expect(cacheGet).toHaveBeenCalledWith("history:user-2:2");
    expect(response.render).toHaveBeenCalledWith("partials/history-days", {
      layout: false,
      ...cached,
    });
    expect(findByUser).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
  });
});
