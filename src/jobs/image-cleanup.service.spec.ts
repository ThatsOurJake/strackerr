import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../prisma/prisma.service";
import { ImageCleanupService } from "./image-cleanup.service";

jest.mock("node:fs/promises", () => ({
  readdir: jest.fn(),
  rm: jest.fn(),
}));

const readdirMock = readdir as unknown as jest.Mock<
  Promise<string[]>,
  [string, { encoding: "utf8" }?]
>;
const rmMock = rm as jest.MockedFunction<typeof rm>;

const createService = (prisma: Partial<PrismaService> = {}): ImageCleanupService => {
  const configService = {
    get: jest.fn().mockReturnValue("./data"),
  } as unknown as ConfigService;

  return new ImageCleanupService(configService, prisma as PrismaService);
};

describe("ImageCleanupService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("skips when image directory is missing", async () => {
    readdirMock.mockRejectedValueOnce(new Error("ENOENT"));
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    const service = createService();

    await service.cleanupOrphanedImages();

    expect(logSpy).toHaveBeenCalledWith(
      "Image cleanup skipped: images directory not found.",
    );
    expect(rmMock).not.toHaveBeenCalled();
  });

  it("parses valid filename patterns only", async () => {
    readdirMock.mockResolvedValueOnce([
      "a-thumb.webp",
      "b-cover.webp",
      "not-an-image.txt",
      "c-poster.webp",
    ]);

    const service = createService();
    jest
      .spyOn(
        service as unknown as {
          findExistingMediaItemIds: (
            mediaItemIds: string[],
          ) => Promise<Set<string> | null>;
        },
        "findExistingMediaItemIds",
      )
      .mockResolvedValueOnce(new Set());

    await service.cleanupOrphanedImages();

    expect(rmMock).toHaveBeenCalledTimes(2);
    expect(rmMock).toHaveBeenCalledWith(
      join("./data", "images", "a-thumb.webp"),
      {
        force: true,
      },
    );
    expect(rmMock).toHaveBeenCalledWith(
      join("./data", "images", "b-cover.webp"),
      {
        force: true,
      },
    );
  });

  it("skips deletion when DB check cannot run", async () => {
    readdirMock.mockResolvedValueOnce(["a-thumb.webp"]);
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    const service = createService();

    jest
      .spyOn(
        service as unknown as {
          findExistingMediaItemIds: (
            mediaItemIds: string[],
          ) => Promise<Set<string> | null>;
        },
        "findExistingMediaItemIds",
      )
      .mockResolvedValueOnce(null);

    await service.cleanupOrphanedImages();

    expect(warnSpy).toHaveBeenCalledWith(
      "Image cleanup skipped: could not verify MediaItem records.",
    );
    expect(rmMock).not.toHaveBeenCalled();
  });

  it("deletes only files whose mediaItemId is absent", async () => {
    readdirMock.mockResolvedValueOnce([
      "exists-thumb.webp",
      "missing-cover.webp",
      "exists-cover.webp",
    ]);

    const service = createService();
    jest
      .spyOn(
        service as unknown as {
          findExistingMediaItemIds: (
            mediaItemIds: string[],
          ) => Promise<Set<string> | null>;
        },
        "findExistingMediaItemIds",
      )
      .mockResolvedValueOnce(new Set(["exists"]));

    await service.cleanupOrphanedImages();

    expect(rmMock).toHaveBeenCalledTimes(1);
    expect(rmMock).toHaveBeenCalledWith(
      join("./data", "images", "missing-cover.webp"),
      { force: true },
    );
  });

  it("logs deleted count", async () => {
    readdirMock.mockResolvedValueOnce(["keep-thumb.webp", "remove-cover.webp"]);
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    const service = createService();

    jest
      .spyOn(
        service as unknown as {
          findExistingMediaItemIds: (
            mediaItemIds: string[],
          ) => Promise<Set<string> | null>;
        },
        "findExistingMediaItemIds",
      )
      .mockResolvedValueOnce(new Set(["keep"]));

    await service.cleanupOrphanedImages();

    expect(logSpy).toHaveBeenCalledWith(
      "Image cleanup complete: deleted 1 orphaned files.",
    );
  });
});
