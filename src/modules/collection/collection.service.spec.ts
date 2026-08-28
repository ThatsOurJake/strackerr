import { ForbiddenException, NotFoundException } from "@nestjs/common";
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
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let service: CollectionService;

  beforeEach(() => {
    findMany = jest.fn();
    findUnique = jest.fn();
    service = new CollectionService({
      mediaItem: { findMany, findUnique },
    } as unknown as PrismaService);
  });

  it("scopes collection items and rolls episode activity up to parent shows", async () => {
    findMany.mockResolvedValue([]);

    await service.findCollection("user-2", { type: MediaType.TV_SHOW });

    expect(findMany).toHaveBeenCalledWith({
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

  it("sorts by sort title and classifies non-Latin and numeric titles under hash", async () => {
    findMany.mockResolvedValue([
      mediaItem("japanese", "七人の侍"),
      mediaItem("office", "The Office", { sortTitle: "Office, The" }),
      mediaItem("numbers", "2001", { sortTitle: "2001" }),
    ]);

    const page = await service.findCollection("user-2", {});

    expect(page.items.map((item) => item.id)).toEqual(["numbers", "office", "japanese"]);
    expect([...page.availableLetters]).toEqual(["#", "O"]);
  });

  it("resolves an episode detail request to its parent and authorizes through episode logs", async () => {
    findUnique
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
    expect(findUnique.mock.calls[1][0]).toMatchObject({
      where: { id: "show-1" },
      include: {
        logEntries: { where: { userId: "user-2" } },
        episodes: { include: { logEntries: { where: { userId: "user-2" } } } },
      },
    });
  });

  it("returns not found for a missing item and forbids an unrelated item", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(service.findDetail("user-2", "missing")).rejects.toBeInstanceOf(NotFoundException);

    findUnique
      .mockResolvedValueOnce({ id: "movie-1", type: MediaType.MOVIE, parentId: null })
      .mockResolvedValueOnce({
        ...mediaItem("movie-1", "Private"),
        logEntries: [],
        episodes: [],
      });
    await expect(service.findDetail("user-2", "movie-1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
