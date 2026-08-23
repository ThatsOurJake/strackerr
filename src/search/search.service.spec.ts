import { Events } from "../events/event-names";
import type { PrismaService } from "../prisma/prisma.service";
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
    type: "TV_SHOW",
    aliases: [{ alias: "severance tv" }],
  },
  {
    id: "office",
    title: "The Office",
    type: "TV_SHOW",
    aliases: [{ alias: "office" }],
  },
  {
    id: "seven",
    title: "Seven",
    type: "MOVIE",
    aliases: [],
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
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        aliases: { select: { alias: true } },
      },
    });
  });

  it("returns only results supplied by the requested user's index", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue([mediaItems[0]]);
    const service = new SearchService(prisma as unknown as PrismaService);

    const results = await service.search("user-1", "Severance");

    expect(results).toEqual([
      { id: "severance", title: "Severance", type: "TV_SHOW" },
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
      { id: "office", title: "The Office", type: "TV_SHOW" },
    ]);
    await expect(service.search("user-1", "Severence")).resolves.toEqual([
      { id: "severance", title: "Severance", type: "TV_SHOW" },
    ]);
  });

  it("ranks exact and prefix matches before fuzzy matches and deduplicates", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findMany.mockResolvedValue([
      ...mediaItems,
      {
        id: "severance-copy",
        title: "Severance Copy",
        type: "MOVIE",
        aliases: [],
      },
    ]);
    const service = new SearchService(prisma as unknown as PrismaService);

    const results = await service.search("user-1", "severance");

    expect(results[0]).toEqual({
      id: "severance",
      title: "Severance",
      type: "TV_SHOW",
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
        type: "MOVIE",
        aliases: [],
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
});
