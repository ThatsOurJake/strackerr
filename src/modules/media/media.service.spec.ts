import { MediaType } from "@prisma/client";
import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { MediaService } from "./media.service";

const mediaItem = {
  id: "media-1",
  type: MediaType.TV_SHOW,
  title: "The Office",
  sortTitle: "office",
  isSkeleton: true,
  createdByUserId: "user-1",
};

interface MediaPrismaMock {
  $transaction: jest.Mock;
  mediaAlias: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
  mediaItem: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    update: jest.Mock;
  };
  mediaExternalId: {
    findUnique: jest.Mock;
    create: jest.Mock;
    upsert: jest.Mock;
  };
  mediaExternalAlias: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  logEntry: {
    findFirst: jest.Mock;
  };
}

const createPrismaMock = (): MediaPrismaMock => {
  const prisma: MediaPrismaMock = {
    $transaction: jest.fn(),
    mediaAlias: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    mediaItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    mediaExternalId: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    mediaExternalAlias: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    logEntry: {
      findFirst: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation(
    async (callback: (transaction: MediaPrismaMock) => unknown) =>
      callback(prisma),
  );

  return prisma;
};

describe("MediaService", () => {
  it("normalizes aliases and computes sort titles", () => {
    expect(MediaService.normaliseAlias("  Severance (2022) ")).toBe(
      "severance",
    );
    expect(MediaService.computeSortTitle("The Office")).toBe("office");
    expect(MediaService.computeSortTitle("A Bug's Life")).toBe("bug's life");
    expect(MediaService.computeSortTitle("進撃の巨人")).toBe("#進撃の巨人");
    expect(MediaService.computeSortTitle("1917")).toBe("#1917");
  });

  it("creates a skeleton and returns it for a normalized alias", async () => {
    const prisma = createPrismaMock();
    prisma.mediaAlias.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ mediaItem });
    prisma.mediaItem.create.mockResolvedValue(mediaItem);
    const service = new MediaService(prisma as unknown as PrismaService);

    const created = await service.findOrCreateSkeleton(
      "The Office",
      MediaType.TV_SHOW,
      "user-1",
    );
    const existing = await service.findOrCreateSkeleton(
      "the office",
      MediaType.TV_SHOW,
      "user-1",
    );

    expect(created).toEqual(mediaItem);
    expect(existing).toEqual(mediaItem);
    expect(prisma.mediaItem.create).toHaveBeenCalledTimes(1);
    expect(prisma.mediaAlias.create).toHaveBeenCalledWith({
      data: { alias: "the office", mediaItemId: "media-1" },
    });
  });

  it("wont create a new alias when one exists", async () => {
    const prisma = createPrismaMock();
    const alias = { id: "alias-1", alias: "office", mediaItemId: "media-1" };
    prisma.mediaAlias.findUnique.mockResolvedValue(alias);
    const service = new MediaService(prisma as unknown as PrismaService);

    const result = await service.addAlias("media-1", "Office");

    expect(result).toBe(alias);
    expect(prisma.mediaAlias.create).not.toHaveBeenCalled();
  });

  it("looks up and upserts external IDs", async () => {
    const prisma = createPrismaMock();
    prisma.mediaExternalId.findUnique.mockResolvedValue({ mediaItem });
    prisma.mediaExternalId.upsert.mockResolvedValue({ mediaItemId: "media-1" });
    prisma.mediaItem.findUniqueOrThrow.mockResolvedValue(mediaItem);
    const service = new MediaService(prisma as unknown as PrismaService);

    await expect(service.findByExternalId("tmdb", "123")).resolves.toEqual(
      mediaItem,
    );
    await expect(
      service.addExternalId("media-1", "tmdb", "123"),
    ).resolves.toEqual(mediaItem);
    expect(prisma.mediaExternalId.upsert).toHaveBeenCalledWith({
      where: { provider_externalId: { provider: "tmdb", externalId: "123" } },
      create: { mediaItemId: "media-1", provider: "tmdb", externalId: "123" },
      update: { mediaItemId: "media-1" },
    });
  });

  it("resolves canonical ids first, then external aliases", async () => {
    const prisma = createPrismaMock();
    const service = new MediaService(prisma as unknown as PrismaService);

    prisma.mediaExternalId.findUnique.mockResolvedValueOnce({ mediaItem });
    await expect(
      service.resolveByExternalLookup("tmdb", "movie:123"),
    ).resolves.toEqual(mediaItem);
    expect(prisma.mediaExternalAlias.findUnique).not.toHaveBeenCalled();

    prisma.mediaExternalId.findUnique.mockResolvedValueOnce(null);
    prisma.mediaExternalAlias.findUnique.mockResolvedValueOnce({ mediaItem });
    await expect(
      service.resolveByExternalLookup("steam", "app:620"),
    ).resolves.toEqual(mediaItem);
  });

  it("rejects alias reassignment conflicts and supports list/remove", async () => {
    const prisma = createPrismaMock();
    const service = new MediaService(prisma as unknown as PrismaService);

    prisma.mediaExternalAlias.findUnique.mockResolvedValueOnce({
      mediaItemId: "media-2",
      providerNamespace: "steam",
      externalId: "620",
    });

    await expect(
      service.addExternalAlias("media-1", " Steam ", "620"),
    ).rejects.toThrow("Alias is already assigned to another media item");

    prisma.mediaExternalAlias.findMany.mockResolvedValueOnce([
      { providerNamespace: "steam", externalId: "620" },
    ]);
    prisma.mediaExternalAlias.deleteMany.mockResolvedValueOnce({ count: 1 });

    await expect(service.listExternalAliases("media-1")).resolves.toEqual([
      { providerNamespace: "steam", externalId: "620" },
    ]);
    await expect(
      service.removeExternalAlias("media-1", "Steam", "620"),
    ).resolves.toBe(true);
  });

  it("queues identified artwork for local caching", async () => {
    const prisma = createPrismaMock();
    const events = { emit: jest.fn() };
    prisma.mediaExternalId.findUnique.mockResolvedValue(null);
    prisma.mediaItem.create.mockResolvedValue({ ...mediaItem, id: "game-1" });
    const service = new MediaService(
      prisma as unknown as PrismaService,
      events as never,
    );

    await service.findOrCreateIdentified({
      type: MediaType.GAME,
      title: "Hades",
      provider: "igdb",
      externalId: "123",
      imageUrl: "https://images.igdb.com/cover.jpg",
    });

    expect(prisma.mediaItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        imageUrl: null,
        imageSourceUrl: "https://images.igdb.com/cover.jpg",
      }),
    });
    expect(events.emit).toHaveBeenCalledWith("media.image.cache", {
      mediaItemId: "game-1",
      sourceUrl: "https://images.igdb.com/cover.jpg",
    });
  });
});
