import { MediaType } from "@prisma/client";
import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { Events } from "../../infrastructure/events/event-names";
import { SearchService } from "./search.service";

interface SearchPrismaMock {
  mediaItem: {
    findMany: jest.Mock;
  };
}

const createPrismaMock = (): SearchPrismaMock => ({
  mediaItem: {
    findMany: jest.fn(),
  },
});

const mediaItems = [
  {
    id: "severance",
    title: "Severance",
    type: MediaType.TV_SHOW,
    aliases: [{ alias: "severance tv" }],
    parentId: null,
    seasonNumber: null,
    episodeNumber: null,
    parent: null,
  },
  {
    id: "office",
    title: "The Office",
    type: MediaType.TV_SHOW,
    aliases: [{ alias: "office" }],
    parentId: null,
    seasonNumber: null,
    episodeNumber: null,
    parent: null,
  },
  {
    id: "seven",
    title: "Seven",
    type: MediaType.MOVIE,
    aliases: [],
    parentId: null,
    seasonNumber: null,
    episodeNumber: null,
    parent: null,
  },
];

describe("SearchService", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it("builds a user-scoped index from logged and owned media", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue(mediaItems);
    const service = new SearchService(prisma as unknown as PrismaService);

    await service.getIndex("user-1");

    expect(prisma.mediaItem.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { createdByUserId: "user-1" },
          { logEntries: { some: { userId: "user-1" } } },
          {
            type: MediaType.TV_SHOW,
            episodes: { some: { logEntries: { some: { userId: "user-1" } } } },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        aliases: { select: { alias: true } },
        parentId: true,
        seasonNumber: true,
        episodeNumber: true,
        parent: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });
  });

  it("returns only results supplied by the requested user's index", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue([mediaItems[0]]);
    const service = new SearchService(prisma as unknown as PrismaService);

    const results = await service.search("user-1", "Severance");

    expect(results).toEqual([
      {
        id: "severance",
        title: "Severance",
        type: MediaType.TV_SHOW,
        path: "tv",
        label: "TV show",
        group: "TV",
      },
    ]);
    expect(results).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "office" })]),
    );
  });

  it("matches aliases and tolerates typos", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue(mediaItems);
    const service = new SearchService(prisma as unknown as PrismaService);

    await expect(service.search("user-1", "office")).resolves.toEqual([
      {
        id: "office",
        title: "The Office",
        type: MediaType.TV_SHOW,
        path: "tv",
        label: "TV show",
        group: "TV",
      },
    ]);
    await expect(service.search("user-1", "Severence")).resolves.toEqual([
      {
        id: "severance",
        title: "Severance",
        type: MediaType.TV_SHOW,
        path: "tv",
        label: "TV show",
        group: "TV",
      },
    ]);
  });

  it("ranks exact and prefix matches before fuzzy matches and deduplicates", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue([
      ...mediaItems,
      {
        id: "severance-copy",
        title: "Severance Copy",
        type: MediaType.MOVIE,
        aliases: [],
        parentId: null,
        seasonNumber: null,
        episodeNumber: null,
        parent: null,
      },
    ]);
    const service = new SearchService(prisma as unknown as PrismaService);

    const results = await service.search("user-1", "severance");

    expect(results[0]).toEqual({
      id: "severance",
      title: "Severance",
      type: MediaType.TV_SHOW,
      path: "tv",
      label: "TV show",
      group: "TV",
    });
    expect(new Set(results.map((result) => result.id)).size).toBe(
      results.length,
    );
  });

  it("returns no results for a blank query and no more than 50 results", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue(
      Array.from({ length: 60 }, (_, index) => ({
        id: `media-${index}`,
        title: `Media ${index}`,
        type: MediaType.MOVIE,
        aliases: [],
        parentId: null,
        seasonNumber: null,
        episodeNumber: null,
        parent: null,
      })),
    );
    const service = new SearchService(prisma as unknown as PrismaService);

    await expect(service.search("user-1", "   ")).resolves.toEqual([]);
    await expect(service.search("user-1", "media")).resolves.toHaveLength(50);
  });

  it("reuses a cached index within ten minutes and rebuilds after expiry", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-23T12:00:00Z"));
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue(mediaItems);
    const service = new SearchService(prisma as unknown as PrismaService);

    await service.getIndex("user-1");
    await service.getIndex("user-1");
    expect(prisma.mediaItem.findMany).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10 * 60 * 1000);
    await service.getIndex("user-1");
    expect(prisma.mediaItem.findMany).toHaveBeenCalledTimes(2);
  });

  it("invalidates only the event user's cached index", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue(mediaItems);
    const service = new SearchService(prisma as unknown as PrismaService);

    await service.getIndex("user-1");
    await service.getIndex("user-2");
    service.invalidateIndex({ userId: "user-1" });
    await service.getIndex("user-2");
    await service.getIndex("user-1");

    expect(prisma.mediaItem.findMany).toHaveBeenCalledTimes(3);
    expect(Events.MEDIA_ITEM_CHANGED).toBe("media.item.changed");
  });

  it("adds one parent TV show row for multiple episode matches", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue([
      {
        id: "episode-1",
        title: "Pilot",
        type: MediaType.TV_EPISODE,
        aliases: [],
        parentId: "show-1",
        seasonNumber: 1,
        episodeNumber: 1,
        parent: { id: "show-1", title: "Severance", type: MediaType.TV_SHOW },
      },
      {
        id: "episode-2",
        title: "Good News About Hell",
        type: MediaType.TV_EPISODE,
        aliases: [],
        parentId: "show-1",
        seasonNumber: 1,
        episodeNumber: 2,
        parent: { id: "show-1", title: "Severance", type: MediaType.TV_SHOW },
      },
    ]);
    const service = new SearchService(prisma as unknown as PrismaService);

    const results = await service.search("user-1", "severance");

    expect(
      results.filter((result) => result.type === MediaType.TV_SHOW),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.type === MediaType.TV_EPISODE),
    ).toHaveLength(2);
    expect(results).toContainEqual(
      expect.objectContaining({ id: "show-1", label: "TV show", path: "tv" }),
    );
  });
});
