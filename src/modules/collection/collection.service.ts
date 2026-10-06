import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  MediaItem,
  MediaType,
  MergeRedirectIdentityKind,
  Prisma,
  TagLinkSource,
} from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { Events } from "../../infrastructure/events/event-names";
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
  addTags: string[];
  removeTagIds: string[];
}

export interface ItemBulkEditResult {
  itemId: string;
  stillAccessible: boolean;
}

export interface ItemRemovalResult {
  removed: boolean;
  itemTitle?: string;
}

export const MERGE_METADATA_FIELDS = [
  "title",
  "description",
  "year",
  "duration",
  "artwork",
  "isSkeleton",
] as const;

export type MergeMetadataField = (typeof MERGE_METADATA_FIELDS)[number];

export interface MergeMediaItemsInput {
  sourceId: string;
  targetId: string;
  sourceFields: MergeMetadataField[];
}

export interface MediaItemMergeResult {
  targetItemId: string;
  sourceItemId: string;
  deletedMediaItemIds: string[];
}

const detailInclude = {
  externalIds: {
    orderBy: { provider: "asc" },
  },
  externalAliases: {
    orderBy: [{ providerNamespace: "asc" }, { externalId: "asc" }],
  },
  mediaTags: {
    include: {
      tag: true,
    },
    orderBy: [
      { source: "asc" },
      { providerNamespace: "asc" },
      { tag: { displayName: "asc" } },
    ],
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

const mergeItemInclude = {
  aliases: true,
  externalIds: true,
  externalAliases: true,
  mediaTags: true,
  logEntries: true,
  episodes: {
    include: {
      aliases: true,
      externalIds: true,
      externalAliases: true,
      mediaTags: true,
      logEntries: true,
    },
  },
} satisfies Prisma.MediaItemInclude;

type MergeMediaItem = Prisma.MediaItemGetPayload<{ include: typeof mergeItemInclude }>;
type MergeEpisode = MergeMediaItem["episodes"][number];
type MergeRelatedItem = Pick<
  MergeMediaItem,
  "id" | "title" | "aliases" | "externalIds" | "externalAliases" | "mediaTags" | "logEntries"
>;

@Injectable()
export class CollectionService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly events?: EventEmitter2,
  ) { }

  isCollectionType(type: string): type is CollectionMediaType {
    return COLLECTION_MEDIA_TYPES.includes(type as CollectionMediaType);
  }

  async findCollection(userId: string, filters: CollectionFilters): Promise<CollectionPage> {
    const items = await this.prisma.mediaItem.findMany({
      where: {
        type: filters.type ?? { in: [...COLLECTION_ALL_MEDIA_TYPES] },
        isSkeleton: filters.unidentified ? true : undefined,
        createdByUserId: userId,
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
    const requestedItem = await this.prisma.mediaItem.findFirst({
      where: { id: requestedId, createdByUserId: userId },
      select: { id: true, type: true, parentId: true },
    });
    if (!requestedItem) {
      const redirect = await this.prisma.mediaItemMergeRedirect.findFirst({
        where: { sourceMediaItemId: requestedId, userId },
        select: { targetMediaItemId: true },
      });
      if (!redirect) {
        throw new NotFoundException("Media item not found");
      }

      return this.findDetail(userId, redirect.targetMediaItemId);
    }

    const item = await this.prisma.mediaItem.findFirst({
      where: {
        id: requestedItem.type === MediaType.TV_EPISODE
          ? requestedItem.parentId ?? requestedItem.id
          : requestedItem.id,
        createdByUserId: userId,
      },
      include: {
        externalIds: {
          orderBy: { provider: "asc" },
        },
        externalAliases: {
          orderBy: [{ providerNamespace: "asc" }, { externalId: "asc" }],
        },
        mediaTags: {
          where: { userId },
          include: {
            tag: true,
          },
          orderBy: [
            { source: "asc" },
            { providerNamespace: "asc" },
            { tag: { displayName: "asc" } },
          ],
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

    return item;
  }

  async resolveItemId(userId: string, requestedId: string): Promise<string | null> {
    const item = await this.prisma.mediaItem.findFirst({
      where: { id: requestedId, createdByUserId: userId },
      select: { id: true },
    });
    if (item) {
      return item.id;
    }

    const redirect = await this.prisma.mediaItemMergeRedirect.findFirst({
      where: { sourceMediaItemId: requestedId, userId },
      select: { targetMediaItemId: true },
    });
    return redirect?.targetMediaItemId ?? null;
  }

  async findMergeCandidates(
    userId: string,
    sourceId: string,
    query: string,
  ): Promise<MediaItem[]> {
    const source = await this.prisma.mediaItem.findFirst({
      where: { id: sourceId, createdByUserId: userId },
      select: { id: true, type: true },
    });
    if (!source) {
      throw new NotFoundException("Media item not found");
    }
    if (source.type === MediaType.TV_EPISODE) {
      throw new BadRequestException("TV episodes are merged through their parent shows");
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    return this.prisma.mediaItem.findMany({
      where: {
        createdByUserId: userId,
        type: source.type,
        id: { not: source.id },
        OR: [
          { title: { contains: trimmedQuery } },
          {
            aliases: {
              some: {
                userId,
                alias: { contains: trimmedQuery },
              },
            },
          },
        ],
      },
      orderBy: { title: "asc" },
      take: 20,
    });
  }

  async mergeItemsForUser(
    userId: string,
    input: MergeMediaItemsInput,
  ): Promise<MediaItemMergeResult> {
    if (input.sourceId === input.targetId) {
      throw new BadRequestException("Choose two different media items to merge");
    }

    const sourceFields = new Set(input.sourceFields);
    if (sourceFields.size !== input.sourceFields.length) {
      throw new BadRequestException("Duplicate merge metadata selections are not allowed");
    }
    for (const field of sourceFields) {
      if (!MERGE_METADATA_FIELDS.includes(field)) {
        throw new BadRequestException("Unknown merge metadata selection");
      }
    }

    const result = await this.prisma.$transaction(async (transaction) => {
      const items = await transaction.mediaItem.findMany({
        where: {
          id: { in: [input.sourceId, input.targetId] },
          createdByUserId: userId,
        },
        include: mergeItemInclude,
      });
      if (items.length !== 2) {
        throw new NotFoundException("One or more media items could not be found");
      }

      const source = items.find((item) => item.id === input.sourceId);
      const target = items.find((item) => item.id === input.targetId);
      if (!source || !target) {
        throw new NotFoundException("One or more media items could not be found");
      }
      if (source.type !== target.type) {
        throw new BadRequestException("Only media items with the same type can be merged");
      }
      if (source.type === MediaType.TV_EPISODE) {
        throw new BadRequestException("TV episodes are merged through their parent shows");
      }

      const deletedMediaItemIds = await this.mergeItemData(
        transaction,
        userId,
        source,
        target,
        sourceFields,
      );

      await transaction.mediaItemMergeRedirect.updateMany({
        where: { userId, targetMediaItemId: source.id },
        data: { targetMediaItemId: target.id },
      });
      await transaction.mediaItemMergeRedirect.create({
        data: {
          userId,
          sourceMediaItemId: source.id,
          sourceTitle: source.title,
          targetMediaItemId: target.id,
          identities: {
            create: this.mergeRedirectIdentities(source),
          },
        },
      });

      await transaction.mediaItem.delete({ where: { id: source.id } });

      return { deletedMediaItemIds, source, target };
    });

    this.events?.emit(Events.MEDIA_ITEM_CHANGED, { userId });
    this.events?.emit(Events.LOG_ENTRY_CHANGED, { userId });
    for (const mediaItemId of result.deletedMediaItemIds) {
      this.events?.emit(Events.MEDIA_ITEM_DELETED, { mediaItemId });
    }
    if (
      sourceFields.has("artwork") &&
      result.source.imageSourceUrl
    ) {
      this.events?.emit(Events.IMAGE_CACHE, {
        mediaItemId: result.target.id,
        sourceUrl: result.source.imageSourceUrl,
      });
    }

    return {
      targetItemId: result.target.id,
      sourceItemId: result.source.id,
      deletedMediaItemIds: result.deletedMediaItemIds,
    };
  }

  private async mergeItemData(
    transaction: Prisma.TransactionClient,
    userId: string,
    source: MergeMediaItem,
    target: MergeMediaItem,
    sourceFields: Set<MergeMetadataField>,
  ): Promise<string[]> {
    const targetData: Prisma.MediaItemUpdateInput = {};
    if (sourceFields.has("title")) {
      targetData.title = source.title;
      targetData.sortTitle = CollectionService.computeSortTitle(source.title);
    }
    if (sourceFields.has("description")) {
      targetData.description = source.description;
    }
    if (sourceFields.has("year")) {
      targetData.year = source.year;
    }
    if (sourceFields.has("duration")) {
      targetData.duration = source.duration;
    }
    if (sourceFields.has("artwork")) {
      targetData.imageSourceUrl = source.imageSourceUrl;
      targetData.imageUrl = null;
    }
    if (sourceFields.has("isSkeleton")) {
      targetData.isSkeleton = source.isSkeleton;
    }
    if (Object.keys(targetData).length > 0) {
      await transaction.mediaItem.update({
        where: { id: target.id },
        data: targetData,
      });
    }

    await this.transferItemRelations(transaction, userId, source, target);

    const deletedMediaItemIds = [source.id];
    if (source.type !== MediaType.TV_SHOW) {
      return deletedMediaItemIds;
    }

    const targetEpisodesByPosition = new Map(
      target.episodes.map((episode) => [
        CollectionService.episodePosition(episode),
        episode,
      ]),
    );
    const sourceEpisodesToMove: string[] = [];
    for (const sourceEpisode of source.episodes) {
      const targetEpisode = targetEpisodesByPosition.get(
        CollectionService.episodePosition(sourceEpisode),
      );
      if (!targetEpisode) {
        sourceEpisodesToMove.push(sourceEpisode.id);
        continue;
      }

      await this.transferItemRelations(
        transaction,
        userId,
        sourceEpisode,
        targetEpisode,
      );
      await transaction.mediaItem.delete({ where: { id: sourceEpisode.id } });
      deletedMediaItemIds.push(sourceEpisode.id);
    }

    if (sourceEpisodesToMove.length > 0) {
      await transaction.mediaItem.updateMany({
        where: {
          id: { in: sourceEpisodesToMove },
          createdByUserId: userId,
        },
        data: { parentId: target.id },
      });
    }

    return deletedMediaItemIds;
  }

  private async transferItemRelations(
    transaction: Prisma.TransactionClient,
    userId: string,
    source: MergeRelatedItem,
    target: MergeRelatedItem,
  ): Promise<void> {
    await this.transferTitleAliases(transaction, userId, source, target);

    await transaction.mediaExternalId.updateMany({
      where: { mediaItemId: source.id, userId },
      data: { mediaItemId: target.id },
    });
    await transaction.mediaExternalAlias.updateMany({
      where: { mediaItemId: source.id, userId },
      data: { mediaItemId: target.id },
    });
    await transaction.logEntry.updateMany({
      where: { mediaItemId: source.id, userId },
      data: { mediaItemId: target.id },
    });

    const targetTagKeys = new Set(
      target.mediaTags.map((tag) => CollectionService.tagLinkKey(tag)),
    );
    const duplicateTagIds = source.mediaTags
      .filter((tag) => targetTagKeys.has(CollectionService.tagLinkKey(tag)))
      .map((tag) => tag.id);
    if (duplicateTagIds.length > 0) {
      await transaction.mediaItemTag.deleteMany({
        where: { id: { in: duplicateTagIds }, userId },
      });
    }

    const tagIdsToMove = source.mediaTags
      .filter((tag) => !duplicateTagIds.includes(tag.id))
      .map((tag) => tag.id);
    if (tagIdsToMove.length > 0) {
      await transaction.mediaItemTag.updateMany({
        where: { id: { in: tagIdsToMove }, userId },
        data: { mediaItemId: target.id },
      });
    }
  }

  private async transferTitleAliases(
    transaction: Prisma.TransactionClient,
    userId: string,
    source: MergeRelatedItem,
    target: MergeRelatedItem,
  ): Promise<void> {
    const targetAliasValues = new Set(target.aliases.map((alias) => alias.alias));
    const duplicateAliasIds = source.aliases
      .filter((alias) => targetAliasValues.has(alias.alias))
      .map((alias) => alias.id);
    if (duplicateAliasIds.length > 0) {
      await transaction.mediaAlias.deleteMany({
        where: { id: { in: duplicateAliasIds }, userId },
      });
    }

    const aliasIdsToMove = source.aliases
      .filter((alias) => !duplicateAliasIds.includes(alias.id))
      .map((alias) => alias.id);
    if (aliasIdsToMove.length > 0) {
      await transaction.mediaAlias.updateMany({
        where: { id: { in: aliasIdsToMove }, userId },
        data: { mediaItemId: target.id },
      });
    }

    const sourceTitleAlias = CollectionService.normaliseAlias(source.title);
    const sourceHasTitleAlias = source.aliases.some(
      (alias) => alias.alias === sourceTitleAlias,
    );
    if (!targetAliasValues.has(sourceTitleAlias) && !sourceHasTitleAlias) {
      await transaction.mediaAlias.create({
        data: {
          userId,
          mediaItemId: target.id,
          alias: sourceTitleAlias,
        },
      });
    }
  }

  private mergeRedirectIdentities(
    source: MergeMediaItem,
  ): Prisma.MediaItemMergeRedirectIdentityCreateWithoutRedirectInput[] {
    const identities = new Map<
      string,
      Prisma.MediaItemMergeRedirectIdentityCreateWithoutRedirectInput
    >();

    for (const identity of source.externalIds) {
      const key = `${MergeRedirectIdentityKind.CANONICAL}:${identity.provider}:${identity.externalId}`;
      identities.set(key, {
        kind: MergeRedirectIdentityKind.CANONICAL,
        namespace: identity.provider,
        externalId: identity.externalId,
      });
    }
    for (const identity of source.externalAliases) {
      const key = `${MergeRedirectIdentityKind.EXTERNAL_ALIAS}:${identity.providerNamespace}:${identity.externalId}`;
      identities.set(key, {
        kind: MergeRedirectIdentityKind.EXTERNAL_ALIAS,
        namespace: identity.providerNamespace,
        externalId: identity.externalId,
      });
    }

    return [...identities.values()];
  }

  private static episodePosition(episode: MergeEpisode): string {
    return `${episode.seasonNumber ?? ""}:${episode.episodeNumber ?? ""}`;
  }

  private static tagLinkKey(
    tag: Pick<MergeRelatedItem["mediaTags"][number], "tagId" | "source" | "providerNamespace">,
  ): string {
    return `${tag.tagId}:${tag.source}:${tag.providerNamespace}`;
  }

  private static normaliseAlias(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s*\(\d{4}\)\s*$/, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
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

    const stillAccessible = true;
    const dedupedTagRemovals = [...new Set(input.removeTagIds)];
    const allowedTagIds = new Set(item.mediaTags.map((mediaTag) => mediaTag.tagId));
    for (const tagId of dedupedTagRemovals) {
      if (!allowedTagIds.has(tagId)) {
        throw new ForbiddenException("You cannot remove one or more selected tags");
      }
    }

    const normalizedNewTags = this.normalizeTagInputs(input.addTags);

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
            userId,
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
            userId,
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
            userId,
            mediaItemId: item.id,
            providerNamespace: alias.providerNamespace,
            externalId: alias.externalId,
          })),
        });
      }

      if (dedupedTagRemovals.length > 0) {
        const removedLinks = await transaction.mediaItemTag.deleteMany({
          where: {
            userId,
            mediaItemId: item.id,
            tagId: { in: dedupedTagRemovals },
          },
        });
        if (removedLinks.count !== dedupedTagRemovals.length) {
          throw new ForbiddenException("You cannot remove one or more selected tags");
        }
      }

      if (normalizedNewTags.length > 0) {
        const existingTags = await transaction.tag.findMany({
          where: {
            userId,
            normalizedKey: {
              in: normalizedNewTags.map((tag) => tag.normalizedKey),
            },
          },
        });
        const existingTagsByKey = new Map(
          existingTags.map((tag) => [tag.normalizedKey, tag]),
        );

        for (const newTag of normalizedNewTags) {
          if (existingTagsByKey.has(newTag.normalizedKey)) {
            continue;
          }

          const created = await transaction.tag.create({
            data: {
              userId,
              normalizedKey: newTag.normalizedKey,
              displayName: newTag.label,
            },
          });
          existingTagsByKey.set(newTag.normalizedKey, created);
        }

        const existingLinks = await transaction.mediaItemTag.findMany({
          where: {
            userId,
            mediaItemId: item.id,
            source: TagLinkSource.MANUAL,
          },
          include: {
            tag: true,
          },
        });
        const existingManualKeys = new Set(
          existingLinks.map((link) => link.tag.normalizedKey),
        );

        const linksToCreate = normalizedNewTags
          .filter((tag) => !existingManualKeys.has(tag.normalizedKey))
          .map((tag) => {
            const resolvedTag = existingTagsByKey.get(tag.normalizedKey);
            if (!resolvedTag) {
              throw new Error("Tag resolution failed");
            }

            return {
              userId,
              mediaItemId: item.id,
              tagId: resolvedTag.id,
              source: TagLinkSource.MANUAL,
              providerNamespace: "",
            };
          });

        if (linksToCreate.length > 0) {
          await transaction.mediaItemTag.createMany({ data: linksToCreate });
        }
      }
    });

    return {
      itemId: item.id,
      stillAccessible,
    };
  }

  async removeItemForUser(
    userId: string,
    requestedId: string,
    confirmTitle?: string,
  ): Promise<ItemRemovalResult> {
    let item: MediaDetail;

    try {
      item = await this.findDetail(userId, requestedId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        return { removed: false };
      }
      throw error;
    }

    if ((confirmTitle ?? "").trim() !== item.title.trim()) {
      return { removed: false };
    }

    const removableMediaItemIds = [
      item.id,
      ...item.episodes.map((episode) => episode.id),
    ];

    const result = await this.prisma.$transaction(async (transaction) => {
      const removedEntries = await transaction.logEntry.deleteMany({
        where: {
          userId,
          mediaItemId: { in: removableMediaItemIds },
        },
      });

      const deletedItems = await transaction.mediaItem.deleteMany({
        where: {
          id: { in: removableMediaItemIds },
          createdByUserId: userId,
        },
      });

      return {
        removedEntries: removedEntries.count,
        removedOwnership: deletedItems.count > 0,
      };
    });

    if (!result.removedOwnership && result.removedEntries === 0) {
      return { removed: false };
    }

    if (result.removedEntries > 0) {
      this.events?.emit(Events.LOG_ENTRY_CHANGED, { userId });
    }

    return {
      removed: true,
      itemTitle: item.title,
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

  private normalizeTagInputs(tags: string[]): Array<{ normalizedKey: string; label: string }> {
    const unique = new Map<string, { normalizedKey: string; label: string }>();

    for (const rawTag of tags) {
      const stripped = stripHtmlTags(rawTag).trim().replace(/\s+/g, " ");
      if (!stripped) {
        continue;
      }

      const normalizedKey = stripped.toLowerCase();
      if (!unique.has(normalizedKey)) {
        unique.set(normalizedKey, {
          normalizedKey,
          label: stripped,
        });
      }
    }

    return [...unique.values()];
  }
}
