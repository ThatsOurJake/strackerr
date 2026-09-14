import { LogSource, MediaType } from "@prisma/client";
import type { Request } from "express";
import { createLogEntry } from "../../test-utils/log-entry.factory";
import type { LogService } from "../activity/log.service";
import type { MediaService } from "../media/media.service";
import { ApiV1LogController } from "./api-v1-log.controller";

describe("ApiV1LogController", () => {
  const mediaService = {
    findByExternalId: jest.fn(),
    findByExternalAlias: jest.fn(),
    findOrCreateSkeleton: jest.fn(),
    findOrCreateEpisodeSkeleton: jest.fn(),
    addExternalAliases: jest.fn(),
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
        providerId: "329865",
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

  it("attaches external aliases during create when provided", async () => {
    mediaService.findByExternalId.mockResolvedValue(null);
    mediaService.findByExternalAlias.mockResolvedValue(null);
    mediaService.findOrCreateSkeleton.mockResolvedValue({
      id: "media-3",
      title: "Half-Life 2",
      type: MediaType.GAME,
    });
    mediaService.addExternalAliases.mockResolvedValue([]);
    logService.create.mockResolvedValue(
      createLogEntry("log-4", MediaType.GAME, {
        mediaItemId: "media-3",
        title: "Half-Life 2",
      }),
    );

    await controller.createGame(
      {
        title: "Half-Life 2",
        externalAliases: [
          { provider: "steam", id: "app:220" },
          { provider: "pcgamingwiki", id: "Half-Life_2" },
        ],
      },
      request,
    );

    expect(mediaService.addExternalAliases).toHaveBeenCalledWith(
      "media-3",
      [
        { providerNamespace: "steam", externalId: "app:220" },
        { providerNamespace: "pcgamingwiki", externalId: "Half-Life_2" },
      ],
    );
  });

  it("returns a conflict when provided aliases resolve to different media items", async () => {
    mediaService.findByExternalId.mockResolvedValue(null);
    mediaService.findByExternalAlias
      .mockResolvedValueOnce({ id: "media-1", title: "Portal", type: MediaType.GAME })
      .mockResolvedValueOnce({ id: "media-2", title: "Portal 2", type: MediaType.GAME });

    await expect(
      controller.createGame(
        {
          title: "Portal",
          externalAliases: [
            { provider: "steam", id: "app:400" },
            { provider: "steam", id: "app:620" },
          ],
        },
        request,
      ),
    ).rejects.toThrow("Conflicting external aliases resolve to different media items");
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
      controller.findAll(undefined, undefined, undefined, "2", "25", request),
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
