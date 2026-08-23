import { MediaType } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
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
    upsert: jest.Mock;
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
      upsert: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation(async (callback: (transaction: MediaPrismaMock) => unknown) => callback(prisma));

  return prisma;
};

describe("MediaService", () => {
  it("normalizes aliases and computes sort titles", () => {
    expect(MediaService.normaliseAlias("  Severance (2022) ")).toBe("severance");
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

    const created = await service.findOrCreateSkeleton("The Office", MediaType.TV_SHOW, "user-1");
    const existing = await service.findOrCreateSkeleton("the office", MediaType.TV_SHOW, "user-1");

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

    await expect(service.findByExternalId("tmdb", "123")).resolves.toEqual(mediaItem);
    await expect(service.addExternalId("media-1", "tmdb", "123")).resolves.toEqual(mediaItem);
    expect(prisma.mediaExternalId.upsert).toHaveBeenCalledWith({
      where: { provider_externalId: { provider: "tmdb", externalId: "123" } },
      create: { mediaItemId: "media-1", provider: "tmdb", externalId: "123" },
      update: { mediaItemId: "media-1" },
    });
  });
});
