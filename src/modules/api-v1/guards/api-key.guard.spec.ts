import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../../../infrastructure/database/prisma.service";
import { ApiKeyGuard } from "./api-key.guard";

describe("ApiKeyGuard", () => {
  const findUnique = jest.fn();
  const guard = new ApiKeyGuard({ user: { findUnique } } as unknown as PrismaService);

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

  it("rejects missing and query-string API keys", async () => {
    await expect(guard.canActivate(contextFor().context)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(contextFor(undefined, { apiKey: "key-1" }).context)).rejects.toThrow(
      "API key must be sent in the X-API-Key header, not as a query parameter",
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
});
