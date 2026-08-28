import { BadRequestException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import type { Request } from "express";
import type { LogService } from "../activity/log.service";
import type { MediaService } from "../media/media.service";
import type { StatsService } from "../stats/stats.service";
import { ApiV1MediaController } from "./api-v1-media.controller";
import { ApiV1StatsController } from "./api-v1-stats.controller";

describe("API v1 read controllers", () => {
  const request = { user: { userId: "user-1" } } as Request;

  it("maps user-scoped media search results", async () => {
    const searchForUser = jest.fn().mockResolvedValue([{
      id: "media-1",
      title: "Severance",
      type: MediaType.TV_SHOW,
      year: 2022,
      imageUrl: null,
      isSkeleton: false,
    }]);
    const controller = new ApiV1MediaController({ searchForUser } as unknown as MediaService);

    const result = await controller.search({ q: "Sever", type: MediaType.TV_SHOW }, request);

    expect(searchForUser).toHaveBeenCalledWith("user-1", "Sever", MediaType.TV_SHOW);
    expect(result.data[0]).toEqual(expect.objectContaining({ title: "Severance", imageUrl: undefined }));
    expect(result.data[0]).not.toHaveProperty("isSkeleton");
  });

  it("returns stats for an exact year and authenticated user", async () => {
    const statsService = {
      resolveDateRange: jest.fn(),
      totalTimeByType: jest.fn().mockResolvedValue({ MOVIE: 120 }),
      topItems: jest.fn().mockResolvedValue([]),
    };
    const logService = { findByUser: jest.fn().mockResolvedValue([{}, {}]) };
    const controller = new ApiV1StatsController(
      statsService as unknown as StatsService,
      logService as unknown as LogService,
    );

    await expect(controller.getStats({ year: 2026 }, request)).resolves.toEqual({
      totalTimeByType: { MOVIE: 120 },
      topItems: [],
      totalSessions: 2,
    });
    expect(statsService.totalTimeByType).toHaveBeenCalledWith("user-1", {
      from: new Date(2026, 0, 1),
      to: new Date(2027, 0, 1, 0, 0, 0, -1),
    });
  });

  it("rejects combined period and year filters", async () => {
    const controller = new ApiV1StatsController({} as StatsService, {} as LogService);
    await expect(controller.getStats({ period: "this-year", year: 2026 }, request)).rejects.toBeInstanceOf(BadRequestException);
  });
});
