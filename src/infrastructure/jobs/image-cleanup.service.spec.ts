import { readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../database/prisma.service";
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

const createService = () => {
  const findMany = jest.fn().mockResolvedValue([]);
  const updateMany = jest.fn().mockResolvedValue({ count: 0 });
  const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
  const transaction = jest.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const prisma = {
    mediaItem: { findMany, updateMany },
    cachedImage: { deleteMany },
    $transaction: transaction,
  } as unknown as PrismaService;
  const configService = {
    get: jest.fn().mockReturnValue("./data"),
  } as unknown as ConfigService;

  return {
    service: new ImageCleanupService(configService, prisma),
    findMany,
    updateMany,
    deleteMany,
  };
};

describe("ImageCleanupService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("skips safely when the image directory is missing", async () => {
    readdirMock.mockRejectedValueOnce(new Error("ENOENT"));
    const { service, findMany } = createService();

    await expect(service.cleanupOrphanedImages()).resolves.toBe(0);

    expect(findMany).not.toHaveBeenCalled();
    expect(rmMock).not.toHaveBeenCalled();
    expect(service.getStatus()).toEqual({ state: "completed", removedFiles: 0 });
  });

  it("keeps referenced files and removes obsolete episode outputs only", async () => {
    readdirMock.mockResolvedValueOnce([
      "keep-thumb.webp",
      "keep-cover.webp",
      "episode-thumb.webp",
      "episode-cover.webp",
      "notes.txt",
      "unsafe-poster.webp",
    ]);
    const { service, findMany, updateMany, deleteMany } = createService();
    findMany.mockResolvedValue([
      { id: "keep", imageUrl: "/img/keep-cover.webp" },
    ]);

    await expect(service.cleanupOrphanedImages()).resolves.toBe(2);

    expect(rmMock).toHaveBeenCalledTimes(2);
    expect(rmMock).toHaveBeenCalledWith(
      resolve("./data", "images", "episode-thumb.webp"),
      { force: true },
    );
    expect(rmMock).toHaveBeenCalledWith(
      resolve("./data", "images", "episode-cover.webp"),
      { force: true },
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: { mediaItem: { type: "TV_EPISODE" } },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { type: "TV_EPISODE" },
      data: { imageUrl: null, imageSourceUrl: null },
    });
  });

  it("does not delete files when database references cannot be verified", async () => {
    readdirMock.mockResolvedValueOnce(["unused-cover.webp"]);
    const { service, findMany } = createService();
    findMany.mockRejectedValue(new Error("database unavailable"));

    await expect(service.cleanupOrphanedImages()).resolves.toBeNull();

    expect(rmMock).not.toHaveBeenCalled();
    expect(service.getStatus()).toEqual({ state: "failed" });
  });

  it("continues after an individual file removal fails", async () => {
    readdirMock.mockResolvedValueOnce([
      "first-cover.webp",
      "second-cover.webp",
    ]);
    rmMock
      .mockRejectedValueOnce(new Error("locked"))
      .mockResolvedValueOnce(undefined);
    const { service } = createService();

    await expect(service.cleanupOrphanedImages()).resolves.toBe(1);

    expect(rmMock).toHaveBeenCalledTimes(2);
    expect(service.getStatus()).toEqual({ state: "completed", removedFiles: 1 });
  });

  it("prevents a second cleanup while one is running", async () => {
    let releaseRead: ((files: string[]) => void) | undefined;
    readdirMock.mockReturnValueOnce(
      new Promise((resolveRead) => {
        releaseRead = resolveRead;
      }),
    );
    const { service } = createService();

    expect(service.startCleanup()).toBe(true);
    expect(service.startCleanup()).toBe(false);
    expect(service.getStatus()).toEqual({ state: "running" });

    releaseRead?.([]);
    await new Promise<void>((resolveDone) => setImmediate(resolveDone));
    expect(service.getStatus()).toEqual({ state: "completed", removedFiles: 0 });
  });
});
