import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import Fuse from "fuse.js";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { Events } from "../../infrastructure/events/event-names";

export interface SearchResult {
  id: string;
  title: string;
  type: string;
}

interface IndexedMediaItem extends SearchResult {
  aliases: { alias: string }[];
}

interface CachedIndex {
  index: Fuse<IndexedMediaItem>;
  builtAt: Date;
}

@Injectable()
export class SearchService {
  private readonly indexes = new Map<string, CachedIndex>();
  private readonly cacheTtlMs = 10 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) { }

  async getIndex(userId: string): Promise<Fuse<IndexedMediaItem>> {
    const cached = this.indexes.get(userId);
    if (cached && Date.now() - cached.builtAt.getTime() < this.cacheTtlMs) {
      return cached.index;
    }

    const mediaItems = await this.prisma.mediaItem.findMany({
      where: {
        OR: [{ createdByUserId: userId }, { logEntries: { some: { userId } } }],
      },
      select: {
        id: true,
        title: true,
        type: true,
        aliases: { select: { alias: true } },
      },
    });

    const index = new Fuse<IndexedMediaItem>(mediaItems, {
      keys: ["title", "aliases.alias"],
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
      if (!seen.has(item.id)) {
        seen.add(item.id);
        target.push({ id: item.id, title: item.title, type: item.type });
      }
    }

    return [...exactAndPrefix, ...fuzzy].slice(0, 50);
  }

  @OnEvent(Events.MEDIA_ITEM_CHANGED)
  invalidateIndex(event: { userId: string }): void {
    this.indexes.delete(event.userId);
  }
}
