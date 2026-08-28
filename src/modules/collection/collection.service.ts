import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MediaItem, MediaType, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";

export const COLLECTION_PAGE_SIZE = 48;
export const COLLECTION_MEDIA_TYPES = [
  MediaType.MOVIE,
  MediaType.TV_SHOW,
  MediaType.GAME,
  MediaType.BOARD_GAME,
  MediaType.MUSIC_TRACK,
] as const;

export type CollectionMediaType = (typeof COLLECTION_MEDIA_TYPES)[number];

export interface CollectionFilters {
  type?: CollectionMediaType;
  unidentified?: boolean;
  letter?: string;
  page?: number;
}

export interface CollectionPage {
  items: MediaItem[];
  availableLetters: Set<string>;
  page: number;
  totalPages: number;
  totalItems: number;
}

const detailInclude = {
  logEntries: {
    orderBy: { loggedAt: "desc" },
  },
  episodes: {
    orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
    include: {
      logEntries: {
        orderBy: { loggedAt: "desc" },
      },
    },
  },
} satisfies Prisma.MediaItemInclude;

export type MediaDetail = Prisma.MediaItemGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) { }

  isCollectionType(type: string): type is CollectionMediaType {
    return COLLECTION_MEDIA_TYPES.includes(type as CollectionMediaType);
  }

  async findCollection(userId: string, filters: CollectionFilters): Promise<CollectionPage> {
    const items = await this.prisma.mediaItem.findMany({
      where: {
        type: filters.type ?? { in: [...COLLECTION_MEDIA_TYPES] },
        isSkeleton: filters.unidentified ? true : undefined,
        OR: [
          { createdByUserId: userId },
          { logEntries: { some: { userId } } },
          {
            type: MediaType.TV_SHOW,
            episodes: { some: { logEntries: { some: { userId } } } },
          },
        ],
      },
    });

    const sortedItems = items.sort((left, right) =>
      left.sortTitle.localeCompare(right.sortTitle, undefined, { sensitivity: "base" }),
    );
    const availableLetters = new Set(sortedItems.map((item) => this.letterFor(item.sortTitle)));
    const letterItems = filters.letter
      ? sortedItems.filter((item) => this.letterFor(item.sortTitle) === filters.letter)
      : sortedItems;
    const totalItems = letterItems.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / COLLECTION_PAGE_SIZE));
    const page = Math.min(Math.max(filters.page ?? 1, 1), totalPages);
    const start = (page - 1) * COLLECTION_PAGE_SIZE;

    return {
      items: letterItems.slice(start, start + COLLECTION_PAGE_SIZE),
      availableLetters,
      page,
      totalPages,
      totalItems,
    };
  }

  async findDetail(userId: string, requestedId: string): Promise<MediaDetail> {
    const requestedItem = await this.prisma.mediaItem.findUnique({
      where: { id: requestedId },
      select: { id: true, type: true, parentId: true },
    });
    if (!requestedItem) {
      throw new NotFoundException("Media item not found");
    }

    const item = await this.prisma.mediaItem.findUnique({
      where: {
        id: requestedItem.type === MediaType.TV_EPISODE
          ? requestedItem.parentId ?? requestedItem.id
          : requestedItem.id,
      },
      include: {
        logEntries: {
          where: { userId },
          orderBy: { loggedAt: "desc" },
        },
        episodes: {
          orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
          include: {
            logEntries: {
              where: { userId },
              orderBy: { loggedAt: "desc" },
            },
          },
        },
      },
    });
    if (!item) {
      throw new NotFoundException("Media item not found");
    }

    const hasConnection = item.createdByUserId === userId
      || item.logEntries.length > 0
      || item.episodes.some((episode) => episode.logEntries.length > 0);
    if (!hasConnection) {
      throw new ForbiddenException("You do not have access to this media item");
    }

    return item;
  }

  private letterFor(sortTitle: string): string {
    const firstCharacter = sortTitle.trim().charAt(0).toUpperCase();
    return /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
  }
}
