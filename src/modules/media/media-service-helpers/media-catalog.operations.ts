import { ConflictException } from "@nestjs/common";
import { MediaItem, MediaType, Prisma } from "@prisma/client";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { stripHtmlTags } from "../../../infrastructure/security/sanitize-string";
import {
  type NormalizedExternalAlias,
  normalizeExternalAlias,
} from "../external-alias.validator";
import type {
  CreateMediaData,
  ExternalAliasInput,
  UpdateMediaData,
} from "./media.types";
import { computeMediaSortTitle, normaliseMediaAlias } from "./media.utils";

export class MediaCatalogOperations {
  constructor(private readonly prisma: PrismaService) { }

  async findOrCreateSkeleton(
    title: string,
    type: MediaType,
    userId: string,
  ): Promise<MediaItem> {
    const sanitizedTitle = stripHtmlTags(title);
    const alias = normaliseMediaAlias(sanitizedTitle);

    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.mediaAlias.findUnique({
        where: {
          userId_alias: {
            userId,
            alias,
          },
        },
        include: { mediaItem: true },
      });

      if (existing) {
        return existing.mediaItem;
      }

      const mediaItem = await transaction.mediaItem.create({
        data: {
          title: sanitizedTitle,
          type,
          sortTitle: computeMediaSortTitle(sanitizedTitle),
          isSkeleton: true,
          createdByUserId: userId,
        },
      });

      await transaction.mediaAlias.create({
        data: { alias, mediaItemId: mediaItem.id, userId },
      });

      return mediaItem;
    });
  }

  async findOrCreateEpisodeSkeleton(
    parentId: string,
    showTitle: string,
    seasonNumber: number,
    episodeNumber: number,
    userId: string,
  ): Promise<MediaItem> {
    const existing = await this.prisma.mediaItem.findFirst({
      where: {
        parentId,
        createdByUserId: userId,
        seasonNumber,
        episodeNumber,
        type: MediaType.TV_EPISODE,
      },
    });

    if (existing) {
      return existing;
    }

    const title = `${showTitle} S${seasonNumber}E${episodeNumber}`;
    return this.create({
      title,
      type: MediaType.TV_EPISODE,
      isSkeleton: true,
      createdByUserId: userId,
      parentId,
      seasonNumber,
      episodeNumber,
    });
  }

  searchForUser(
    userId: string,
    query: string,
    type?: MediaType,
  ): Promise<MediaItem[]> {
    return this.prisma.mediaItem.findMany({
      where: {
        type,
        OR: [
          { title: { contains: query } },
          {
            aliases: {
              some: {
                userId,
                alias: { contains: query },
              },
            },
          },
        ],
        createdByUserId: userId,
      },
      orderBy: { title: "asc" },
      take: 20,
    });
  }

  searchTvShowCandidatesForUser(userId: string, query: string): Promise<MediaItem[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return Promise.resolve([]);
    }

    return this.prisma.mediaItem.findMany({
      where: {
        type: MediaType.TV_SHOW,
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
        createdByUserId: userId,
      },
      orderBy: [{ isSkeleton: "desc" }, { title: "asc" }, { year: "asc" }],
      take: 20,
    });
  }

  async resolveByTitleForUser(userId: string, title: string): Promise<MediaItem | null> {
    const trimmedTitle = title.trim();
    return this.prisma.mediaItem.findFirst({
      where: {
        createdByUserId: userId,
        title: {
          equals: trimmedTitle,
        },
      },
      orderBy: { id: "asc" },
    });
  }

  findById(id: string): Promise<MediaItem | null> {
    return this.prisma.mediaItem.findUnique({ where: { id } });
  }

  async hasUserAccess(mediaItemId: string, userId: string): Promise<boolean> {
    const mediaItem = await this.findById(mediaItemId);
    if (!mediaItem) {
      return false;
    }

    if (mediaItem.createdByUserId === userId) {
      return true;
    }

    if (mediaItem.type !== MediaType.TV_SHOW) {
      return false;
    }

    const linkedEpisode = await this.prisma.mediaItem.findFirst({
      where: {
        parentId: mediaItem.id,
        createdByUserId: userId,
      },
      select: { id: true },
    });

    return Boolean(linkedEpisode);
  }

  findByIdWithExternalIds(id: string) {
    return this.prisma.mediaItem.findUnique({
      where: { id },
      include: {
        externalIds: {
          select: {
            provider: true,
            externalId: true,
          },
          orderBy: { provider: "asc" },
        },
      },
    });
  }

  create(data: CreateMediaData): Promise<MediaItem> {
    const title = stripHtmlTags(data.title);
    return this.prisma.mediaItem.create({
      data: { ...data, title, sortTitle: computeMediaSortTitle(title) },
    });
  }

  async createSkeletonWithExternalAliases(input: {
    title: string;
    description?: string;
    type: MediaType;
    userId: string;
    externalAliases?: ExternalAliasInput[];
  }): Promise<MediaItem> {
    const title = stripHtmlTags(input.title);
    const description = input.description
      ? stripHtmlTags(input.description).trim() || null
      : null;
    const dedupedAliases = new Map<string, NormalizedExternalAlias>();

    for (const alias of input.externalAliases ?? []) {
      const normalized = normalizeExternalAlias(
        alias.providerNamespace,
        alias.externalId,
      );
      dedupedAliases.set(
        `${normalized.providerNamespace}::${normalized.externalId}`,
        normalized,
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      if (dedupedAliases.size > 0) {
        const existingAliases = await transaction.mediaExternalAlias.findMany({
          where: {
            userId: input.userId,
            OR: [...dedupedAliases.values()].map((alias) => ({
              providerNamespace: alias.providerNamespace,
              externalId: alias.externalId,
            })),
          },
          select: {
            providerNamespace: true,
            externalId: true,
          },
          take: 1,
        });

        if (existingAliases.length > 0) {
          const existingAlias = existingAliases[0];
          throw new ConflictException(
            `External alias conflict: ${existingAlias.providerNamespace}:${existingAlias.externalId} is already assigned to an existing media item. No media item was created.`,
          );
        }
      }

      const mediaItem = await transaction.mediaItem.create({
        data: {
          title,
          description,
          type: input.type,
          isSkeleton: true,
          createdByUserId: input.userId,
          sortTitle: computeMediaSortTitle(title),
        },
      });

      if (dedupedAliases.size > 0) {
        try {
          await transaction.mediaExternalAlias.createMany({
            data: [...dedupedAliases.values()].map((alias) => ({
              userId: input.userId,
              mediaItemId: mediaItem.id,
              providerNamespace: alias.providerNamespace,
              externalId: alias.externalId,
            })),
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError
            && error.code === "P2002"
          ) {
            throw new ConflictException(
              "External alias conflict: one or more aliases are already assigned to existing media items. No media item was created.",
            );
          }

          throw error;
        }
      }

      return mediaItem;
    });
  }

  update(id: string, data: UpdateMediaData): Promise<MediaItem> {
    const updateData: Prisma.MediaItemUpdateInput = { ...data };

    if (data.title !== undefined) {
      updateData.title = stripHtmlTags(data.title);
      updateData.sortTitle = computeMediaSortTitle(updateData.title);
    }

    return this.prisma.mediaItem.update({ where: { id }, data: updateData });
  }
}
