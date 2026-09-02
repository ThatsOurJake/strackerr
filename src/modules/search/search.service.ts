import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { MediaType } from "@prisma/client";
import Fuse from "fuse.js";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { Events } from "../../infrastructure/events/event-names";

export interface SearchResult {
  id: string;
  title: string;
  type: MediaType;
  path: string;
  label: string;
  group: string;
  subtitle?: string;
}

interface IndexedMediaItem {
  id: string;
  title: string;
  type: MediaType;
  aliases: { alias: string }[];
  parentId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  parent: {
    id: string;
    title: string;
    type: MediaType;
  } | null;
}

interface CachedIndex {
  index: Fuse<IndexedMediaItem>;
  builtAt: Date;
}

@Injectable()
export class SearchService {
  private readonly indexes = new Map<string, CachedIndex>();
  private readonly cacheTtlMs = 10 * 60 * 1000;
  private readonly typeDetails: Record<MediaType, { path: string; label: string; group: string }> = {
    [MediaType.MOVIE]: { path: "movie", label: "Movie", group: "Movies" },
    [MediaType.TV_SHOW]: { path: "tv", label: "TV show", group: "TV" },
    [MediaType.TV_EPISODE]: { path: "tv", label: "Episode", group: "TV" },
    [MediaType.GAME]: { path: "game", label: "Game", group: "Games" },
    [MediaType.BOARD_GAME]: { path: "board-game", label: "Board game", group: "Board games" },
    [MediaType.MUSIC_TRACK]: { path: "music", label: "Music", group: "Music" },
  };

  constructor(private readonly prisma: PrismaService) { }

  async getIndex(userId: string): Promise<Fuse<IndexedMediaItem>> {
    const cached = this.indexes.get(userId);
    if (cached && Date.now() - cached.builtAt.getTime() < this.cacheTtlMs) {
      return cached.index;
    }

    const mediaItems = await this.prisma.mediaItem.findMany({
      where: {
        OR: [
          { createdByUserId: userId },
          { logEntries: { some: { userId } } },
          {
            type: MediaType.TV_SHOW,
            episodes: { some: { logEntries: { some: { userId } } } },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        aliases: { select: { alias: true } },
        parentId: true,
        seasonNumber: true,
        episodeNumber: true,
        parent: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    const index = new Fuse<IndexedMediaItem>(mediaItems, {
      keys: ["title", "aliases.alias", "parent.title"],
      threshold: 0.4,
      ignoreLocation: true,
    });
    this.indexes.set(userId, { index, builtAt: new Date() });
    return index;
  }

  async search(userId: string, query: string): Promise<SearchResult[]> {
    const index = await this.getIndex(userId);
    const normalisedQuery = query.trim().toLowerCase();
    if (!normalisedQuery) {
      return [];
    }

    const fuzzyResults = index.search(normalisedQuery);
    const exactAndPrefix: SearchResult[] = [];
    const fuzzy: SearchResult[] = [];
    const seen = new Set<string>();
    const seenEpisodeParentShows = new Set<string>();

    const pushResult = (
      bucket: SearchResult[],
      key: string,
      result: SearchResult,
    ) => {
      if (!seen.has(key)) {
        seen.add(key);
        bucket.push(result);
      }
    };

    for (const result of fuzzyResults) {
      const item = result.item;
      const matches = [
        item.title,
        ...item.aliases.map((alias) => alias.alias),
      ].map((value) => value.toLowerCase());
      const isExactOrPrefix = matches.some(
        (value) =>
          value === normalisedQuery || value.startsWith(normalisedQuery),
      );
      const target = isExactOrPrefix ? exactAndPrefix : fuzzy;

      if (item.type === MediaType.TV_EPISODE && item.parent) {
        pushResult(target, `item:${item.id}`, this.mapEpisodeResult(item));

        if (!seenEpisodeParentShows.has(item.parent.id)) {
          seenEpisodeParentShows.add(item.parent.id);
          pushResult(target, `item:${item.parent.id}`, {
            id: item.parent.id,
            title: item.parent.title,
            type: MediaType.TV_SHOW,
            subtitle: "From your collection",
            ...this.typeDetails[MediaType.TV_SHOW],
          });
        }
        continue;
      }

      pushResult(target, `item:${item.id}`, {
        id: item.id,
        title: item.title,
        type: item.type,
        ...this.typeDetails[item.type],
      });
    }

    return [...exactAndPrefix, ...fuzzy].slice(0, 50);
  }

  private mapEpisodeResult(item: IndexedMediaItem): SearchResult {
    const details = this.typeDetails[MediaType.TV_EPISODE];
    const season = String(item.seasonNumber ?? 0).padStart(2, "0");
    const episode = String(item.episodeNumber ?? 0).padStart(2, "0");
    const parentTitle = item.parent?.title ?? "TV show";
    return {
      id: item.id,
      title: parentTitle,
      type: MediaType.TV_EPISODE,
      path: details.path,
      label: details.label,
      group: details.group,
      subtitle: `S${season}E${episode} - ${item.title}`,
    };
  }

  @OnEvent(Events.MEDIA_ITEM_CHANGED)
  invalidateIndex(event: { userId: string }): void {
    this.indexes.delete(event.userId);
  }
}
