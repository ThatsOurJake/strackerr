import type { Response } from "express";
import type { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import type { LogService } from "../../modules/activity/log.service";
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
  let response: { redirect: jest.Mock; render: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 15, 12));
    findByUser = jest.fn().mockResolvedValue([]);
    groupByDay = jest.fn().mockReturnValue([]);
    cacheGet = jest.fn().mockResolvedValue(null);
    cacheSet = jest.fn();
    controller = new HistoryController(
      { findByUser, groupByDay } as unknown as LogService,
      { get: cacheGet, set: cacheSet } as unknown as AppCacheService,
    );
    response = { redirect: jest.fn(), render: jest.fn() };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("redirects an omitted or malformed month to the current month", async () => {
    await controller.history(undefined, user, response as unknown as Response);
    await controller.history("2026-13", user, response as unknown as Response);
    await controller.history("0000-01", user, response as unknown as Response);

    expect(response.redirect).toHaveBeenCalledTimes(3);
    expect(response.redirect).toHaveBeenCalledWith("/history?month=2026-09");
    expect(findByUser).not.toHaveBeenCalled();
  });

  it("queries only the selected month for the signed-in user", async () => {
    await controller.history("2026-08", user, response as unknown as Response);

    expect(cacheGet).toHaveBeenCalledWith("history:user-2:2026-08");
    expect(findByUser).toHaveBeenCalledWith("user-2", {
      dateFrom: new Date(2026, 7, 1),
      dateBefore: new Date(2026, 8, 1),
    });
    expect(response.render).toHaveBeenCalledWith(
      "history",
      expect.objectContaining({
        month: "2026-08",
        monthHeading: "August 2026",
        previousMonth: "2026-07",
        nextMonth: "2026-09",
      }),
    );
  });

  it("navigates across a year boundary", async () => {
    await controller.history("2026-01", user, response as unknown as Response);

    expect(response.render).toHaveBeenCalledWith(
      "history",
      expect.objectContaining({
        previousMonth: "2025-12",
        nextMonth: "2026-02",
      }),
    );
  });

  it("prevents future navigation and omits next navigation for the current month", async () => {
    await controller.history("2026-10", user, response as unknown as Response);
    expect(response.redirect).toHaveBeenCalledWith("/history?month=2026-09");

    await controller.history("2026-09", user, response as unknown as Response);
    expect(response.render).toHaveBeenCalledWith(
      "history",
      expect.objectContaining({ nextMonth: undefined }),
    );
  });

  it("renders a cached month without querying logs", async () => {
    const cached = {
      days: [],
      month: "2026-08",
      monthHeading: "August 2026",
      previousMonth: "2026-07",
      nextMonth: "2026-09",
    };
    cacheGet.mockResolvedValue(cached);

    await controller.history("2026-08", user, response as unknown as Response);

    expect(response.render).toHaveBeenCalledWith("history", {
      title: "History",
      ...cached,
    });
    expect(findByUser).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
  });
});
