import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MediaItem, MediaType, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { stripHtmlTags } from "../../infrastructure/security/sanitize-string";
import { normalizeExternalAlias } from "../media/external-alias.validator";

export const COLLECTION_PAGE_SIZE = 48;
export const COLLECTION_MEDIA_TYPES = [
  MediaType.MOVIE,
  MediaType.TV_SHOW,
  MediaType.GAME,
  MediaType.BOARD_GAME,
  MediaType.MUSIC_TRACK,
] as const;

const COLLECTION_ALL_MEDIA_TYPES = COLLECTION_MEDIA_TYPES.filter(
  (type) => type !== MediaType.MUSIC_TRACK,
);

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

export interface ExternalAliasDraft {
  id?: string;
  providerNamespace: string;
  externalId: string;
  remove?: boolean;
}

export interface ItemBulkEditInput {
  title: string;
  description: string | null;
  removeLogEntryIds: string[];
  aliases: ExternalAliasDraft[];
}

export interface ItemBulkEditResult {
  itemId: string;
  stillAccessible: boolean;
}

const detailInclude = {
  externalIds: {
    orderBy: { provider: "asc" },
  },
  externalAliases: {
    orderBy: [{ providerNamespace: "asc" }, { externalId: "asc" }],
  },
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
        type: filters.type ?? { in: [...COLLECTION_ALL_MEDIA_TYPES] },
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
        externalIds: {
          orderBy: { provider: "asc" },
        },
        externalAliases: {
          orderBy: [{ providerNamespace: "asc" }, { externalId: "asc" }],
        },
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

  async bulkEditItem(
    userId: string,
    requestedId: string,
    input: ItemBulkEditInput,
  ): Promise<ItemBulkEditResult> {
    const item = await this.findDetail(userId, requestedId);
    const title = stripHtmlTags(input.title).trim();
    if (!title) {
      throw new BadRequestException("Title is required");
    }

    const allowedLogEntryIds = new Set<string>([
      ...item.logEntries.map((entry) => entry.id),
      ...item.episodes.flatMap((episode) => episode.logEntries.map((entry) => entry.id)),
    ]);

    const dedupedRemovalIds = [...new Set(input.removeLogEntryIds)];
    for (const logEntryId of dedupedRemovalIds) {
      if (!allowedLogEntryIds.has(logEntryId)) {
        throw new ForbiddenException("You cannot remove one or more selected history rows");
      }
    }

    const stillAccessible = item.createdByUserId === userId
      || allowedLogEntryIds.size - dedupedRemovalIds.length > 0;

    const finalAliases = input.aliases
      .filter((alias) => !alias.remove)
      .map((alias) => ({
        id: alias.id,
        providerNamespace: alias.providerNamespace.trim(),
        externalId: alias.externalId.trim(),
      }))
      .filter((alias) => alias.providerNamespace || alias.externalId);

    const normalizedAliases = finalAliases.map((alias, index) => {
      if (!alias.providerNamespace || !alias.externalId) {
        throw new BadRequestException(
          `Alias row ${index + 1} must include both provider and external ID`,
        );
      }
      return {
        id: alias.id,
        ...normalizeExternalAlias(alias.providerNamespace, alias.externalId),
      };
    });

    const seenAliases = new Set<string>();
    for (const alias of normalizedAliases) {
      const key = `${alias.providerNamespace}::${alias.externalId}`;
      if (seenAliases.has(key)) {
        throw new ConflictException("Duplicate aliases are not allowed");
      }
      seenAliases.add(key);
    }

    await this.prisma.$transaction(async (transaction) => {
      const existingAliases = await transaction.mediaExternalAlias.findMany({
        where: { mediaItemId: item.id },
        select: { id: true },
      });
      const existingAliasIds = new Set(existingAliases.map((alias) => alias.id));

      for (const alias of input.aliases) {
        if (alias.id && !existingAliasIds.has(alias.id)) {
          throw new ForbiddenException("You cannot edit one or more selected aliases");
        }
      }

      if (normalizedAliases.length > 0) {
        const aliasOrClauses = normalizedAliases.map((alias) => ({
          providerNamespace: alias.providerNamespace,
          externalId: alias.externalId,
        }));

        const aliasConflicts = await transaction.mediaExternalAlias.findMany({
          where: {
            OR: aliasOrClauses,
            mediaItemId: { not: item.id },
          },
          select: {
            providerNamespace: true,
            externalId: true,
          },
        });
        if (aliasConflicts.length > 0) {
          throw new ConflictException("Alias is already assigned to another media item");
        }

        const canonicalConflicts = await transaction.mediaExternalId.findMany({
          where: {
            OR: normalizedAliases.map((alias) => ({
              provider: alias.providerNamespace,
              externalId: alias.externalId,
            })),
            mediaItemId: { not: item.id },
          },
          select: {
            provider: true,
            externalId: true,
          },
        });
        if (canonicalConflicts.length > 0) {
          throw new ConflictException("Alias conflicts with an existing canonical provider ID");
        }
      }

      await transaction.mediaItem.update({
        where: { id: item.id },
        data: {
          title,
          sortTitle: CollectionService.computeSortTitle(title),
          description: input.description?.trim() ? stripHtmlTags(input.description) : null,
        },
      });

      if (dedupedRemovalIds.length > 0) {
        const deleted = await transaction.logEntry.deleteMany({
          where: {
            id: { in: dedupedRemovalIds },
            userId,
          },
        });
        if (deleted.count !== dedupedRemovalIds.length) {
          throw new ForbiddenException("You cannot remove one or more selected history rows");
        }
      }

      await transaction.mediaExternalAlias.deleteMany({ where: { mediaItemId: item.id } });
      if (normalizedAliases.length > 0) {
        await transaction.mediaExternalAlias.createMany({
          data: normalizedAliases.map((alias) => ({
            mediaItemId: item.id,
            providerNamespace: alias.providerNamespace,
            externalId: alias.externalId,
          })),
        });
      }
    });

    return {
      itemId: item.id,
      stillAccessible,
    };
  }

  private letterFor(sortTitle: string): string {
    const firstCharacter = sortTitle.trim().charAt(0).toUpperCase();
    return /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
  }

  private static computeSortTitle(title: string): string {
    const withoutArticle = title.trim().replace(/^(the|a|an)\s+/i, "");
    return /^[^\p{Script=Latin}]|^\d/u.test(withoutArticle)
      ? `#${withoutArticle.toLowerCase()}`
      : withoutArticle.toLowerCase();
  }
}
