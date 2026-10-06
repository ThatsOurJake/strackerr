import { ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  type MediaAlias,
  type MediaExternalAlias,
  type MediaItem,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { Events } from "../../../infrastructure/events/event-names";
import { stripHtmlTags } from "../../../infrastructure/security/sanitize-string";
import {
  type NormalizedExternalAlias,
  normalizeExternalAlias,
} from "../external-alias.validator";
import type {
  CreateIdentifiedMediaData,
  ExternalAliasInput,
} from "./media.types";
import { computeMediaSortTitle, normaliseMediaAlias } from "./media.utils";

export class MediaIdentityOperations {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events?: EventEmitter2,
  ) { }

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

    const { provider, externalId, imageUrl, imageSourceUrl, ...mediaData } = data;
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
          sortTitle: computeMediaSortTitle(sanitizedMediaData.title),
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

  async addAlias(
    mediaItemId: string,
    userId: string,
    rawAlias: string,
  ): Promise<MediaAlias> {
    const alias = normaliseMediaAlias(rawAlias);
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
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === "P2002"
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

  async listExternalAliases(mediaItemId: string): Promise<MediaExternalAlias[]> {
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
      throw new ConflictException("Alias is already assigned to another media item");
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
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === "P2002"
      ) {
        throw new ConflictException("Alias is already assigned to another media item");
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
}
