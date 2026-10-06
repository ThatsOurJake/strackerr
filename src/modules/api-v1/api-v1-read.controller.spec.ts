import { BadRequestException, ConflictException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import type { Request } from "express";
import type { ActivityService } from "../activity/activity.service";
import type { IdentificationService } from "../media/identification.service";
import type { MediaService } from "../media/media.service";
import type { StatsService } from "../stats/stats.service";
import { ApiV1MediaController } from "./api-v1-media.controller";
import { ApiV1StatsController } from "./api-v1-stats.controller";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

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
    const controller = new ApiV1MediaController(
      { searchForUser, listTagsForItem: jest.fn().mockResolvedValue([]) } as unknown as MediaService,
      {} as IdentificationService,
    );

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
      listTagsForItem: jest.fn().mockResolvedValue([{
        id: "tag-1",
        label: "Puzzle",
      }]),
    } as unknown as MediaService, {} as IdentificationService);

    const response = await controller.resolve(
      { provider: "steam", id: "app:620" },
      request,
    );

    expect(resolveByExternalLookup).toHaveBeenCalledWith("user-1", "steam", "app:620");
    expect(response.data).toEqual(expect.objectContaining({ id: "media-7", title: "Portal 2", tags: ["Puzzle"] }));
  });

  it("rejects mixed resolve lookup modes", async () => {
    const controller = new ApiV1MediaController(
      {} as MediaService,
      {} as IdentificationService,
    );

    await expect(
      controller.resolve(
        {
          mediaItemId: "media-1",
          title: "Portal 2",
        },
        request,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("creates minimal media and attaches external aliases", async () => {
    const createSkeletonWithExternalAliases = jest.fn().mockResolvedValue({
      id: "media-8",
      title: "Hades",
      type: MediaType.GAME,
      year: null,
      imageUrl: null,
    });
    const controller = new ApiV1MediaController(
      {
        createSkeletonWithExternalAliases,
        listTagsForItem: jest.fn().mockResolvedValue([]),
      } as unknown as MediaService,
      {} as IdentificationService,
    );

    const response = await controller.create(
      {
        type: MediaType.GAME,
        title: "Hades",
        description: "Roguelike action",
        externalAliases: [{ provider: "steam", id: "app:1145360" }],
      },
      request,
    );

    expect(createSkeletonWithExternalAliases).toHaveBeenCalledWith({
      title: "Hades",
      description: "Roguelike action",
      type: MediaType.GAME,
      userId: "user-1",
      externalAliases: [{ providerNamespace: "steam", externalId: "app:1145360" }],
    });
    expect(response).toEqual({
      data: {
        id: "media-8",
        title: "Hades",
        type: MediaType.GAME,
        year: undefined,
        imageUrl: undefined,
        tags: [],
      },
    });
  });

  it("returns a clear 409 error when an external alias already exists", async () => {
    const createSkeletonWithExternalAliases = jest.fn().mockRejectedValue(
      new ConflictException("Alias is already assigned to another media item"),
    );
    const controller = new ApiV1MediaController(
      {
        createSkeletonWithExternalAliases,
        listTagsForItem: jest.fn().mockResolvedValue([]),
      } as unknown as MediaService,
      {} as IdentificationService,
    );

    await expect(
      controller.create(
        {
          type: MediaType.GAME,
          title: "Hades",
          externalAliases: [{ provider: "steam", id: "app:1145360" }],
        },
        request,
      ),
    ).rejects.toThrow(
      "External alias conflict: one or more aliases are already assigned to existing media items. No media item was created.",
    );
  });

  it("identifies a media item through configured provider alias", async () => {
    const identifyFromConfiguredAlias = jest.fn().mockResolvedValue({
      id: "media-8",
      title: "Hades",
      type: MediaType.GAME,
      year: 2020,
      imageUrl: null,
    });
    const controller = new ApiV1MediaController(
      { listTagsForItem: jest.fn().mockResolvedValue([]) } as unknown as MediaService,
      { identifyFromConfiguredAlias } as unknown as IdentificationService,
    );

    const response = await controller.identify("media-8", {}, request);

    expect(identifyFromConfiguredAlias).toHaveBeenCalledWith("media-8", "user-1", undefined);
    expect(response.data.id).toBe("media-8");
  });

  it("lists aliases for accessible media", async () => {
    const controller = new ApiV1MediaController({
      findById: jest.fn().mockResolvedValue({ id: "media-7" }),
      hasUserAccess: jest.fn().mockResolvedValue(true),
      listExternalAliases: jest.fn().mockResolvedValue([
        { providerNamespace: "steam", externalId: "app:620" },
      ]),
    } as unknown as MediaService, {} as IdentificationService);

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
    const activityService = { findByUser: jest.fn().mockResolvedValue([{}, {}]) };
    const controller = new ApiV1StatsController(
      statsService as unknown as StatsService,
      activityService as unknown as ActivityService,
    );

    await expect(controller.getStats(undefined, "2026", request)).resolves.toEqual({
      data: {
        totalTimeByType: { MOVIE: 120 },
        topItems: [],
        totalSessions: 2,
      },
    });
    expect(statsService.totalTimeByType).toHaveBeenCalledWith("user-1", {
      from: new Date(2026, 0, 1),
      to: new Date(2027, 0, 1, 0, 0, 0, -1),
    });
  });

  it("rejects combined period and year filters", async () => {
    const controller = new ApiV1StatsController({} as StatsService, {} as ActivityService);
    await expect(controller.getStats("this-year", "2026", request)).rejects.toBeInstanceOf(BadRequestException);
  });
});
