import { Injectable } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import {
  Episode,
  IMetadataProvider,
  MediaItemDetail,
  SearchResult,
} from "./metadata-provider.interface";
import { stripExternalIdPrefix } from "./provider-utils";

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
}

interface TmdbEpisode {
  id: number;
  season_number: number;
  episode_number: number;
  name: string;
  overview?: string;
  runtime?: number | null;
  still_path?: string | null;
}

@Injectable()
export class TmdbProvider implements IMetadataProvider {
  readonly name = "tmdb" as const;
  private readonly baseUrl = "https://api.themoviedb.org/3";
  private readonly imageBaseUrl = "https://image.tmdb.org/t/p/w500";

  constructor(private readonly mediaType: MediaType = MediaType.TV_SHOW) {
    if (mediaType !== MediaType.MOVIE && mediaType !== MediaType.TV_SHOW) {
      throw new Error("TMDB only supports movies and TV shows");
    }
  }

  async search(query: string, apiKey?: string): Promise<SearchResult[]> {
    const resource = this.mediaType === MediaType.MOVIE ? "movie" : "tv";
    const response = await this.request<{ results: TmdbItem[] }>(
      `/search/${resource}`,
      apiKey,
      { query },
    );
    return response.results.map((item) => this.mapItem(item));
  }

  async getById(externalId: string, apiKey?: string): Promise<MediaItemDetail> {
    const prefixedType = externalId.startsWith("movie:")
      ? MediaType.MOVIE
      : externalId.startsWith("tv:")
        ? MediaType.TV_SHOW
        : this.mediaType;
    const resource = prefixedType === MediaType.MOVIE ? "movie" : "tv";
    const item = await this.request<TmdbItem>(
      `/${resource}/${stripExternalIdPrefix(externalId)}`,
      apiKey,
    );
    return this.mapItem(item, prefixedType);
  }

  async getEpisodes(
    showId: string,
    season = 1,
    apiKey?: string,
  ): Promise<Episode[]> {
    const response = await this.request<{ episodes: TmdbEpisode[] }>(
      `/tv/${stripExternalIdPrefix(showId)}/season/${season}`,
      apiKey,
    );
    return response.episodes.map((episode) => ({
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      title: episode.name,
      description: episode.overview || undefined,
      duration: episode.runtime ?? undefined,
      externalId: `tmdb:${episode.id}`,
      imageSourceUrl: episode.still_path
        ? `${this.imageBaseUrl}${episode.still_path}`
        : undefined,
    }));
  }

  private async request<T>(
    path: string,
    apiKey?: string,
    parameters: Record<string, string> = {},
  ): Promise<T> {
    if (!apiKey) {
      throw new Error("TMDB API key not configured. Add it in Settings.");
    }

    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("api_key", apiKey);
    for (const [key, value] of Object.entries(parameters)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url);
    if (response.status === 401) {
      throw new Error("Invalid TMDB API key");
    }
    if (response.status === 429) {
      throw new Error("TMDB rate limit reached. Please try again shortly.");
    }
    if (!response.ok) {
      throw new Error(`TMDB request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  }

  private mapItem(item: TmdbItem, mediaType = this.mediaType): MediaItemDetail {
    const date = item.release_date ?? item.first_air_date;
    const prefix = mediaType === MediaType.MOVIE ? "movie" : "tv";
    return {
      externalId: `${prefix}:${item.id}`,
      title: item.title ?? item.name ?? "Untitled",
      year: date ? Number.parseInt(date.slice(0, 4), 10) : undefined,
      imageUrl: item.poster_path
        ? `${this.imageBaseUrl}${item.poster_path}`
        : undefined,
      description: item.overview || undefined,
      duration: item.runtime ?? item.episode_run_time?.[0] ?? undefined,
      seasonCount: item.number_of_seasons,
      type: mediaType,
    };
  }
}
