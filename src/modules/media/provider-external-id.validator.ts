import { BadRequestException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import type { MetadataProviderName } from "../metadata/metadata-provider.interface";

const PROVIDER_EXTERNAL_ID_PATTERNS: Record<MetadataProviderName, RegExp> = {
  tmdb: /^(movie|tv):\d+(?::\d+:\d+)?$/,
  anilist: /^anilist:\d+$/,
  igdb: /^igdb:\d+$/,
  bgg: /^bgg:\d+$/,
  musicbrainz: /^musicbrainz:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

export const isProviderExternalIdValid = (
  providerName: MetadataProviderName,
  externalId: string,
): boolean => {
  return PROVIDER_EXTERNAL_ID_PATTERNS[providerName].test(externalId);
};

export const assertProviderExternalId = (
  providerName: MetadataProviderName,
  externalId: string,
): void => {
  if (!isProviderExternalIdValid(providerName, externalId)) {
    throw new BadRequestException("Selected identity is invalid");
  }
};

export const normalizeProviderExternalId = (
  providerName: MetadataProviderName,
  identifier: string,
  mediaType: MediaType,
): string => {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new BadRequestException("Identifier lookup is invalid");
  }

  if (providerName === "tmdb") {
    if (/^(movie|tv):\d+(?::\d+:\d+)?$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    if (!/^\d+$/.test(trimmed)) {
      throw new BadRequestException("TMDB ids must be numeric or movie:123 / tv:123 format");
    }

    const prefix = mediaType === MediaType.MOVIE ? "movie" : "tv";
    return `${prefix}:${trimmed}`;
  }

  const stripProviderPrefix = (
    raw: string,
    prefix: string,
  ): string => raw.toLowerCase().startsWith(`${prefix}:`) ? raw.slice(prefix.length + 1) : raw;

  if (providerName === "anilist") {
    const numeric = stripProviderPrefix(trimmed, "anilist");
    if (!/^\d+$/.test(numeric)) {
      throw new BadRequestException("AniList ids must be numeric");
    }
    return `anilist:${numeric}`;
  }

  if (providerName === "igdb") {
    const numeric = stripProviderPrefix(trimmed, "igdb");
    if (!/^\d+$/.test(numeric)) {
      throw new BadRequestException("IGDB ids must be numeric");
    }
    return `igdb:${numeric}`;
  }

  if (providerName === "bgg") {
    const numeric = stripProviderPrefix(trimmed, "bgg");
    if (!/^\d+$/.test(numeric)) {
      throw new BadRequestException("BoardGameGeek ids must be numeric");
    }
    return `bgg:${numeric}`;
  }

  const mbid = stripProviderPrefix(trimmed, "musicbrainz");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mbid)) {
    throw new BadRequestException("MusicBrainz ids must be a UUID");
  }
  return `musicbrainz:${mbid.toLowerCase()}`;
};
