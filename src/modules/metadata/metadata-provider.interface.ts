import { MediaType } from "@prisma/client";

export const METADATA_PROVIDER_NAMES = [
  "tmdb",
  "anilist",
  "igdb",
  "bgg",
  "musicbrainz",
] as const;

export type MetadataProviderName = (typeof METADATA_PROVIDER_NAMES)[number];

export interface SearchResult {
  externalId: string;
  title: string;
  year?: number;
  imageUrl?: string;
  description?: string;
  type: MediaType;
}

export interface MediaItemDetail extends SearchResult {
  duration?: number;
}

export interface Episode {
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description?: string;
  duration?: number;
  externalId?: string;
}

export interface IMetadataProvider {
  readonly name: MetadataProviderName;
  search(query: string, apiKey?: string): Promise<SearchResult[]>;
  getById(externalId: string, apiKey?: string): Promise<MediaItemDetail>;
  getEpisodes?(
    showId: string,
    season?: number,
    apiKey?: string,
  ): Promise<Episode[]>;
}

export interface ResolvedMetadataProvider {
  provider: IMetadataProvider;
  apiKey?: string;
}
