import { LogSource, MediaType } from "@prisma/client";
import type { Request } from "express";
import { createActivityEntry } from "../../test-utils/activity-entry.factory";
import type { ActivityService } from "../activity/activity.service";
import type { MediaService } from "../media/media.service";
import { ApiV1ActivityController } from "./api-v1-activity.controller";

describe("ApiV1ActivityController", () => {
  const mediaService = {
    findById: jest.fn(),
    hasUserAccess: jest.fn(),
    findOrCreateEpisodeSkeleton: jest.fn(),
  };
  const activityService = {
    create: jest.fn(),
    findByUserAndMediaItemPaginated: jest.fn(),
  };
  const controller = new ApiV1ActivityController(
    mediaService as unknown as MediaService,
    activityService as unknown as ActivityService,
  );
  const request = { user: { userId: "user-1" } } as Request;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs movie activity by media item id", async () => {
    mediaService.findById.mockResolvedValue({
      id: "media-1",
      title: "Arrival",
      type: MediaType.MOVIE,
    });
    mediaService.hasUserAccess.mockResolvedValue(true);
    activityService.create.mockResolvedValue(
      createActivityEntry("log-1", MediaType.MOVIE, {
        mediaItemId: "media-1",
        title: "Arrival",
        loggedAt: new Date("2026-08-25T20:00:00.000Z"),
        duration: 116,
      }),
    );

    const result = await controller.createMovie(
      {
        mediaItemId: "media-1",
        loggedAt: "2026-08-25T20:00:00.000Z",
        duration: 116,
      },
      request,
    );

    expect(activityService.create).toHaveBeenCalledWith(
      {
        mediaItemId: "media-1",
        loggedAt: new Date("2026-08-25T20:00:00.000Z"),
        duration: 116,
        platform: undefined,
        playerCount: undefined,
        won: undefined,
      },
      "user-1",
      LogSource.API,
    );
    expect(result).toMatchObject({
      data: {
        id: "log-1",
        title: "Arrival",
        type: MediaType.MOVIE,
        status: "created",
      },
    });
    expect(result.data).not.toHaveProperty("userId");
    expect(result.data).not.toHaveProperty("mediaItemId");
    expect(result.data).not.toHaveProperty("platform");
    expect(result.data).not.toHaveProperty("players");
    expect(result.data).not.toHaveProperty("won");
    expect(result.data).not.toHaveProperty("season");
    expect(result.data).not.toHaveProperty("episode");
  });

  it("rejects route and media item type mismatches", async () => {
    mediaService.findById.mockResolvedValue({
      id: "media-9",
      title: "Severance",
      type: MediaType.TV_SHOW,
    });
    mediaService.hasUserAccess.mockResolvedValue(true);

    await expect(
      controller.createMovie(
        {
          mediaItemId: "media-9",
        },
        request,
      ),
    ).rejects.toThrow("Activity route does not support media type TV_SHOW");
  });

  it("creates a missing episode when the target item is a TV show", async () => {
    mediaService.findById.mockResolvedValue({
      id: "show-1",
      title: "Severance",
      type: MediaType.TV_SHOW,
    });
    mediaService.hasUserAccess.mockResolvedValue(true);
    mediaService.findOrCreateEpisodeSkeleton.mockResolvedValue({
      id: "episode-1",
      title: "Severance S1E3",
      type: MediaType.TV_EPISODE,
    });
    activityService.create.mockResolvedValue(
      createActivityEntry("log-3", MediaType.TV_EPISODE, {
        mediaItemId: "episode-1",
        title: "Severance S1E3",
        parentTitle: "Severance",
        seasonNumber: 1,
        episodeNumber: 3,
      }),
    );

    const result = await controller.createTvEpisode(
      {
        mediaItemId: "show-1",
        season: 1,
        episode: 3,
      },
      request,
    );

    expect(mediaService.findOrCreateEpisodeSkeleton).toHaveBeenCalledWith(
      "show-1",
      "Severance",
      1,
      3,
      "user-1",
    );
    expect(result).toMatchObject({
      data: {
        title: "Severance",
        type: MediaType.TV_EPISODE,
        season: 1,
        episode: 3,
        status: "created",
      },
    });
    expect(result.data).not.toHaveProperty("platform");
    expect(result.data).not.toHaveProperty("players");
    expect(result.data).not.toHaveProperty("won");
  });

  it("scopes paginated retrieval to the authenticated user and media item", async () => {
    mediaService.findById.mockResolvedValue({
      id: "show-1",
      title: "Severance",
      type: MediaType.TV_SHOW,
    });
    mediaService.hasUserAccess.mockResolvedValue(true);
    activityService.findByUserAndMediaItemPaginated.mockResolvedValue({ data: [], total: 0 });

    await expect(
      controller.findAll("show-1", undefined, undefined, "2", "25", request),
    ).resolves.toEqual({
      data: [],
      meta: {
        total: 0,
        page: 2,
        limit: 25,
      },
    });
    expect(activityService.findByUserAndMediaItemPaginated).toHaveBeenCalledWith(
      "user-1",
      "show-1",
      true,
      {
        dateFrom: undefined,
        dateTo: undefined,
      },
      2,
      25,
    );
  });
});
