import { Injectable } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import {
  IMetadataProvider,
  MediaItemDetail,
  SearchResult,
} from "./metadata-provider.interface";
import { stripExternalIdPrefix, wait } from "./provider-utils";

interface MusicBrainzRecording {
  id: string;
  title: string;
  length?: number | null;
  "artist-credit"?: Array<{ artist?: { name?: string } }>;
  releases?: Array<{ date?: string }>;
}

@Injectable()
export class MusicBrainzProvider implements IMetadataProvider {
  readonly name = "musicbrainz" as const;
  private readonly baseUrl = "https://musicbrainz.org/ws/2";
  private readonly userAgent = "STrackerr/1.0 (https://github.com/strackrr)";
  private requestQueue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;

  async search(query: string): Promise<SearchResult[]> {
    const url = new URL(`${this.baseUrl}/recording`);
    url.searchParams.set("query", query);
    url.searchParams.set("fmt", "json");
    url.searchParams.set("limit", "10");
    const response = await this.request<{ recordings: MusicBrainzRecording[] }>(url);
    return response.recordings.map((recording) => this.mapRecording(recording));
  }

  async getById(externalId: string): Promise<MediaItemDetail> {
    const id = stripExternalIdPrefix(externalId);
    const url = new URL(`${this.baseUrl}/recording/${id}`);
    url.searchParams.set("fmt", "json");
    url.searchParams.set("inc", "artist-credits+releases");
    const recording = await this.request<MusicBrainzRecording>(url);
    return this.mapRecording(recording);
  }

  private async request<T>(url: URL): Promise<T> {
    let resolveResult: (value: T) => void;
    let rejectResult: (reason: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    this.requestQueue = this.requestQueue.then(async () => {
      try {
        const remainingDelay = 1_000 - (Date.now() - this.lastRequestAt);
        if (remainingDelay > 0) {
          await wait(remainingDelay);
        }
        this.lastRequestAt = Date.now();
        const response = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
        });
        if (response.status === 429) {
          throw new Error(
            "MusicBrainz rate limit reached. Please try again shortly.",
          );
        }
        if (!response.ok) {
          throw new Error(
            `MusicBrainz request failed with status ${response.status}`,
          );
        }
        resolveResult((await response.json()) as T);
      } catch (error) {
        rejectResult(error);
      }
    });

    return result;
  }

  private mapRecording(recording: MusicBrainzRecording): MediaItemDetail {
    const artists =
      recording["artist-credit"]
        ?.map((credit) => credit.artist?.name)
        .filter((name): name is string => Boolean(name)) ?? [];
    const releaseYear = recording.releases?.[0]?.date?.slice(0, 4);
    return {
      externalId: `musicbrainz:${recording.id}`,
      title: recording.title,
      year: releaseYear ? Number.parseInt(releaseYear, 10) : undefined,
      description: artists.length > 0 ? artists.join(", ") : undefined,
      duration:
        recording.length !== null && recording.length !== undefined
          ? Math.round(recording.length / 60_000)
          : undefined,
      type: MediaType.MUSIC_TRACK,
    };
  }
}
