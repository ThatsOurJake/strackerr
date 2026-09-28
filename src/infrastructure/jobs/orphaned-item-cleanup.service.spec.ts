import { Logger } from "@nestjs/common";
import type { PrismaService } from "../database/prisma.service";
import { OrphanedItemCleanupService } from "./orphaned-item-cleanup.service";

const createService = () => {
  const findMany = jest.fn();
  const deleteMany = jest.fn();
  const emit = jest.fn();

  const prisma = {
    mediaItem: {
      findMany,
      deleteMany,
    },
  } as unknown as PrismaService;

  return {
    service: new OrphanedItemCleanupService(prisma, { emit } as never),
    findMany,
    deleteMany,
    emit,
  };
};

describe("OrphanedItemCleanupService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("removes only orphaned parentless items and emits delete events", async () => {
    const { service, findMany, deleteMany, emit } = createService();
    findMany
      .mockResolvedValueOnce([{ id: "item-1" }, { id: "item-2" }])
      .mockResolvedValueOnce([]);
    deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(service.cleanupOrphanedItems()).resolves.toEqual({
      removedItems: 2,
      failedItems: 0,
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        isSkeleton: false,
        parentId: null,
        logEntries: { none: {} },
        episodes: { none: {} },
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 100,
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: "item-1",
        isSkeleton: false,
        parentId: null,
        logEntries: { none: {} },
        episodes: { none: {} },
      },
    });
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenNthCalledWith(1, "media.item.deleted", {
      mediaItemId: "item-1",
    });
    expect(emit).toHaveBeenNthCalledWith(2, "media.item.deleted", {
      mediaItemId: "item-2",
    });
    expect(service.getStatus()).toEqual({
      state: "completed",
      removedItems: 2,
      failedItems: 0,
    });
  });

  it("protects referenced items that become active during cleanup", async () => {
    const { service, findMany, deleteMany, emit } = createService();
    findMany
      .mockResolvedValueOnce([{ id: "item-1" }])
      .mockResolvedValueOnce([]);
    deleteMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.cleanupOrphanedItems()).resolves.toEqual({
      removedItems: 0,
      failedItems: 0,
    });

    expect(emit).not.toHaveBeenCalled();
  });

  it("continues cleanup when deleting one item fails", async () => {
    const { service, findMany, deleteMany, emit } = createService();
    findMany
      .mockResolvedValueOnce([{ id: "item-1" }, { id: "item-2" }])
      .mockResolvedValueOnce([]);
    deleteMany
      .mockRejectedValueOnce(new Error("locked"))
      .mockResolvedValueOnce({ count: 1 });

    await expect(service.cleanupOrphanedItems()).resolves.toEqual({
      removedItems: 1,
      failedItems: 1,
    });

    expect(emit).toHaveBeenCalledTimes(1);
    expect(service.getStatus()).toEqual({
      state: "completed",
      removedItems: 1,
      failedItems: 1,
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
      removedItems: 0,
      failedItems: 0,
    });
  });
});
