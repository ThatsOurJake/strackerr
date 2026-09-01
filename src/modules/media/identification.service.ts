import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { type MediaItem, MediaType } from "@prisma/client";
import { Events } from "../../infrastructure/events/event-names";
import { MetadataService } from "../metadata/metadata.service";
import { type MetadataProviderName } from "../metadata/metadata-provider.interface";
import { EpisodeSyncService } from "./episode-sync.service";
import { MediaService } from "./media.service";

@Injectable()
export class IdentificationService {
  constructor(
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
    const mediaItem = await this.mediaService.findById(mediaItemId);
    if (!mediaItem) {
      throw new Error("Media item not found");
    }

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
    const usesOwnArtwork = mediaItem.type !== MediaType.TV_EPISODE;
    const originalTitle = mediaItem.title;
    const updated = await this.mediaService.update(mediaItemId, {
      title: metadata.title,
      description: metadata.description ?? null,
      imageUrl: null,
      imageSourceUrl: usesOwnArtwork ? metadata.imageUrl ?? null : null,
      year: metadata.year ?? null,
      duration: metadata.duration ?? null,
      isSkeleton: false,
      createdByUserId: null,
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
        resolvedProvider.apiKey,
      );
    }

    return updated;
  }
}
