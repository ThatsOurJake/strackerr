import { Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { MediaType } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import type {
  CreateIdentifiedMediaData,
  CreateMediaData,
  ExternalAliasInput,
  UpdateMediaData,
} from "./media-service-helpers/media.types";
import {
  computeMediaSortTitle,
  normaliseMediaAlias,
} from "./media-service-helpers/media.utils";
import { MediaCatalogOperations } from "./media-service-helpers/media-catalog.operations";
import { MediaIdentityOperations } from "./media-service-helpers/media-identity.operations";
import { MediaTagsOperations } from "./media-service-helpers/media-tags.operations";

export type {
  CreateIdentifiedMediaData,
  CreateMediaData,
  ExternalAliasInput,
  UpdateMediaData,
  UserMediaTag,
} from "./media-service-helpers/media.types";

@Injectable()
export class MediaService {
  private readonly catalog: MediaCatalogOperations;
  private readonly identity: MediaIdentityOperations;
  private readonly tags: MediaTagsOperations;

  constructor(prisma: PrismaService, @Optional() events?: EventEmitter2) {
    this.catalog = new MediaCatalogOperations(prisma);
    this.identity = new MediaIdentityOperations(prisma, events);
    this.tags = new MediaTagsOperations(prisma);
  }

  findOrCreateSkeleton(title: string, type: MediaType, userId: string) {
    return this.catalog.findOrCreateSkeleton(title, type, userId);
  }

  findByExternalId(userId: string, provider: string, externalId: string) {
    return this.identity.findByExternalId(userId, provider, externalId);
  }

  findByExternalAlias(
    userId: string,
    providerNamespace: string,
    externalId: string,
  ) {
    return this.identity.findByExternalAlias(
      userId,
      providerNamespace,
      externalId,
    );
  }

  resolveByExternalLookup(
    userId: string,
    providerNamespace: string,
    externalId: string,
  ) {
    return this.identity.resolveByExternalLookup(
      userId,
      providerNamespace,
      externalId,
    );
  }

  findOrCreateIdentified(data: CreateIdentifiedMediaData, userId: string) {
    return this.identity.findOrCreateIdentified(data, userId);
  }

  findOrCreateEpisodeSkeleton(
    parentId: string,
    showTitle: string,
    seasonNumber: number,
    episodeNumber: number,
    userId: string,
  ) {
    return this.catalog.findOrCreateEpisodeSkeleton(
      parentId,
      showTitle,
      seasonNumber,
      episodeNumber,
      userId,
    );
  }

  searchForUser(userId: string, query: string, type?: MediaType) {
    return this.catalog.searchForUser(userId, query, type);
  }

  searchTvShowCandidatesForUser(userId: string, query: string) {
    return this.catalog.searchTvShowCandidatesForUser(userId, query);
  }

  resolveByTitleForUser(userId: string, title: string) {
    return this.catalog.resolveByTitleForUser(userId, title);
  }

  findById(id: string) {
    return this.catalog.findById(id);
  }

  hasUserAccess(mediaItemId: string, userId: string) {
    return this.catalog.hasUserAccess(mediaItemId, userId);
  }

  findByIdWithExternalIds(id: string) {
    return this.catalog.findByIdWithExternalIds(id);
  }

  create(data: CreateMediaData) {
    return this.catalog.create(data);
  }

  createSkeletonWithExternalAliases(input: {
    title: string;
    description?: string;
    type: MediaType;
    userId: string;
    externalAliases?: ExternalAliasInput[];
  }) {
    return this.catalog.createSkeletonWithExternalAliases(input);
  }

  update(id: string, data: UpdateMediaData) {
    return this.catalog.update(id, data);
  }

  addAlias(mediaItemId: string, userId: string, rawAlias: string) {
    return this.identity.addAlias(mediaItemId, userId, rawAlias);
  }

  addExternalId(
    mediaItemId: string,
    userId: string,
    provider: string,
    externalId: string,
  ) {
    return this.identity.addExternalId(
      mediaItemId,
      userId,
      provider,
      externalId,
    );
  }

  listExternalAliases(mediaItemId: string) {
    return this.identity.listExternalAliases(mediaItemId);
  }

  addExternalAlias(
    mediaItemId: string,
    userId: string,
    providerNamespace: string,
    externalId: string,
  ) {
    return this.identity.addExternalAlias(
      mediaItemId,
      userId,
      providerNamespace,
      externalId,
    );
  }

  addExternalAliases(
    mediaItemId: string,
    userId: string,
    aliases: ExternalAliasInput[],
  ) {
    return this.identity.addExternalAliases(mediaItemId, userId, aliases);
  }

  removeExternalAlias(
    mediaItemId: string,
    providerNamespace: string,
    externalId: string,
  ) {
    return this.identity.removeExternalAlias(
      mediaItemId,
      providerNamespace,
      externalId,
    );
  }

  listTagsForItem(mediaItemId: string, userId: string) {
    return this.tags.listTagsForItem(mediaItemId, userId);
  }

  replaceProviderTagsForItem(
    mediaItemId: string,
    userId: string,
    providerNamespace: string,
    tags: string[],
  ) {
    return this.tags.replaceProviderTagsForItem(
      mediaItemId,
      userId,
      providerNamespace,
      tags,
    );
  }

  syncManualTagsForItem(
    mediaItemId: string,
    userId: string,
    tagsToAdd: string[],
    tagIdsToRemove: string[],
  ) {
    return this.tags.syncManualTagsForItem(
      mediaItemId,
      userId,
      tagsToAdd,
      tagIdsToRemove,
    );
  }

  static normaliseAlias(title: string): string {
    return normaliseMediaAlias(title);
  }

  static computeSortTitle(title: string): string {
    return computeMediaSortTitle(title);
  }
}
