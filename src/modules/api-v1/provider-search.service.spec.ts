import { BadGatewayException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import { MetadataService } from "../metadata/metadata.service";
import { ProviderSearchService } from "./provider-search.service";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

describe("ProviderSearchService", () => {
  const provider = {
    name: "tmdb" as const,
    search: jest.fn(),
    getById: jest.fn(),
    getEpisodes: jest.fn(),
  };
  const metadataService = {
    getProviderForUser: jest.fn(),
  };
  const service = new ProviderSearchService(
    metadataService as unknown as MetadataService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    metadataService.getProviderForUser.mockResolvedValue({
      provider,
      apiKey: "secret-provider-key",
    });
  });

  it("resolves a user's TMDB credential and returns normalized movie candidates", async () => {
    provider.search.mockResolvedValue([
      {
        externalId: "movie:157336",
        title: "Interstellar",
        type: MediaType.MOVIE,
        year: 2014,
      },
    ]);

    await expect(service.searchMovies("user-1", "Interstellar")).resolves.toEqual([
      {
        externalId: "movie:157336",
        title: "Interstellar",
        type: MediaType.MOVIE,
        year: 2014,
        imageUrl: undefined,
        description: undefined,
        tags: undefined,
      },
    ]);
    expect(metadataService.getProviderForUser).toHaveBeenCalledWith(
      MediaType.MOVIE,
      "user-1",
      { providerOverride: "tmdb" },
    );
    expect(provider.search).toHaveBeenCalledWith("Interstellar", "secret-provider-key");
  });

  it("fails with 424 when the user's requested provider is not configured", async () => {
    metadataService.getProviderForUser.mockResolvedValue({ provider });

    await expect(service.searchGames("user-1", "Halo")).rejects.toMatchObject({
      message: "IGDB credential configuration is required",
      status: 424,
    });
  });

  it("expands every TMDB-provided TV season and keeps season numbers", async () => {
    provider.search.mockResolvedValue([
      { externalId: "tv:95396", title: "Severance", type: MediaType.TV_SHOW },
    ]);
    provider.getById.mockResolvedValue({ seasonNumbers: [0, 1] });
    provider.getEpisodes
      .mockResolvedValueOnce([
        { seasonNumber: 0, episodeNumber: 1, title: "The You You Are", externalId: "tmdb:1" },
      ])
      .mockResolvedValueOnce([
        { seasonNumber: 1, episodeNumber: 1, title: "Good News About Hell", externalId: "tmdb:2" },
      ]);

    await expect(service.searchTvShows("user-1", "Severance")).resolves.toEqual([
      {
        externalId: "tv:95396",
        title: "Severance",
        type: MediaType.TV_SHOW,
        imageUrl: undefined,
        description: undefined,
        tags: undefined,
        year: undefined,
        episodes: [
          {
            seasonNumber: 0,
            episodeNumber: 1,
            title: "The You You Are",
            description: undefined,
            duration: undefined,
            externalId: "tmdb:1",
            imageUrl: undefined,
          },
          {
            seasonNumber: 1,
            episodeNumber: 1,
            title: "Good News About Hell",
            description: undefined,
            duration: undefined,
            externalId: "tmdb:2",
            imageUrl: undefined,
          },
        ],
      },
    ]);
    expect(provider.getEpisodes).toHaveBeenNthCalledWith(
      1,
      "tv:95396",
      0,
      "secret-provider-key",
    );
  });

  it("sanitizes upstream provider failures", async () => {
    provider.search.mockRejectedValue(
      new Error("https://api.example.com?key=secret-provider-key"),
    );

    await expect(service.searchMovies("user-1", "Interstellar")).rejects.toEqual(
      new BadGatewayException("TMDB search is temporarily unavailable"),
    );
  });

  it("maps upstream provider rate limits to a safe 429 response", async () => {
    provider.search.mockRejectedValue(new Error("TMDB rate limit reached"));

    await expect(service.searchMovies("user-1", "Interstellar")).rejects.toMatchObject({
      message: "TMDB search is temporarily rate limited",
      status: 429,
    });
  });
});
