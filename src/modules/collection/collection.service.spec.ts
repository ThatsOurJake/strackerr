import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { MediaItem, MediaType } from "@prisma/client";
import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { CollectionService } from "./collection.service";

const mediaItem = (id: string, title: string, overrides: Partial<MediaItem> = {}): MediaItem => ({
  id,
  type: MediaType.MOVIE,
  title,
  sortTitle: title,
  isSkeleton: false,
  createdByUserId: null,
  parentId: null,
  seasonNumber: null,
  episodeNumber: null,
  description: null,
  imageUrl: null,
  imageSourceUrl: null,
  year: null,
  duration: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("CollectionService", () => {
  let prisma: {
    $transaction: jest.Mock;
    mediaItem: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    mediaExternalAlias: { findMany: jest.Mock; deleteMany: jest.Mock; createMany: jest.Mock };
    mediaExternalId: { findMany: jest.Mock };
    logEntry: { deleteMany: jest.Mock };
  };
  let service: CollectionService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      mediaItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      mediaExternalAlias: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      mediaExternalId: {
        findMany: jest.fn(),
      },
      logEntry: {
        deleteMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof prisma) => unknown) => callback(prisma),
    );
    service = new CollectionService(prisma as unknown as PrismaService);
  });

  it("scopes collection items and rolls episode activity up to parent shows", async () => {
    prisma.mediaItem.findMany.mockResolvedValue([]);

    await service.findCollection("user-2", { type: MediaType.TV_SHOW });

    expect(prisma.mediaItem.findMany).toHaveBeenCalledWith({
      where: {
        type: MediaType.TV_SHOW,
        isSkeleton: undefined,
        OR: [
          { createdByUserId: "user-2" },
          { logEntries: { some: { userId: "user-2" } } },
          {
            type: MediaType.TV_SHOW,
            episodes: { some: { logEntries: { some: { userId: "user-2" } } } },
          },
        ],
      },
    });
  });

  it("excludes music tracks from the default all collection query", async () => {
    prisma.mediaItem.findMany.mockResolvedValue([]);

    await service.findCollection("user-2", {});

    expect(prisma.mediaItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: { in: [MediaType.MOVIE, MediaType.TV_SHOW, MediaType.GAME, MediaType.BOARD_GAME] },
        }),
      }),
    );
  });

  it("sorts by sort title and classifies non-Latin and numeric titles under hash", async () => {
    prisma.mediaItem.findMany.mockResolvedValue([
      mediaItem("japanese", "七人の侍"),
      mediaItem("office", "The Office", { sortTitle: "Office, The" }),
      mediaItem("numbers", "2001", { sortTitle: "2001" }),
    ]);

    const page = await service.findCollection("user-2", {});

    expect(page.items.map((item) => item.id)).toEqual(["numbers", "office", "japanese"]);
    expect([...page.availableLetters]).toEqual(["#", "O"]);
  });

  it("resolves an episode detail request to its parent and authorizes through episode logs", async () => {
    prisma.mediaItem.findUnique
      .mockResolvedValueOnce({ id: "episode-1", type: MediaType.TV_EPISODE, parentId: "show-1" })
      .mockResolvedValueOnce({
        ...mediaItem("show-1", "Show", { type: MediaType.TV_SHOW }),
        logEntries: [],
        episodes: [{
          ...mediaItem("episode-1", "Pilot", { type: MediaType.TV_EPISODE, parentId: "show-1" }),
          logEntries: [{ id: "log-1" }],
        }],
      });

    const detail = await service.findDetail("user-2", "episode-1");

    expect(detail.id).toBe("show-1");
    expect(prisma.mediaItem.findUnique.mock.calls[1][0]).toMatchObject({
      where: { id: "show-1" },
      include: {
        logEntries: { where: { userId: "user-2" } },
        episodes: { include: { logEntries: { where: { userId: "user-2" } } } },
      },
    });
  });

  it("returns not found for a missing item and forbids an unrelated item", async () => {
    prisma.mediaItem.findUnique.mockResolvedValueOnce(null);
    await expect(service.findDetail("user-2", "missing")).rejects.toBeInstanceOf(NotFoundException);

    prisma.mediaItem.findUnique
      .mockResolvedValueOnce({ id: "movie-1", type: MediaType.MOVIE, parentId: null })
      .mockResolvedValueOnce({
        ...mediaItem("movie-1", "Private"),
        logEntries: [],
        episodes: [],
      });
    await expect(service.findDetail("user-2", "movie-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("applies metadata updates, selected history removals, and aliases in one transaction", async () => {
    prisma.mediaItem.findUnique
      .mockResolvedValueOnce({ id: "movie-1", type: MediaType.MOVIE, parentId: null })
      .mockResolvedValueOnce({
        ...mediaItem("movie-1", "Arrival", { createdByUserId: "user-2" }),
        externalAliases: [{ id: "alias-1", providerNamespace: "tmdb", externalId: "157336" }],
        logEntries: [{ id: "log-1", userId: "user-2", loggedAt: new Date("2026-09-01T12:00:00Z") }],
        episodes: [],
      });
    prisma.mediaExternalAlias.findMany
      .mockResolvedValueOnce([{ id: "alias-1" }])
      .mockResolvedValueOnce([]);
    prisma.mediaExternalId.findMany.mockResolvedValueOnce([]);
    prisma.logEntry.deleteMany.mockResolvedValueOnce({ count: 1 });

    const result = await service.bulkEditItem("user-2", "movie-1", {
      title: "Arrival (2016)",
      description: "Updated",
      removeLogEntryIds: ["log-1"],
      aliases: [{ providerNamespace: "imdb", externalId: "tt2543164" }],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.mediaItem.update).toHaveBeenCalledWith({
      where: { id: "movie-1" },
      data: expect.objectContaining({
        title: "Arrival (2016)",
        description: "Updated",
      }),
    });
    expect(prisma.logEntry.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["log-1"] },
        userId: "user-2",
      },
    });
    expect(prisma.mediaExternalAlias.deleteMany).toHaveBeenCalledWith({ where: { mediaItemId: "movie-1" } });
    expect(prisma.mediaExternalAlias.createMany).toHaveBeenCalledWith({
      data: [{ mediaItemId: "movie-1", providerNamespace: "imdb", externalId: "tt2543164" }],
    });
    expect(result).toEqual({ itemId: "movie-1", stillAccessible: true });
  });

  it("rejects removal of unauthorized history rows", async () => {
    prisma.mediaItem.findUnique
      .mockResolvedValueOnce({ id: "movie-1", type: MediaType.MOVIE, parentId: null })
      .mockResolvedValueOnce({
        ...mediaItem("movie-1", "Arrival", { createdByUserId: "user-2" }),
        externalAliases: [],
        logEntries: [{ id: "log-1", userId: "user-2", loggedAt: new Date("2026-09-01T12:00:00Z") }],
        episodes: [],
      });

    await expect(
      service.bulkEditItem("user-2", "movie-1", {
        title: "Arrival",
        description: null,
        removeLogEntryIds: ["log-foreign"],
        aliases: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects alias conflicts without applying partial writes", async () => {
    prisma.mediaItem.findUnique
      .mockResolvedValueOnce({ id: "movie-1", type: MediaType.MOVIE, parentId: null })
      .mockResolvedValueOnce({
        ...mediaItem("movie-1", "Arrival", { createdByUserId: "user-2" }),
        externalAliases: [],
        logEntries: [],
        episodes: [],
      });
    prisma.mediaExternalAlias.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ providerNamespace: "imdb", externalId: "tt2543164" }]);

    await expect(
      service.bulkEditItem("user-2", "movie-1", {
        title: "Arrival",
        description: null,
        removeLogEntryIds: [],
        aliases: [{ providerNamespace: "imdb", externalId: "tt2543164" }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.mediaItem.update).not.toHaveBeenCalled();
    expect(prisma.logEntry.deleteMany).not.toHaveBeenCalled();
  });
});
