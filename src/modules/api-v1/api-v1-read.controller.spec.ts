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

    const result = await controller.search("Sever", MediaType.TV_SHOW, request);

    expect(searchForUser).toHaveBeenCalledWith("user-1", "Sever", MediaType.TV_SHOW);
    expect(result.data[0]).toEqual(expect.objectContaining({ title: "Severance", imageUrl: undefined }));
    expect(result.data[0]).not.toHaveProperty("isSkeleton");
  });

  it("resolves media by provider and external alias", async () => {
    const resolveByExternalLookup = jest.fn().mockResolvedValue({
      id: "media-7",
      title: "Portal 2",
      type: MediaType.GAME,
      year: 2011,
      imageUrl: null,
    });
    const controller = new ApiV1MediaController({
      resolveByExternalLookup,
      hasUserAccess: jest.fn().mockResolvedValue(true),
    } as unknown as MediaService);

    const response = await controller.resolve(
      "steam",
      "app:620",
      request,
    );

    expect(resolveByExternalLookup).toHaveBeenCalledWith("steam", "app:620");
    expect(response.data).toEqual(expect.objectContaining({ id: "media-7", title: "Portal 2" }));
  });

  it("lists aliases for accessible media", async () => {
    const controller = new ApiV1MediaController({
      findById: jest.fn().mockResolvedValue({ id: "media-7" }),
      hasUserAccess: jest.fn().mockResolvedValue(true),
      listExternalAliases: jest.fn().mockResolvedValue([
        { providerNamespace: "steam", externalId: "app:620" },
      ]),
    } as unknown as MediaService);

    const response = await controller.listExternalAliases("media-7", request);

    expect(response).toEqual({
      data: [{ provider: "steam", id: "app:620" }],
    });
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

    await expect(controller.getStats(undefined, "2026", request)).resolves.toEqual({
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
    await expect(controller.getStats("this-year", "2026", request)).rejects.toBeInstanceOf(BadRequestException);
  });
});
