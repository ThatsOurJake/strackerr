import { BadRequestException } from "@nestjs/common";
import type { Request } from "express";
import { ApiV1ProviderSearchController } from "./api-v1-provider-search.controller";
import { ProviderSearchService } from "./provider-search.service";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

describe("ApiV1ProviderSearchController", () => {
  const providerSearchService = {
    searchMovies: jest.fn(),
    searchTvShows: jest.fn(),
    searchGames: jest.fn(),
    searchBoardGames: jest.fn(),
  };
  const controller = new ApiV1ProviderSearchController(
    providerSearchService as unknown as ProviderSearchService,
  );

  const createRequest = (headers: Record<string, string> = {}): Request => ({
    user: { userId: "user-1", username: "jake", isAdmin: false },
    headers,
    header: (name: string) => headers[name.toLowerCase()],
  }) as Request;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("trims a valid query before searching with the authenticated user", async () => {
    providerSearchService.searchMovies.mockResolvedValue([]);

    await expect(
      controller.searchTmdbMovies(
        { query: "  Interstellar  " },
        undefined,
        createRequest(),
      ),
    ).resolves.toEqual({ data: [] });
    expect(providerSearchService.searchMovies).toHaveBeenCalledWith(
      "user-1",
      "Interstellar",
    );
  });

  it("rejects blank, extra, and provider credential request inputs", async () => {
    await expect(
      controller.searchIgdb({ query: " " }, undefined, createRequest()),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.searchIgdb(
        { query: "Halo", apiKey: "provider-key" },
        undefined,
        createRequest(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.searchBgg(
        { query: "Catan" },
        { providerKey: "provider-key" },
        createRequest(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.searchTmdbTv(
        { query: "Severance" },
        undefined,
        createRequest({ "x-tmdb-api-key": "provider-key" }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
