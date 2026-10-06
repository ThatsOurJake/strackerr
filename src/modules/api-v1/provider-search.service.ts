import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { MediaType } from "@prisma/client";
import { MetadataService } from "../metadata/metadata.service";
import type {
  Episode,
  MetadataProviderName,
  SearchResult,
} from "../metadata/metadata-provider.interface";
import type {
  ProviderEpisodeDto,
  ProviderSearchResultDto,
  ProviderTvSearchResultDto,
} from "./dto/provider-search.dto";

const MAX_PROVIDER_RESULTS = 10;
const MAX_TMDB_TV_CANDIDATES = 5;
const MAX_TMDB_SEASONS_PER_SHOW = 50;

@Injectable()
export class ProviderSearchService {
  constructor(private readonly metadataService: MetadataService) { }

  async searchMovies(
    userId: string,
    query: string,
  ): Promise<ProviderSearchResultDto[]> {
    return this.search(userId, query, MediaType.MOVIE, "tmdb");
  }

  async searchGames(
    userId: string,
    query: string,
  ): Promise<ProviderSearchResultDto[]> {
    return this.search(userId, query, MediaType.GAME, "igdb");
  }

  async searchBoardGames(
    userId: string,
    query: string,
  ): Promise<ProviderSearchResultDto[]> {
    return this.search(userId, query, MediaType.BOARD_GAME, "bgg");
  }

  async searchTvShows(
    userId: string,
    query: string,
  ): Promise<ProviderTvSearchResultDto[]> {
    const { provider, apiKey } = await this.resolveProvider(
      userId,
      MediaType.TV_SHOW,
      "tmdb",
    );

    const getEpisodes = provider.getEpisodes?.bind(provider);
    if (!getEpisodes) {
      throw new BadGatewayException("TMDB search is temporarily unavailable");
    }

    try {
      const candidates = (await provider.search(query, apiKey))
        .slice(0, MAX_TMDB_TV_CANDIDATES);
      return await Promise.all(
        candidates.map(async (candidate) => {
          const detail = await provider.getById(candidate.externalId, apiKey);
          const seasonNumbers = detail.seasonNumbers ?? [];
          if (seasonNumbers.length > MAX_TMDB_SEASONS_PER_SHOW) {
            throw new Error("TMDB show has too many seasons to expand safely");
          }

          const episodeGroups = await Promise.all(
            seasonNumbers.map((seasonNumber) =>
              getEpisodes(candidate.externalId, seasonNumber, apiKey),
            ),
          );
          return {
            ...this.mapResult(candidate),
            episodes: episodeGroups.flat().map(this.mapEpisode),
          };
        }),
      );
    } catch (error) {
      this.throwSafeProviderError(error, "TMDB");
    }
  }

  private async search(
    userId: string,
    query: string,
    mediaType: MediaType,
    providerName: MetadataProviderName,
  ): Promise<ProviderSearchResultDto[]> {
    const { provider, apiKey } = await this.resolveProvider(
      userId,
      mediaType,
      providerName,
    );
    try {
      const results = await provider.search(query, apiKey);
      return results.slice(0, MAX_PROVIDER_RESULTS).map(this.mapResult);
    } catch (error) {
      this.throwSafeProviderError(error, providerName.toUpperCase());
    }
  }

  private async resolveProvider(
    userId: string,
    mediaType: MediaType,
    providerName: MetadataProviderName,
  ) {
    const resolved = await this.metadataService.getProviderForUser(
      mediaType,
      userId,
      { providerOverride: providerName },
    );
    if (!resolved.apiKey) {
      throw new HttpException(
        `${this.providerLabel(providerName)} credential configuration is required`,
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    return resolved;
  }

  private mapResult(result: SearchResult): ProviderSearchResultDto {
    return {
      externalId: result.externalId,
      title: result.title,
      type: result.type,
      year: result.year,
      imageUrl: result.imageUrl,
      description: result.description,
      tags: result.tags,
    };
  }

  private mapEpisode(episode: Episode): ProviderEpisodeDto {
    return {
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      description: episode.description,
      duration: episode.duration,
      externalId: episode.externalId,
      imageUrl: episode.imageSourceUrl,
    };
  }

  private throwSafeProviderError(error: unknown, providerName: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    if (
      error instanceof Error &&
      (/rate limit/i.test(error.message) || /status 429/i.test(error.message))
    ) {
      throw new HttpException(
        `${providerName} search is temporarily rate limited`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw new BadGatewayException(
      `${providerName} search is temporarily unavailable`,
    );
  }

  private providerLabel(providerName: MetadataProviderName): string {
    const labels: Record<MetadataProviderName, string> = {
      tmdb: "TMDB",
      anilist: "AniList",
      igdb: "IGDB",
      bgg: "BoardGameGeek",
      musicbrainz: "MusicBrainz",
    };
    return labels[providerName];
  }
}
