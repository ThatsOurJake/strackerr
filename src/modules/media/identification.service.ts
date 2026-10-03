import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { MediaType } from "@prisma/client";
import { Events } from "../../infrastructure/events/event-names";
import { MetadataService } from "../metadata/metadata.service";
import {
  MediaItemDetail,
  type MetadataProviderName,
} from "../metadata/metadata-provider.interface";
import { EpisodeSyncService } from "./episode-sync.service";
import { MediaService } from "./media.service";
import { assertProviderExternalId } from "./provider-external-id.validator";

export const IDENTIFICATION_FIELDS = [
  "title",
  "description",
  "year",
  "duration",
  "artwork",
] as const;

export type IdentificationField = (typeof IDENTIFICATION_FIELDS)[number];

@Injectable()
export class IdentificationService {
  constructor(
    private readonly mediaService: MediaService,
    private readonly metadataService: MetadataService,
    private readonly episodeSyncService: EpisodeSyncService,
    @Optional() private readonly events?: EventEmitter2,
  ) { }

  async identifyFromConfiguredAlias(
    mediaItemId: string,
    userId: string,
    fields?: string[],
  ) {
    const mediaItem = await this.mediaService.findById(mediaItemId);
    if (!mediaItem) {
      throw new NotFoundException("Media item not found");
    }

    const hasAccess = await this.mediaService.hasUserAccess(mediaItem.id, userId);
    if (!hasAccess) {
      throw new NotFoundException("Media item not found");
    }

    if (!mediaItem.isSkeleton) {
      throw new ConflictException(
        "Media item is already identified and cannot be identified again",
      );
    }

    const resolvedProvider = await this.metadataService.getProviderForUser(
      mediaItem.type,
      userId,
    );
    const providerName = resolvedProvider.provider.name;
    const externalAliases = await this.mediaService.listExternalAliases(mediaItemId);
    const providerAliases = externalAliases.filter(
      (alias) => alias.providerNamespace === providerName,
    );

    if (providerAliases.length === 0) {
      throw new UnprocessableEntityException(
        `Cannot identify item: missing external alias for configured provider ${providerName}`,
      );
    }

    if (providerAliases.length > 1) {
      throw new ConflictException(
        `Cannot identify item: multiple aliases found for configured provider ${providerName}`,
      );
    }

    const providerAlias = providerAliases[0];
    try {
      assertProviderExternalId(providerName, providerAlias.externalId);
    } catch {
      throw new UnprocessableEntityException(
        `Cannot identify item: configured provider alias ${providerAlias.externalId} is invalid for ${providerName}`,
      );
    }

    try {
      return await this.identify(
        mediaItemId,
        providerName,
        providerAlias.externalId,
        userId,
        fields,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      const failureMessage = error instanceof Error
        ? error.message
        : "Unknown provider failure";
      throw new UnprocessableEntityException(
        `Cannot identify item: provider lookup failed for ${providerName} alias ${providerAlias.externalId}. ${failureMessage}`,
      );
    }
  }

  async identify(
    mediaItemId: string,
    providerName: MetadataProviderName,
    externalId: string,
    userId: string,
    fields?: string[],
  ) {
    const selectedFields = this.validateSelectedFields(fields);
    const mediaItem = await this.mediaService.findByIdWithExternalIds(mediaItemId);
    if (!mediaItem) {
      throw new NotFoundException("Media item not found");
    }

    const hasAccess = await this.mediaService.hasUserAccess(mediaItem.id, userId);
    if (!hasAccess) {
      throw new ForbiddenException("You cannot identify this media item");
    }

    if (!mediaItem.isSkeleton) {
      throw new ConflictException(
        "Media item is already identified and cannot be identified again",
      );
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
      userId,
      providerName,
      externalId,
    );
    if (conflictTarget && conflictTarget.id !== mediaItemId) {
      throw new ConflictException(
        "Provider identity is already in use on one of your items",
      );
    }

    return this.applyMetadataRefresh(
      mediaItem,
      selectedFields,
      mediaItem.title,
      providerName,
      externalId,
      metadata,
      resolvedProvider.apiKey,
      true,
      userId,
    );
  }

  async refetch(
    mediaItemId: string,
    userId: string,
    fields?: string[],
  ) {
    const selectedFields = this.validateSelectedFields(fields);
    const mediaItem = await this.mediaService.findByIdWithExternalIds(mediaItemId);
    if (!mediaItem) {
      throw new NotFoundException("Media item not found");
    }

    const hasAccess = await this.mediaService.hasUserAccess(mediaItem.id, userId);
    if (!hasAccess) {
      throw new ForbiddenException("You cannot refresh this media item");
    }

    if (mediaItem.isSkeleton) {
      throw new ConflictException("Media item must be identified before refetching");
    }

    const canonicalIdentity = mediaItem.externalIds[0];
    if (!canonicalIdentity) {
      throw new ConflictException("Media item has no provider identity to refetch");
    }

    const resolvedProvider = await this.metadataService.getProviderForUser(
      mediaItem.type,
      userId,
      {
        providerOverride: canonicalIdentity.provider as MetadataProviderName,
        anime: canonicalIdentity.provider === "anilist",
      },
    );
    const metadata = await resolvedProvider.provider.getById(
      canonicalIdentity.externalId,
      resolvedProvider.apiKey,
    );
    this.assertMetadataType(mediaItem.type, metadata.type);

    return this.applyMetadataRefresh(
      mediaItem,
      selectedFields,
      mediaItem.title,
      canonicalIdentity.provider as MetadataProviderName,
      canonicalIdentity.externalId,
      metadata,
      resolvedProvider.apiKey,
      false,
      userId,
    );
  }

  private async applyMetadataRefresh(
    mediaItem: Awaited<ReturnType<MediaService["findByIdWithExternalIds"]>>,
    selectedFields: IdentificationField[],
    originalTitle: string,
    providerName: MetadataProviderName,
    externalId: string,
    metadata: MediaItemDetail,
    apiKey: string | undefined,
    shouldPersistIdentity: boolean,
    userId: string,
  ) {
    if (!mediaItem) {
      throw new NotFoundException("Media item not found");
    }

    const selectedFieldSet = new Set(selectedFields);
    const usesOwnArtwork = mediaItem.type !== MediaType.TV_EPISODE;
    const updatePayload: Parameters<MediaService["update"]>[1] = {
      isSkeleton: false,
    };

    if (selectedFieldSet.has("title")) {
      updatePayload.title = metadata.title;
    }
    if (selectedFieldSet.has("description")) {
      updatePayload.description = metadata.description ?? null;
    }
    if (selectedFieldSet.has("year")) {
      updatePayload.year = metadata.year ?? null;
    }
    if (selectedFieldSet.has("duration")) {
      updatePayload.duration = metadata.duration ?? null;
    }
    if (selectedFieldSet.has("artwork")) {
      updatePayload.imageUrl = null;
      updatePayload.imageSourceUrl = usesOwnArtwork ? metadata.imageUrl ?? null : null;
    }

    const updated = await this.mediaService.update(mediaItem.id, {
      ...updatePayload,
    });

    if (shouldPersistIdentity) {
      await this.mediaService.addExternalId(
        mediaItem.id,
        userId,
        providerName,
        externalId,
      );
      await this.mediaService.addAlias(mediaItem.id, userId, originalTitle);
    }

    if (selectedFieldSet.has("artwork") && usesOwnArtwork && metadata.imageUrl) {
      this.events?.emit(Events.IMAGE_CACHE, {
        mediaItemId: mediaItem.id,
        sourceUrl: metadata.imageUrl,
      });
    }

    if (updated.type === MediaType.TV_SHOW) {
      void this.episodeSyncService.syncShow(
        updated.id,
        providerName,
        externalId,
        apiKey,
        userId,
      );
    }

    return updated;
  }

  private validateSelectedFields(fields: string[] | undefined): IdentificationField[] {
    if (fields === undefined) {
      return [...IDENTIFICATION_FIELDS];
    }

    if (fields.length === 0) {
      throw new BadRequestException("At least one field must be selected");
    }

    const uniqueFields = [...new Set(fields.map((field) => field.trim().toLowerCase()))];
    for (const field of uniqueFields) {
      if (!IDENTIFICATION_FIELDS.includes(field as IdentificationField)) {
        throw new BadRequestException(`Unknown field selection: ${field}`);
      }
    }

    return uniqueFields as IdentificationField[];
  }

  private assertMetadataType(sourceType: MediaType, metadataType: MediaType): void {
    if (this.catalogTypeFor(sourceType) !== this.catalogTypeFor(metadataType)) {
      throw new BadRequestException("Selected identity is incompatible");
    }
  }

  private catalogTypeFor(type: MediaType): MediaType {
    return type === MediaType.TV_EPISODE ? MediaType.TV_SHOW : type;
  }
}
