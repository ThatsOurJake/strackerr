import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  type MediaAlias,
  type MediaItem,
  MediaType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { Events } from "../../infrastructure/events/event-names";
import { stripHtmlTags } from "../../infrastructure/security/sanitize-string";

export interface CreateMediaData {
  type: MediaType;
  title: string;
  isSkeleton?: boolean;
  createdByUserId?: string | null;
  parentId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  imageSourceUrl?: string | null;
  year?: number | null;
  duration?: number | null;
}

export interface CreateIdentifiedMediaData extends CreateMediaData {
  provider: string;
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
        where: { alias },
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
        data: { alias, mediaItemId: mediaItem.id },
      });

      return mediaItem;
    });
  }

  async findByExternalId(
    provider: string,
    externalId: string,
  ): Promise<MediaItem | null> {
    const result = await this.prisma.mediaExternalId.findUnique({
      where: { provider_externalId: { provider, externalId } },
      include: { mediaItem: true },
    });

    return result?.mediaItem ?? null;
  }

  async findOrCreateIdentified(
    data: CreateIdentifiedMediaData,
  ): Promise<MediaItem> {
    const existing = await this.findByExternalId(data.provider, data.externalId);
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
          createdByUserId: null,
          sortTitle: MediaService.computeSortTitle(sanitizedMediaData.title),
        },
      });
      await transaction.mediaExternalId.create({
        data: { mediaItemId: mediaItem.id, provider, externalId },
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
      where: { parentId, seasonNumber, episodeNumber, type: MediaType.TV_EPISODE },
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
          { aliases: { some: { alias: { contains: query } } } },
        ],
        AND: {
          OR: [
            { createdByUserId: userId },
            { logEntries: { some: { userId } } },
          ],
        },
      },
      orderBy: { title: "asc" },
      take: 20,
    });
  }

  findById(id: string): Promise<MediaItem | null> {
    return this.prisma.mediaItem.findUnique({ where: { id } });
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

  update(id: string, data: UpdateMediaData): Promise<MediaItem> {
    const updateData: Prisma.MediaItemUpdateInput = { ...data };

    if (data.title !== undefined) {
      updateData.title = stripHtmlTags(data.title);
      updateData.sortTitle = MediaService.computeSortTitle(updateData.title);
    }

    return this.prisma.mediaItem.update({ where: { id }, data: updateData });
  }

  async addAlias(mediaItemId: string, rawAlias: string): Promise<MediaAlias> {
    const alias = MediaService.normaliseAlias(rawAlias);
    const existing = await this.prisma.mediaAlias.findUnique({
      where: { alias },
    });

    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.mediaAlias.create({
        data: { mediaItemId, alias },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return this.prisma.mediaAlias.findUniqueOrThrow({ where: { alias } });
      }

      throw error;
    }
  }

  async addExternalId(
    mediaItemId: string,
    provider: string,
    externalId: string,
  ): Promise<MediaItem> {
    const result = await this.prisma.mediaExternalId.upsert({
      where: { provider_externalId: { provider, externalId } },
      create: { mediaItemId, provider, externalId },
      update: { mediaItemId },
    });

    return await this.prisma.mediaItem.findUniqueOrThrow({
      where: { id: result.mediaItemId },
    });
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
