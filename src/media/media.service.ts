import { Injectable } from "@nestjs/common";
import {
  type MediaAlias,
  type MediaItem,
  MediaType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

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

export type UpdateMediaData = Partial<
  Omit<CreateMediaData, "type" | "title">
> & { title?: string };

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateSkeleton(
    title: string,
    type: MediaType,
    userId: string,
  ): Promise<MediaItem> {
    const alias = MediaService.normaliseAlias(title);

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
          title: title.trim(),
          type,
          sortTitle: MediaService.computeSortTitle(title),
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

  findById(id: string): Promise<MediaItem | null> {
    return this.prisma.mediaItem.findUnique({ where: { id } });
  }

  create(data: CreateMediaData): Promise<MediaItem> {
    return this.prisma.mediaItem.create({
      data: { ...data, sortTitle: MediaService.computeSortTitle(data.title) },
    });
  }

  update(id: string, data: UpdateMediaData): Promise<MediaItem> {
    const updateData: Prisma.MediaItemUpdateInput = { ...data };

    if (data.title !== undefined) {
      updateData.sortTitle = MediaService.computeSortTitle(data.title);
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
