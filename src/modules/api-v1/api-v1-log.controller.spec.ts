import { LogSource, MediaType } from "@prisma/client";
import type { Request } from "express";
import { createLogEntry } from "../../test-utils/log-entry.factory";
import type { LogService } from "../activity/log.service";
import type { MediaService } from "../media/media.service";
import { ApiV1LogController } from "./api-v1-log.controller";

describe("ApiV1LogController", () => {
  const mediaService = {
    findByExternalId: jest.fn(),
    findOrCreateSkeleton: jest.fn(),
    findOrCreateEpisodeSkeleton: jest.fn(),
  };
  const logService = {
    create: jest.fn(),
    findByUserPaginated: jest.fn(),
  };
  const controller = new ApiV1LogController(
    mediaService as unknown as MediaService,
    logService as unknown as LogService,
  );
  const request = { user: { userId: "user-1" } } as Request;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a skeleton and API-sourced log for an unknown title", async () => {
    mediaService.findOrCreateSkeleton.mockResolvedValue({
      id: "media-1",
      title: "Arrival",
      type: MediaType.MOVIE,
    });
    logService.create.mockResolvedValue(
      createLogEntry("log-1", MediaType.MOVIE, {
        mediaItemId: "media-1",
        title: "Arrival",
        loggedAt: new Date("2026-08-25T20:00:00.000Z"),
        duration: 116,
      }),
    );

    const result = await controller.createMovie(
      {
        title: "Arrival",
        loggedAt: "2026-08-25T20:00:00.000Z",
        duration: 116,
      },
      request,
    );

    expect(mediaService.findOrCreateSkeleton).toHaveBeenCalledWith(
      "Arrival",
      MediaType.MOVIE,
      "user-1",
    );
    expect(logService.create).toHaveBeenCalledWith(
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
      id: "log-1",
      title: "Arrival",
      type: MediaType.MOVIE,
      status: "created",
    });
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("mediaItemId");
    expect(result).not.toHaveProperty("platform");
    expect(result).not.toHaveProperty("players");
    expect(result).not.toHaveProperty("won");
    expect(result).not.toHaveProperty("season");
    expect(result).not.toHaveProperty("episode");
  });

  it("uses an existing provider item without creating a skeleton", async () => {
    mediaService.findByExternalId.mockResolvedValue({
      id: "media-2",
      title: "Arrival",
      type: MediaType.MOVIE,
    });
    logService.create.mockResolvedValue(
      createLogEntry("log-2", MediaType.MOVIE, {
        mediaItemId: "media-2",
        title: "Arrival",
      }),
    );

    await controller.createMovie(
      {
        title: "Arrival",
        loggedAt: "2026-08-25T20:00:00.000Z",
        provider: "tmdb",
        externalId: "329865",
      },
      request,
    );

    expect(mediaService.findOrCreateSkeleton).not.toHaveBeenCalled();
    expect(logService.create).toHaveBeenCalledWith(
      expect.objectContaining({ mediaItemId: "media-2" }),
      "user-1",
      LogSource.API,
    );
  });

  it("creates a missing show and episode from the TV-specific payload", async () => {
    mediaService.findOrCreateSkeleton.mockResolvedValue({
      id: "show-1",
      title: "Severance",
      type: MediaType.TV_SHOW,
    });
    mediaService.findOrCreateEpisodeSkeleton.mockResolvedValue({
      id: "episode-1",
      title: "Severance S1E3",
      type: MediaType.TV_EPISODE,
    });
    logService.create.mockResolvedValue(
      createLogEntry("log-3", MediaType.TV_EPISODE, {
        mediaItemId: "episode-1",
        title: "Severance S1E3",
        parentTitle: "Severance",
        seasonNumber: 1,
        episodeNumber: 3,
      }),
    );

    const result = await controller.createTvEpisode(
      {
        show: "Severance",
        season: 1,
        episode: 3,
      },
      request,
    );

    expect(mediaService.findOrCreateSkeleton).toHaveBeenCalledWith(
      "Severance",
      MediaType.TV_SHOW,
      "user-1",
    );
    expect(mediaService.findOrCreateEpisodeSkeleton).toHaveBeenCalledWith(
      "show-1",
      "Severance",
      1,
      3,
      "user-1",
    );
    expect(result).toMatchObject({
      title: "Severance",
      type: MediaType.TV_EPISODE,
      season: 1,
      episode: 3,
      status: "created",
    });
    expect(result).not.toHaveProperty("platform");
    expect(result).not.toHaveProperty("players");
    expect(result).not.toHaveProperty("won");
  });

  it("scopes paginated retrieval to the authenticated user", async () => {
    logService.findByUserPaginated.mockResolvedValue({ data: [], total: 0 });

    await expect(
      controller.findAll({ page: 2, limit: 25 }, request),
    ).resolves.toEqual({
      data: [],
      total: 0,
      page: 2,
    });
    expect(logService.findByUserPaginated).toHaveBeenCalledWith(
      "user-1",
      {
        type: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      },
      2,
      25,
    );
  });
});
