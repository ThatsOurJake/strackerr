import { Injectable, Logger } from "@nestjs/common";
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
  releases?: Array<{ id?: string; date?: string }>;
}

const TEMPORARY_FAILURE_MESSAGE =
  "MusicBrainz is temporarily unavailable. Please try again in a moment.";
const MAX_RETRY_ATTEMPTS = 3;

@Injectable()
export class MusicBrainzProvider implements IMetadataProvider {
  readonly name = "musicbrainz" as const;
  private readonly baseUrl = "https://musicbrainz.org/ws/2";
  private readonly userAgent = "STrackerr/1.0 (https://github.com/strackrr)";
  private readonly logger = new Logger(MusicBrainzProvider.name);
  private requestQueue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;

  async search(query: string): Promise<SearchResult[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/recording`);
    url.searchParams.set("query", this.buildSearchQuery(normalizedQuery));
    url.searchParams.set("fmt", "json");
    url.searchParams.set("limit", "10");
    url.searchParams.set("inc", "artist-credits+releases");
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
    const operation = this.requestQueue
      .catch(() => undefined)
      .then(async () => this.requestWithRetry<T>(url));
    this.requestQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private buildSearchQuery(query: string): string {
    const structured = this.parseStructuredFieldTerms(query);
    if (structured) {
      const parts: string[] = [];
      if (structured.artist) {
        parts.push(`artist:${this.escapeLuceneValue(structured.artist)}`);
      }
      if (structured.title) {
        parts.push(`recording:${this.escapeLuceneValue(structured.title)}`);
      }
      if (structured.year) {
        parts.push(`date:${this.escapeLuceneValue(structured.year)}`);
      }
      if (structured.freeText) {
        parts.push(this.escapeLuceneValue(structured.freeText));
      }
      return parts.join(" AND ");
    }

    const parsed = this.parseArtistAndTrack(query);
    if (!parsed) {
      return this.escapeLuceneValue(query);
    }

    return `artist:${this.escapeLuceneValue(parsed.artist)} AND recording:${this.escapeLuceneValue(parsed.track)}`;
  }

  private parseStructuredFieldTerms(
    query: string,
  ): { artist?: string; title?: string; year?: string; freeText?: string } | null {
    const matches = [...query.matchAll(/(?:^|\s)(artist|title|year):"((?:\\"|[^"])*)"/gi)];
    if (matches.length === 0) {
      return null;
    }

    const parsed: { artist?: string; title?: string; year?: string; freeText?: string } = {};
    for (const match of matches) {
      const field = match[1]?.toLowerCase();
      const value = (match[2] ?? "").replace(/\\"/g, '"').trim();
      if (!value) {
        continue;
      }

      if (field === "artist") {
        parsed.artist = value;
      }
      if (field === "title") {
        parsed.title = value;
      }
      if (field === "year") {
        parsed.year = value;
      }
    }

    const remaining = query
      .replace(/(?:^|\s)(artist|title|year):"((?:\\"|[^"])*)"/gi, " ")
      .trim()
      .replace(/\s+/g, " ");
    if (remaining) {
      parsed.freeText = remaining;
    }

    return parsed;
  }

  private parseArtistAndTrack(query: string): { artist: string; track: string } | null {
    const colonMatch = query.match(/^(.+?)\s*:\s*(.+)$/);
    if (colonMatch) {
      const artist = colonMatch[1].trim();
      const track = colonMatch[2].trim();
      if (artist && track) {
        return { artist, track };
      }
    }

    const hyphenMatch = query.match(/^(.+?)\s-\s(.+)$/);
    if (hyphenMatch) {
      const artist = hyphenMatch[1].trim();
      const track = hyphenMatch[2].trim();
      if (artist && track) {
        return { artist, track };
      }
    }

    return null;
  }

  private escapeLuceneValue(value: string): string {
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/&&/g, "\\&&")
      .replace(/\|\|/g, "\\||")
      .replace(/([+!(){}[\]^"~*?:/-])/g, "\\$1");
    return `"${escaped}"`;
  }

  private async requestWithRetry<T>(url: URL): Promise<T> {
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
      await this.waitForThrottleWindow();

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        const temporary = response.status === 429 || response.status === 503;
        if (temporary) {
          this.logger.warn(
            `Temporary MusicBrainz response status=${response.status} attempt=${attempt}`,
          );
          if (attempt < MAX_RETRY_ATTEMPTS) {
            await wait(this.retryDelayMs(response));
            continue;
          }
          this.logger.error(
            `MusicBrainz temporary failure after retries status=${response.status}`,
          );
          throw new Error(TEMPORARY_FAILURE_MESSAGE);
        }

        throw new Error(
          `MusicBrainz request failed with status ${response.status}`,
        );
      } catch (error) {
        this.logger.warn(
          `MusicBrainz request attempt failed attempt=${attempt} message=${error instanceof Error ? error.message : "unknown"}`,
        );
        if (attempt >= MAX_RETRY_ATTEMPTS) {
          throw error instanceof Error
            ? error
            : new Error(TEMPORARY_FAILURE_MESSAGE);
        }

        await wait(1_000);
      }
    }

    throw new Error(TEMPORARY_FAILURE_MESSAGE);
  }

  private async waitForThrottleWindow(): Promise<void> {
    const remainingDelay = 1_000 - (Date.now() - this.lastRequestAt);
    if (remainingDelay > 0) {
      await wait(remainingDelay);
    }
    this.lastRequestAt = Date.now();
  }

  private retryDelayMs(response: Response): number {
    const retryAfter = response.headers.get("retry-after");
    if (!retryAfter) {
      return 1_000;
    }

    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1_000, 5_000);
    }

    const retryDate = Date.parse(retryAfter);
    if (!Number.isNaN(retryDate)) {
      return Math.min(Math.max(0, retryDate - Date.now()), 5_000);
    }

    return 1_000;
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
      imageUrl: this.coverArtUrl(recording.releases),
      description: artists.length > 0 ? artists.join(", ") : undefined,
      duration:
        recording.length !== null && recording.length !== undefined
          ? Math.round(recording.length / 60_000)
          : undefined,
      type: MediaType.MUSIC_TRACK,
    };
  }

  private coverArtUrl(
    releases: MusicBrainzRecording["releases"],
  ): string | undefined {
    const releaseId = releases?.find((release) => Boolean(release.id))?.id;
    if (!releaseId) {
      return undefined;
    }

    return `https://coverartarchive.org/release/${releaseId}/front-250`;
  }
}
