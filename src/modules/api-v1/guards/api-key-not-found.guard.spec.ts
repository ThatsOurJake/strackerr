import { ExecutionContext, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ApiKeyNotFoundGuard } from "./api-key-not-found.guard";

describe("ApiKeyNotFoundGuard", () => {
  const findUnique = jest.fn();
  const guard = new ApiKeyNotFoundGuard({ user: { findUnique } } as unknown as PrismaService);

  const contextFor = (apiKey?: string, query: Record<string, string> = {}) => {
    const request = {
      header: jest.fn().mockReturnValue(apiKey),
      query,
      user: undefined,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    findUnique.mockReset();
  });

  it("returns not found for missing and query-string API keys", async () => {
    await expect(guard.canActivate(contextFor().context)).rejects.toBeInstanceOf(NotFoundException);
    await expect(guard.canActivate(contextFor(undefined, { apiKey: "key-1" }).context)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("attaches the API-key owner to the request", async () => {
    findUnique.mockResolvedValue({ id: "user-1", username: "jake", isAdmin: false });
    const { context, request } = contextFor("key-1");

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(findUnique).toHaveBeenCalledWith({ where: { apiKey: "key-1" } });
    expect(request.user).toEqual({ userId: "user-1", username: "jake", isAdmin: false });
  });

  it("returns not found for unknown API keys", async () => {
    findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(contextFor("bad-key").context)).rejects.toBeInstanceOf(NotFoundException);
  });
});
