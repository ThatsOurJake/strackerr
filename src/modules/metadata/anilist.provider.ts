import { Injectable } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import {
  Episode,
  IMetadataProvider,
  MediaItemDetail,
  SearchResult,
} from "./metadata-provider.interface";
import { stripExternalIdPrefix, stripHtml } from "./provider-utils";

interface AniListMedia {
  id: number;
  title: { english?: string | null; romaji?: string | null; native?: string | null };
  startDate?: { year?: number | null };
  coverImage?: { large?: string | null };
  description?: string | null;
  episodes?: number | null;
  averageEpisodeDuration?: number | null;
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  startDate { year }
  coverImage { large }
  description(asHtml: false)
  episodes
  averageEpisodeDuration
`;

@Injectable()
export class AniListProvider implements IMetadataProvider {
  readonly name = "anilist" as const;
  private readonly endpoint = "https://graphql.anilist.co";

  async search(query: string): Promise<SearchResult[]> {
    const data = await this.request<{ Page: { media: AniListMedia[] } }>(
      `query ($search: String) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: ANIME) { ${MEDIA_FIELDS} }
        }
      }`,
      { search: query },
    );
    return data.Page.media.map((item) => this.mapItem(item));
  }

  async getById(externalId: string): Promise<MediaItemDetail> {
    const media = await this.getMedia(stripExternalIdPrefix(externalId));
    return this.mapItem(media);
  }

  async getEpisodes(showId: string): Promise<Episode[]> {
    const media = await this.getMedia(stripExternalIdPrefix(showId));
    const episodeCount = media.episodes ?? 0;
    const duration = media.averageEpisodeDuration
      ? Math.round(media.averageEpisodeDuration / 60)
      : undefined;

    return Array.from({ length: episodeCount }, (_, index) => ({
      seasonNumber: 1,
      episodeNumber: index + 1,
      title: `Episode ${index + 1}`,
      duration,
    }));
  }

  private async getMedia(id: string): Promise<AniListMedia> {
    const data = await this.request<{ Media: AniListMedia }>(
      `query ($id: Int) {
        Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} }
      }`,
      { id: Number.parseInt(id, 10) },
    );
    return data.Media;
  }

  private async request<T>(
    query: string,
    variables: Record<string, string | number>,
  ): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (response.status === 429) {
      throw new Error("AniList rate limit reached. Please try again shortly.");
    }
    if (!response.ok) {
      throw new Error(`AniList request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as { data?: T; errors?: unknown[] };
    if (!payload.data || payload.errors?.length) {
      throw new Error("AniList returned an invalid response");
    }
    return payload.data;
  }

  private mapItem(item: AniListMedia): MediaItemDetail {
    return {
      externalId: `anilist:${item.id}`,
      title:
        item.title.english ?? item.title.romaji ?? item.title.native ?? "Untitled",
      year: item.startDate?.year ?? undefined,
      imageUrl: item.coverImage?.large ?? undefined,
      description: stripHtml(item.description),
      duration: item.averageEpisodeDuration
        ? Math.round(item.averageEpisodeDuration / 60)
        : undefined,
      type: MediaType.TV_SHOW,
    };
  }
}
