import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { MediaType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { Events } from "../../infrastructure/events/event-names";
import { ShowIdentifiedEvent } from "../../infrastructure/events/events";
import { MetadataService } from "../metadata/metadata.service";
import {
  Episode,
  IMetadataProvider,
  MetadataProviderName,
} from "../metadata/metadata-provider.interface";
import { MediaService } from "./media.service";

interface SyncedEpisode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
}

@Injectable()
export class EpisodeSyncService {
  private readonly logger = new Logger(EpisodeSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataService: MetadataService,
  ) { }

  @OnEvent(Events.SHOW_IDENTIFIED, { async: true })
  async handleShowIdentified(event: ShowIdentifiedEvent): Promise<void> {
    await this.syncShow(
      event.mediaItemId,
      event.provider,
      event.externalId,
      event.userApiKey,
    );
  }

  async syncShow(
    mediaItemId: string,
    providerName: string,
    externalId: string,
    userApiKey?: string,
  ): Promise<void> {
    let provider: IMetadataProvider;
    let seasonCount: number;

    try {
      provider = this.metadataService.getProvider(
        MediaType.TV_SHOW,
        providerName as MetadataProviderName,
        providerName === "anilist",
      );
      const show = await provider.getById(externalId, userApiKey);
      seasonCount = show.seasonCount ?? 1;
      if (!provider.getEpisodes) {
        this.logger.warn(`Provider ${providerName} cannot sync TV episodes.`);
        return;
      }
    } catch (error) {
      this.logWarning(mediaItemId, error);
      return;
    }

    const syncedEpisodes: SyncedEpisode[] = [];
    for (let seasonNumber = 1; seasonNumber <= seasonCount; seasonNumber += 1) {
      let episodes: Episode[];
      try {
        episodes = await provider.getEpisodes(
          externalId,
          seasonNumber,
          userApiKey,
        );
      } catch (error) {
        this.logWarning(mediaItemId, error, seasonNumber);
        continue;
      }

      for (const episode of episodes) {
        try {
          const syncedEpisode = await this.upsertEpisode(mediaItemId, episode);
          syncedEpisodes.push(syncedEpisode);
        } catch (error) {
          this.logWarning(mediaItemId, error, seasonNumber);
        }
      }
    }

    try {
      await this.relinkSkeletonLogs(mediaItemId, syncedEpisodes);
      this.logger.log(
        `Episode sync complete for ${mediaItemId}: ${syncedEpisodes.length} episodes synchronized.`,
      );
    } catch (error) {
      this.logWarning(mediaItemId, error);
    }
  }

  private async upsertEpisode(
    mediaItemId: string,
    episode: Episode,
  ): Promise<SyncedEpisode> {
    return this.prisma.mediaItem.upsert({
      where: {
        parentId_seasonNumber_episodeNumber: {
          parentId: mediaItemId,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
        },
      },
      create: {
        type: MediaType.TV_EPISODE,
        parentId: mediaItemId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        sortTitle: MediaService.computeSortTitle(episode.title),
        description: episode.description,
        duration: episode.duration,
        imageSourceUrl: null,
        isSkeleton: false,
      },
      update: {
        title: episode.title,
        sortTitle: MediaService.computeSortTitle(episode.title),
        description: episode.description,
        duration: episode.duration,
        imageSourceUrl: null,
        isSkeleton: false,
        createdByUserId: null,
      },
      select: { id: true, seasonNumber: true, episodeNumber: true },
    }) as Promise<SyncedEpisode>;
  }

  private async relinkSkeletonLogs(
    mediaItemId: string,
    syncedEpisodes: SyncedEpisode[],
  ): Promise<void> {
    const canonicalByPosition = new Map(
      syncedEpisodes.map((episode) => [
        `${episode.seasonNumber}:${episode.episodeNumber}`,
        episode.id,
      ]),
    );
    const skeletons = await this.prisma.mediaItem.findMany({
      where: {
        parentId: mediaItemId,
        isSkeleton: true,
        logEntries: { some: {} },
      },
      select: { id: true, seasonNumber: true, episodeNumber: true },
    });

    for (const skeleton of skeletons) {
      const canonicalId = canonicalByPosition.get(
        `${skeleton.seasonNumber}:${skeleton.episodeNumber}`,
      );
      if (!canonicalId || canonicalId === skeleton.id) {
        continue;
      }

      await this.prisma.$transaction([
        this.prisma.logEntry.updateMany({
          where: { mediaItemId: skeleton.id },
          data: { mediaItemId: canonicalId },
        }),
        this.prisma.mediaItem.delete({ where: { id: skeleton.id } }),
      ]);
    }
  }

  private logWarning(
    mediaItemId: string,
    error: unknown,
    seasonNumber?: number,
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    const season = seasonNumber ? ` season ${seasonNumber}` : "";
    this.logger.warn(
      `Episode sync failed for ${mediaItemId}${season}: ${message}`,
    );
  }
}
