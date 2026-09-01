import { MediaType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { MetadataService } from "../metadata/metadata.service";
import { IMetadataProvider } from "../metadata/metadata-provider.interface";
import { EpisodeSyncService } from "./episode-sync.service";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

describe("EpisodeSyncService", () => {
  let provider: IMetadataProvider;
  let prisma: PrismaService;
  let service: EpisodeSyncService;
  let upsert: jest.Mock;
  let findMany: jest.Mock;
  let updateMany: jest.Mock;
  let deleteMediaItem: jest.Mock;

  beforeEach(() => {
    provider = {
      name: "tmdb",
      search: jest.fn(),
      getById: jest.fn().mockResolvedValue({
        externalId: "tv:1",
        title: "Show",
        type: MediaType.TV_SHOW,
        seasonCount: 1,
      }),
      getEpisodes: jest.fn(),
    };
    upsert = jest.fn();
    findMany = jest.fn().mockResolvedValue([]);
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    deleteMediaItem = jest.fn().mockResolvedValue({});
    prisma = {
      mediaItem: { upsert, findMany, delete: deleteMediaItem },
      logEntry: { updateMany },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as unknown as PrismaService;
    const metadata = {
      getProvider: jest.fn().mockReturnValue(provider),
    } as unknown as MetadataService;
    service = new EpisodeSyncService(prisma, metadata);
  });

  it("upserts episodes without caching episode artwork", async () => {
    jest.spyOn(provider, "getEpisodes").mockResolvedValue([
      {
        seasonNumber: 1,
        episodeNumber: 1,
        title: "Pilot",
        imageSourceUrl: "https://image/pilot",
      },
    ]);
    upsert
      .mockResolvedValueOnce({
        id: "episode-1",
        seasonNumber: 1,
        episodeNumber: 1,
      })
      .mockResolvedValueOnce({
        id: "episode-1",
        seasonNumber: 1,
        episodeNumber: 1,
      });

    await service.syncShow("show-1", "tmdb", "tv:1", "key");
    await service.syncShow("show-1", "tmdb", "tv:1", "key");

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          parentId_seasonNumber_episodeNumber: {
            parentId: "show-1",
            seasonNumber: 1,
            episodeNumber: 1,
          },
        },
      }),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ imageSourceUrl: null }),
        update: expect.objectContaining({ imageSourceUrl: null }),
      }),
    );
  });

  it("continues with later seasons after a provider error", async () => {
    jest.spyOn(provider, "getById").mockResolvedValue({
      externalId: "tv:1",
      title: "Show",
      type: MediaType.TV_SHOW,
      seasonCount: 2,
    });
    jest
      .spyOn(provider, "getEpisodes")
      .mockRejectedValueOnce(new Error("rate limited"))
      .mockResolvedValueOnce([
        { seasonNumber: 2, episodeNumber: 1, title: "Return" },
      ]);
    upsert.mockResolvedValue({
      id: "episode-2",
      seasonNumber: 2,
      episodeNumber: 1,
    });

    await expect(
      service.syncShow("show-1", "tmdb", "tv:1", "key"),
    ).resolves.toBeUndefined();

    expect(provider.getEpisodes).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("relinks legacy skeleton logs and deletes the skeleton", async () => {
    jest
      .spyOn(provider, "getEpisodes")
      .mockResolvedValue([
        { seasonNumber: 1, episodeNumber: 2, title: "Second" },
      ]);
    upsert.mockResolvedValue({
      id: "canonical-episode",
      seasonNumber: 1,
      episodeNumber: 2,
    });
    findMany.mockResolvedValue([
      { id: "skeleton-episode", seasonNumber: 1, episodeNumber: 2 },
    ]);

    await service.syncShow("show-1", "tmdb", "tv:1");

    expect(updateMany).toHaveBeenCalledWith({
      where: { mediaItemId: "skeleton-episode" },
      data: { mediaItemId: "canonical-episode" },
    });
    expect(deleteMediaItem).toHaveBeenCalledWith({
      where: { id: "skeleton-episode" },
    });
  });
});
