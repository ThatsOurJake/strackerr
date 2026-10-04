import { ConflictException, Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  type MediaAlias,
  type MediaExternalAlias,
  type MediaItem,
  MediaType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { Events } from "../../infrastructure/events/event-names";
import { stripHtmlTags } from "../../infrastructure/security/sanitize-string";
import {
  type NormalizedExternalAlias,
  normalizeExternalAlias,
} from "./external-alias.validator";

export interface CreateMediaData {
  type: MediaType;
  title: string;
  isSkeleton?: boolean;
  createdByUserId: string;
  parentId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  imageSourceUrl?: string | null;
  year?: number | null;
  duration?: number | null;
}

export interface CreateIdentifiedMediaData
  extends Omit<CreateMediaData, "createdByUserId"> {
  provider: string;
  externalId: string;
}

export interface ExternalAliasInput {
  providerNamespace: string;
  externalId: string;
}

export type UpdateMediaData = Partial<
  Omit<CreateMediaData, "type" | "title">
> & { title?: string };

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly events?: EventEmitter2,
  ) { }

  async findOrCreateSkeleton(
    title: string,
    type: MediaType,
    userId: string,
  ): Promise<MediaItem> {
    const sanitizedTitle = stripHtmlTags(title);
    const alias = MediaService.normaliseAlias(sanitizedTitle);

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
          sortTitle: MediaService.computeSortTitle(sanitizedTitle),
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

  async findByExternalId(
    userId: string,
    provider: string,
    externalId: string,
  ): Promise<MediaItem | null> {
    const result = await this.prisma.mediaExternalId.findUnique({
      where: {
        userId_provider_externalId: {
          userId,
          provider,
          externalId,
        },
      },
      include: { mediaItem: true },
    });

    return result?.mediaItem ?? null;
  }

  async findByExternalAlias(
    userId: string,
    providerNamespace: string,
    externalId: string,
  ): Promise<MediaItem | null> {
    const normalized = normalizeExternalAlias(providerNamespace, externalId);
    const result = await this.prisma.mediaExternalAlias.findUnique({
      where: {
        userId_providerNamespace_externalId: {
          userId,
          providerNamespace: normalized.providerNamespace,
          externalId: normalized.externalId,
        },
      },
      include: { mediaItem: true },
    });

    return result?.mediaItem ?? null;
  }

  async resolveByExternalLookup(
    userId: string,
    providerNamespace: string,
    externalId: string,
  ): Promise<MediaItem | null> {
    const normalized = normalizeExternalAlias(providerNamespace, externalId);
    const canonical = await this.findByExternalId(
      userId,
      normalized.providerNamespace,
      normalized.externalId,
    );
    if (canonical) {
      return canonical;
    }

    return this.findByExternalAlias(
      userId,
      normalized.providerNamespace,
      normalized.externalId,
    );
  }

  async findOrCreateIdentified(
    data: CreateIdentifiedMediaData,
    userId: string,
  ): Promise<MediaItem> {
    const existing = await this.findByExternalId(
      userId,
      data.provider,
      data.externalId,
    );
    if (existing) {
      return existing;
    }

    const { provider, externalId, imageUrl, imageSourceUrl, ...mediaData } =
      data;
    const sourceUrl = imageSourceUrl ?? imageUrl ?? undefined;
    const sanitizedMediaData = {
      ...mediaData,
      title: stripHtmlTags(mediaData.title),
      imageUrl: null,
      imageSourceUrl: sourceUrl,
    };
    const mediaItem = await this.prisma.$transaction(async (transaction) => {
      const mediaItem = await transaction.mediaItem.create({
        data: {
          ...sanitizedMediaData,
          isSkeleton: false,
          createdByUserId: userId,
          sortTitle: MediaService.computeSortTitle(sanitizedMediaData.title),
        },
      });
      await transaction.mediaExternalId.create({
        data: { mediaItemId: mediaItem.id, userId, provider, externalId },
      });
      return mediaItem;
    });

    if (sourceUrl) {
      this.events?.emit(Events.IMAGE_CACHE, {
        mediaItemId: mediaItem.id,
        sourceUrl,
      });
    }

    return mediaItem;
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

  async resolveByTitleForUser(
    userId: string,
    title: string,
  ): Promise<MediaItem | null> {
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
      data: { ...data, title, sortTitle: MediaService.computeSortTitle(title) },
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
          sortTitle: MediaService.computeSortTitle(title),
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
      updateData.sortTitle = MediaService.computeSortTitle(updateData.title);
    }

    return this.prisma.mediaItem.update({ where: { id }, data: updateData });
  }

  async addAlias(
    mediaItemId: string,
    userId: string,
    rawAlias: string,
  ): Promise<MediaAlias> {
    const alias = MediaService.normaliseAlias(rawAlias);
    const existing = await this.prisma.mediaAlias.findUnique({
      where: {
        userId_alias: {
          userId,
          alias,
        },
      },
    });

    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.mediaAlias.create({
        data: { mediaItemId, userId, alias },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return this.prisma.mediaAlias.findUniqueOrThrow({
          where: {
            userId_alias: {
              userId,
              alias,
            },
          },
        });
      }

      throw error;
    }
  }

  async addExternalId(
    mediaItemId: string,
    userId: string,
    provider: string,
    externalId: string,
  ): Promise<MediaItem> {
    const existing = await this.prisma.mediaExternalId.findUnique({
      where: {
        userId_provider_externalId: {
          userId,
          provider,
          externalId,
        },
      },
    });

    if (existing && existing.mediaItemId !== mediaItemId) {
      throw new ConflictException("Provider identity is already assigned to another media item");
    }

    const result = existing ?? await this.prisma.mediaExternalId.create({
      data: { mediaItemId, userId, provider, externalId },
    });

    return await this.prisma.mediaItem.findUniqueOrThrow({
      where: { id: result.mediaItemId },
    });
  }

  async listExternalAliases(
    mediaItemId: string,
  ): Promise<MediaExternalAlias[]> {
    return this.prisma.mediaExternalAlias.findMany({
      where: { mediaItemId },
      orderBy: [{ providerNamespace: "asc" }, { externalId: "asc" }],
    });
  }

  async addExternalAlias(
    mediaItemId: string,
    userId: string,
    providerNamespace: string,
    externalId: string,
  ): Promise<MediaExternalAlias> {
    const normalized = normalizeExternalAlias(providerNamespace, externalId);
    const existing = await this.prisma.mediaExternalAlias.findUnique({
      where: {
        userId_providerNamespace_externalId: {
          userId,
          providerNamespace: normalized.providerNamespace,
          externalId: normalized.externalId,
        },
      },
    });

    if (existing?.mediaItemId && existing.mediaItemId !== mediaItemId) {
      throw new ConflictException(
        "Alias is already assigned to another media item",
      );
    }

    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.mediaExternalAlias.create({
        data: {
          userId,
          mediaItemId,
          providerNamespace: normalized.providerNamespace,
          externalId: normalized.externalId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Alias is already assigned to another media item",
        );
      }

      throw error;
    }
  }

  async addExternalAliases(
    mediaItemId: string,
    userId: string,
    aliases: ExternalAliasInput[],
  ): Promise<MediaExternalAlias[]> {
    const deduped = new Map<string, NormalizedExternalAlias>();
    for (const alias of aliases) {
      const normalized = normalizeExternalAlias(
        alias.providerNamespace,
        alias.externalId,
      );
      deduped.set(
        `${normalized.providerNamespace}::${normalized.externalId}`,
        normalized,
      );
    }

    const added: MediaExternalAlias[] = [];
    for (const alias of deduped.values()) {
      added.push(
        await this.addExternalAlias(
          mediaItemId,
          userId,
          alias.providerNamespace,
          alias.externalId,
        ),
      );
    }

    return added;
  }

  async removeExternalAlias(
    mediaItemId: string,
    providerNamespace: string,
    externalId: string,
  ): Promise<boolean> {
    const normalized = normalizeExternalAlias(providerNamespace, externalId);
    const deleted = await this.prisma.mediaExternalAlias.deleteMany({
      where: {
        mediaItemId,
        providerNamespace: normalized.providerNamespace,
        externalId: normalized.externalId,
      },
    });

    return deleted.count > 0;
  }

  static normaliseAlias(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/\s*\(\d{4}\)\s*$/, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  static computeSortTitle(title: string): string {
    const withoutArticle = title.trim().replace(/^(the|a|an)\s+/i, "");
    return /^[^\p{Script=Latin}]|^\d/u.test(withoutArticle)
      ? `#${withoutArticle.toLowerCase()}`
      : withoutArticle.toLowerCase();
  }
}
