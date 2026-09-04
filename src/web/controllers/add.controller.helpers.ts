import { ForbiddenException } from "@nestjs/common";
import { type MediaItem, MediaType } from "@prisma/client";
import type { MediaService } from "../../modules/media/media.service";

export interface ConfirmAddBody {
  type?: string;
  provider?: string;
  externalId?: string;
}

export interface SubmitAddBody {
  type?: string;
  mediaItemId?: string;
  title?: string;
  loggedAt?: string;
  duration?: string;
  defaultDuration?: string;
  notes?: string;
  seasonNumber?: string;
  episodeNumber?: string;
  platform?: string;
  playerCount?: string;
  won?: string;
}

export interface EntryFormModel {
  type: MediaType;
  typeLabel: string;
  accentClass: string;
  mediaItemId?: string;
  title?: string;
  loggedAt: string;
  defaultDuration?: number;
  duration?: string;
  notes?: string;
  seasonNumber?: string;
  episodeNumber?: string;
  platform?: string;
  playerCount?: string;
  won?: string;
  isMovie: boolean;
  isTvEpisode: boolean;
  isGame: boolean;
  isBoardGame: boolean;
  isMusicTrack: boolean;
  error?: string;
  errors?: Record<string, string>;
}

export interface TypeDetail {
  label: string;
  icon: string;
  accentClass: string;
}

export class AddFormValidationError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

export const ADD_TYPES = [
  MediaType.MOVIE,
  MediaType.TV_EPISODE,
  MediaType.GAME,
  MediaType.BOARD_GAME,
  MediaType.MUSIC_TRACK,
] as const;

export const TYPE_DETAILS: Record<(typeof ADD_TYPES)[number], TypeDetail> = {
  [MediaType.MOVIE]: {
    label: "Movie",
    icon: "film",
    accentClass: "type-movie",
  },
  [MediaType.TV_EPISODE]: {
    label: "TV episode",
    icon: "tv-2",
    accentClass: "type-tv",
  },
  [MediaType.GAME]: {
    label: "Game",
    icon: "gamepad-2",
    accentClass: "type-game",
  },
  [MediaType.BOARD_GAME]: {
    label: "Board game",
    icon: "dice-5",
    accentClass: "type-boardgame",
  },
  [MediaType.MUSIC_TRACK]: {
    label: "Music track",
    icon: "music",
    accentClass: "type-music",
  },
};

export const parseType = (rawType?: string): (typeof ADD_TYPES)[number] => {
  if (!ADD_TYPES.includes(rawType as (typeof ADD_TYPES)[number])) {
    throw new Error("Unsupported media type");
  }

  return rawType as (typeof ADD_TYPES)[number];
};

const parsePositiveInteger = (value: string | undefined, label: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive whole number`);
  }

  return parsed;
};

const parseOptionalPositiveInteger = (
  value: string | undefined,
  label: string,
): number | undefined => {
  if (!value?.trim()) {
    return undefined;
  }

  return parsePositiveInteger(value, label);
};

export const validateSubmission = (type: MediaType, body: SubmitAddBody) => {
  if (!body.mediaItemId && !body.title?.trim()) {
    throw new AddFormValidationError("title", "Title is required");
  }

  if (!body.loggedAt || !/^\d{4}-\d{2}-\d{2}$/.test(body.loggedAt)) {
    throw new AddFormValidationError("loggedAt", "A valid date is required");
  }

  const duration = parseOptionalPositiveInteger(body.duration, "Duration");
  if (type === MediaType.GAME && duration === undefined) {
    throw new AddFormValidationError("duration", "Duration is required for games");
  }
  if (type === MediaType.GAME && !body.platform?.trim()) {
    throw new AddFormValidationError("platform", "Platform is required for games");
  }

  const playerCount = parseOptionalPositiveInteger(body.playerCount, "Player count");
  return {
    loggedAt: new Date(`${body.loggedAt}T12:00:00`),
    duration,
    playerCount,
  };
};

export const buildEntryFormModel = (
  type: (typeof ADD_TYPES)[number],
  values: Partial<SubmitAddBody> = {},
  error?: string,
  errors?: Record<string, string>,
): EntryFormModel => {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

  return {
    type,
    typeLabel: TYPE_DETAILS[type].label,
    accentClass: TYPE_DETAILS[type].accentClass,
    mediaItemId: values.mediaItemId,
    title: values.title,
    loggedAt: values.loggedAt ?? localDate,
    defaultDuration: values.defaultDuration ? Number(values.defaultDuration) : undefined,
    duration: values.duration,
    notes: values.notes,
    seasonNumber: values.seasonNumber,
    episodeNumber: values.episodeNumber,
    platform: values.platform,
    playerCount: values.playerCount,
    won: values.won,
    isMovie: type === MediaType.MOVIE,
    isTvEpisode: type === MediaType.TV_EPISODE,
    isGame: type === MediaType.GAME,
    isBoardGame: type === MediaType.BOARD_GAME,
    isMusicTrack: type === MediaType.MUSIC_TRACK,
    error,
    errors,
  };
};

export const resolveSubmissionMediaItem = async (
  mediaService: MediaService,
  type: (typeof ADD_TYPES)[number],
  body: SubmitAddBody,
  userId: string,
): Promise<MediaItem> => {
  let selected: MediaItem | null = null;
  if (body.mediaItemId) {
    selected = await mediaService.findById(body.mediaItemId);
    if (!selected) {
      throw new Error("Selected media item no longer exists");
    }
    if (selected.isSkeleton && selected.createdByUserId !== userId) {
      throw new ForbiddenException("You cannot log another user's unidentified item");
    }
  }

  if (type !== MediaType.TV_EPISODE) {
    if (selected) {
      if (selected.type !== type) {
        throw new Error("Selected media item has the wrong type");
      }
      return selected;
    }

    return mediaService.findOrCreateSkeleton(body.title?.trim() ?? "", type, userId);
  }

  const seasonNumber = parsePositiveInteger(body.seasonNumber, "Season number");
  const episodeNumber = parsePositiveInteger(body.episodeNumber, "Episode number");
  const show =
    selected ??
    (await mediaService.findOrCreateSkeleton(body.title?.trim() ?? "", MediaType.TV_SHOW, userId));

  if (show.type !== MediaType.TV_SHOW) {
    throw new Error("Selected media item is not a TV show");
  }

  return mediaService.findOrCreateEpisodeSkeleton(
    show.id,
    show.title,
    seasonNumber,
    episodeNumber,
    userId,
  );
};
