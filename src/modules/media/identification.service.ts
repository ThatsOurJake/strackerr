import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { type MediaItem, MediaType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { Events } from "../../infrastructure/events/event-names";
import { MetadataService } from "../metadata/metadata.service";
import {
  MediaItemDetail,
  type MetadataProviderName,
} from "../metadata/metadata-provider.interface";
import { EpisodeSyncService } from "./episode-sync.service";
import { MediaService } from "./media.service";
import { assertProviderExternalId } from "./provider-external-id.validator";

@Injectable()
export class IdentificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly metadataService: MetadataService,
    private readonly episodeSyncService: EpisodeSyncService,
    @Optional() private readonly events?: EventEmitter2,
  ) { }

  async identify(
    mediaItemId: string,
    providerName: MetadataProviderName,
    externalId: string,
    userId: string,
  ): Promise<MediaItem> {
    const mediaItem = await this.mediaService.findByIdWithExternalIds(mediaItemId);
    if (!mediaItem) {
      throw new Error("Media item not found");
    }

    const hasAccess = await this.hasUserAccess(mediaItem, userId);
    if (!hasAccess) {
      throw new ForbiddenException("You cannot identify this media item");
    }

    assertProviderExternalId(providerName, externalId);

    const resolvedProvider = await this.metadataService.getProviderForUser(
      mediaItem.type,
      userId,
      {
        providerOverride: providerName,
        anime: providerName === "anilist",
      },
    );
    const metadata = await resolvedProvider.provider.getById(
      externalId,
      resolvedProvider.apiKey,
    );

    this.assertMetadataType(mediaItem.type, metadata.type);
    const conflictTarget = await this.mediaService.findByExternalId(
      providerName,
      externalId,
    );
    if (
      conflictTarget &&
      conflictTarget.id !== mediaItemId &&
      conflictTarget.type !== this.catalogTypeFor(mediaItem.type)
    ) {
      throw new BadRequestException("Selected identity is incompatible");
    }

    if (conflictTarget && conflictTarget.id !== mediaItemId) {
      const mergedTarget = await this.mergeIntoExistingItem(
        mediaItem,
        conflictTarget,
        userId,
      );
      return this.refreshIdentifiedItem(
        mergedTarget.id,
        mergedTarget.title,
        providerName,
        externalId,
        metadata,
        resolvedProvider.apiKey,
      );
    }

    return this.refreshIdentifiedItem(
      mediaItemId,
      mediaItem.title,
      providerName,
      externalId,
      metadata,
      resolvedProvider.apiKey,
      mediaItem.isSkeleton,
    );
  }

  private async refreshIdentifiedItem(
    mediaItemId: string,
    originalTitle: string,
    providerName: MetadataProviderName,
    externalId: string,
    metadata: MediaItemDetail,
    apiKey: string | undefined,
    clearSkeletonOwnership = false,
  ): Promise<MediaItem> {
    const mediaItem = await this.mediaService.findById(mediaItemId);
    if (!mediaItem) {
      throw new Error("Media item not found");
    }

    const usesOwnArtwork = mediaItem.type !== MediaType.TV_EPISODE;
    const updated = await this.mediaService.update(mediaItemId, {
      title: metadata.title,
      description: metadata.description ?? null,
      imageUrl: null,
      imageSourceUrl: usesOwnArtwork ? metadata.imageUrl ?? null : null,
      year: metadata.year ?? null,
      duration: metadata.duration ?? null,
      isSkeleton: false,
      createdByUserId: clearSkeletonOwnership ? null : mediaItem.createdByUserId,
    });

    await this.mediaService.addExternalId(
      mediaItemId,
      providerName,
      externalId,
    );
    await this.mediaService.addAlias(mediaItemId, originalTitle);

    if (usesOwnArtwork && metadata.imageUrl) {
      this.events?.emit(Events.IMAGE_CACHE, {
        mediaItemId,
        sourceUrl: metadata.imageUrl,
      });
    }

    if (updated.type === MediaType.TV_SHOW) {
      void this.episodeSyncService.syncShow(
        updated.id,
        providerName,
        externalId,
        apiKey,
      );
    }

    return updated;
  }

  private assertMetadataType(sourceType: MediaType, metadataType: MediaType): void {
    if (this.catalogTypeFor(sourceType) !== this.catalogTypeFor(metadataType)) {
      throw new BadRequestException("Selected identity is incompatible");
    }
  }

  private catalogTypeFor(type: MediaType): MediaType {
    return type === MediaType.TV_EPISODE ? MediaType.TV_SHOW : type;
  }

  private async hasUserAccess(
    mediaItem: MediaItem,
    userId: string,
  ): Promise<boolean> {
    if (mediaItem.isSkeleton) {
      return mediaItem.createdByUserId === userId;
    }

    if (mediaItem.createdByUserId === userId) {
      return true;
    }

    const linkedLog = await this.prisma.logEntry.findFirst({
      where: {
        userId,
        mediaItem: mediaItem.type === MediaType.TV_SHOW
          ? { OR: [{ id: mediaItem.id }, { parentId: mediaItem.id }] }
          : { id: mediaItem.id },
      },
      select: { id: true },
    });
    return Boolean(linkedLog);
  }

  private async mergeIntoExistingItem(
    source: MediaItem,
    target: MediaItem,
    userId: string,
  ): Promise<MediaItem> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.logEntry.updateMany({
        where: {
          mediaItemId: source.id,
          userId,
        },
        data: { mediaItemId: target.id },
      });

      if (source.type === MediaType.TV_SHOW) {
        const sourceEpisodes = await transaction.mediaItem.findMany({
          where: {
            type: MediaType.TV_EPISODE,
            parentId: source.id,
          },
          select: {
            id: true,
            title: true,
            sortTitle: true,
            isSkeleton: true,
            createdByUserId: true,
            seasonNumber: true,
            episodeNumber: true,
            description: true,
            year: true,
            duration: true,
            imageSourceUrl: true,
          },
        });

        for (const episode of sourceEpisodes) {
          const userEpisodeLog = await transaction.logEntry.findFirst({
            where: {
              mediaItemId: episode.id,
              userId,
            },
            select: { id: true },
          });
          if (!userEpisodeLog) {
            continue;
          }

          const targetEpisode = await transaction.mediaItem.findFirst({
            where: {
              type: MediaType.TV_EPISODE,
              parentId: target.id,
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
            },
            select: { id: true },
          });

          const targetEpisodeId = targetEpisode
            ? targetEpisode.id
            : (
              await transaction.mediaItem.create({
                data: {
                  type: MediaType.TV_EPISODE,
                  title: episode.title,
                  sortTitle: episode.sortTitle,
                  parentId: target.id,
                  seasonNumber: episode.seasonNumber,
                  episodeNumber: episode.episodeNumber,
                  isSkeleton: episode.isSkeleton,
                  createdByUserId: episode.createdByUserId,
                  description: episode.description,
                  year: episode.year,
                  duration: episode.duration,
                  imageUrl: null,
                  imageSourceUrl: episode.imageSourceUrl,
                },
              })
            ).id;

          await transaction.logEntry.updateMany({
            where: {
              mediaItemId: episode.id,
              userId,
            },
            data: { mediaItemId: targetEpisodeId },
          });
        }
      }

      const sourceExternalAliases = await transaction.mediaExternalAlias.findMany({
        where: { mediaItemId: source.id },
        select: {
          providerNamespace: true,
          externalId: true,
        },
      });

      for (const alias of sourceExternalAliases) {
        await transaction.mediaExternalAlias.upsert({
          where: {
            providerNamespace_externalId: {
              providerNamespace: alias.providerNamespace,
              externalId: alias.externalId,
            },
          },
          create: {
            mediaItemId: target.id,
            providerNamespace: alias.providerNamespace,
            externalId: alias.externalId,
          },
          update: {
            mediaItemId: target.id,
          },
        });
      }

      await transaction.mediaExternalAlias.deleteMany({
        where: { mediaItemId: source.id },
      });
    });

    await this.mediaService.addAlias(target.id, source.title);
    return target;
  }
}
