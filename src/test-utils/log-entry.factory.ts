import { MediaType } from "@prisma/client";
import type { LogEntryWithMedia } from "../modules/activity/log.service";

export interface LogEntryOverrides {
  userId?: string;
  mediaItemId?: string;
  loggedAt?: Date;
  duration?: number | null;
  platform?: string | null;
  playerCount?: number | null;
  won?: boolean | null;
  title?: string;
  imageUrl?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  parentTitle?: string;
}

export const createLogEntry = (
  id: string,
  type: MediaType,
  overrides: LogEntryOverrides = {},
): LogEntryWithMedia => {
  const loggedAt = overrides.loggedAt ?? new Date(2026, 7, 24, 12);
  const mediaItemId = overrides.mediaItemId ?? `media-${id}`;
  const parent = overrides.parentTitle ? {
    id: `parent-${id}`,
    type: MediaType.TV_SHOW,
    title: overrides.parentTitle,
    sortTitle: overrides.parentTitle.toLowerCase(),
    isSkeleton: false,
    createdByUserId: null,
    parentId: null,
    seasonNumber: null,
    episodeNumber: null,
    description: null,
    imageUrl: null,
    imageSourceUrl: null,
    year: null,
    duration: null,
    createdAt: loggedAt,
    updatedAt: loggedAt,
  } : null;

  return {
    id,
    userId: overrides.userId ?? "user-1",
    mediaItemId,
    loggedAt,
    duration: overrides.duration ?? null,
    notes: null,
    platform: overrides.platform ?? null,
    playerCount: overrides.playerCount ?? null,
    won: overrides.won ?? null,
    source: "MANUAL",
    createdAt: loggedAt,
    mediaItem: {
      id: mediaItemId,
      type,
      title: overrides.title ?? `Title ${id}`,
      sortTitle: `title ${id}`,
      isSkeleton: false,
      createdByUserId: null,
      parentId: parent?.id ?? null,
      seasonNumber: overrides.seasonNumber ?? null,
      episodeNumber: overrides.episodeNumber ?? null,
      description: null,
      imageUrl: overrides.imageUrl ?? null,
      imageSourceUrl: null,
      year: null,
      duration: null,
      createdAt: loggedAt,
      updatedAt: loggedAt,
      parent,
    },
  };
};
