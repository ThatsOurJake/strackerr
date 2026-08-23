import type { Cache } from "cache-manager";
import { AppCacheService } from "./app-cache.service";

interface CacheMock {
  set: jest.Mock<Promise<void>, [string, unknown, number]>;
  get: jest.Mock<Promise<unknown>, [string]>;
  del: jest.Mock<Promise<void>, [string]>;
}

const createCacheMock = (): CacheMock => ({
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(undefined),
});

describe("AppCacheService", () => {
  let service: AppCacheService;
  let cacheMock: CacheMock;

  beforeEach(() => {
    cacheMock = createCacheMock();
    service = new AppCacheService(cacheMock as unknown as Cache);
  });

  it("set registers key under user", async () => {
    await service.set("history:u1:1", { value: true }, 300, "u1");

    expect(cacheMock.set).toHaveBeenCalledWith(
      "history:u1:1",
      { value: true },
      300,
    );

    const trackedKeys = (
      service as unknown as {
        userKeys: Map<string, Set<string>>;
      }
    ).userKeys;
    expect(trackedKeys.get("u1")?.has("history:u1:1")).toBe(true);
  });

  it("get returns null on cache miss", async () => {
    cacheMock.get.mockResolvedValueOnce(undefined);

    const value = await service.get("dashboard:u1");

    expect(value).toBeNull();
  });

  it("clearForUser deletes keys and removes user key tracking", async () => {
    await service.set("history:u1:1", { page: 1 }, 300, "u1");
    await service.set("dashboard:u1", { summary: true }, 300, "u1");

    await service.clearForUser("u1");

    expect(cacheMock.del).toHaveBeenCalledTimes(2);
    expect(cacheMock.del).toHaveBeenCalledWith("history:u1:1");
    expect(cacheMock.del).toHaveBeenCalledWith("dashboard:u1");

    const trackedKeys = (
      service as unknown as {
        userKeys: Map<string, Set<string>>;
      }
    ).userKeys;
    expect(trackedKeys.has("u1")).toBe(false);
  });

  it("LOG_ENTRY_CHANGED triggers clearForUser", async () => {
    await service.set("stats:u1:2026", { total: 42 }, 900, "u1");

    await service.onLogEntryChanged({ userId: "u1" });

    expect(cacheMock.del).toHaveBeenCalledWith("stats:u1:2026");
    const trackedKeys = (
      service as unknown as {
        userKeys: Map<string, Set<string>>;
      }
    ).userKeys;
    expect(trackedKeys.has("u1")).toBe(false);
  });
});
