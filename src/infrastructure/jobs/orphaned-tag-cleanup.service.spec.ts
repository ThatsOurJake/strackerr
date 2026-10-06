import { Logger } from "@nestjs/common";
import type { PrismaService } from "../database/prisma.service";
import { OrphanedTagCleanupService } from "./orphaned-tag-cleanup.service";

const createService = () => {
  const findMany = jest.fn();
  const deleteMany = jest.fn();

  const prisma = {
    tag: {
      findMany,
      deleteMany,
    },
  } as unknown as PrismaService;

  return {
    service: new OrphanedTagCleanupService(prisma),
    findMany,
    deleteMany,
  };
};

describe("OrphanedTagCleanupService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("removes only tags with no linked media items", async () => {
    const { service, findMany, deleteMany } = createService();
    findMany
      .mockResolvedValueOnce([{ id: "tag-1" }, { id: "tag-2" }])
      .mockResolvedValueOnce([]);
    deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(service.cleanupOrphanedTags()).resolves.toEqual({
      removedTags: 2,
      failedTags: 0,
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        mediaItemTags: { none: {} },
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 200,
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: "tag-1",
        mediaItemTags: { none: {} },
      },
    });
    expect(service.getStatus()).toEqual({
      state: "completed",
      removedTags: 2,
      failedTags: 0,
    });
  });

  it("continues cleanup when deleting one tag fails", async () => {
    const { service, findMany, deleteMany } = createService();
    findMany
      .mockResolvedValueOnce([{ id: "tag-1" }, { id: "tag-2" }])
      .mockResolvedValueOnce([]);
    deleteMany
      .mockRejectedValueOnce(new Error("locked"))
      .mockResolvedValueOnce({ count: 1 });

    await expect(service.cleanupOrphanedTags()).resolves.toEqual({
      removedTags: 1,
      failedTags: 1,
    });

    expect(service.getStatus()).toEqual({
      state: "completed",
      removedTags: 1,
      failedTags: 1,
    });
  });

  it("prevents starting a second cleanup while one is running", async () => {
    let releaseBatch: ((value: Array<{ id: string }>) => void) | undefined;
    const { service, findMany } = createService();
    findMany.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseBatch = resolve;
      }),
    );

    expect(service.startCleanup()).toBe(true);
    expect(service.startCleanup()).toBe(false);
    expect(service.getStatus()).toEqual({ state: "running" });

    releaseBatch?.([]);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(service.getStatus()).toEqual({
      state: "completed",
      removedTags: 0,
      failedTags: 0,
    });
  });
});
