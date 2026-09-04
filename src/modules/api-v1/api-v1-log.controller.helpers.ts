import { UnauthorizedException } from "@nestjs/common";
import { type LogSource, type MediaItem, MediaType } from "@prisma/client";
import type { Request } from "express";
import type { CreateLogData, LogEntryWithMedia, LogService } from "../activity/log.service";
import type { MediaService } from "../media/media.service";
import type { BaseCreateLogDto } from "./dto/log.dto";
import {
  type CreatedBoardGameLogResponseDto,
  type CreatedGameLogResponseDto,
  type CreatedLogResponseDto,
  type CreatedMovieLogResponseDto,
  type CreatedMusicLogResponseDto,
  type CreatedTvEpisodeLogResponseDto,
  type LogEntryResponseDto,
} from "./dto/response.dto";

export interface CreateTypedLogOptions {
  title: string;
  type: MediaType;
  dto: BaseCreateLogDto;
  request: Request;
  platform?: string;
  playerCount?: number;
  won?: boolean;
  season?: number;
  episode?: number;
}

export const getApiRequestUserId = (request: Request): string => {
  if (!request.user) {
    throw new UnauthorizedException("Invalid or missing API key");
  }

  return request.user.userId;
};

export const resolveApiLogMediaItem = async (
  mediaService: MediaService,
  options: CreateTypedLogOptions,
  userId: string,
): Promise<MediaItem> => {
  const matched =
    options.dto.provider && options.dto.externalId
      ? await mediaService.findByExternalId(options.dto.provider, options.dto.externalId)
      : null;

  if (options.type !== MediaType.TV_EPISODE) {
    return (
      matched ??
      mediaService.findOrCreateSkeleton(options.title, options.type, userId)
    );
  }

  if (matched?.type === MediaType.TV_EPISODE) {
    return matched;
  }

  const show =
    matched ??
    (await mediaService.findOrCreateSkeleton(options.title, MediaType.TV_SHOW, userId));

  return mediaService.findOrCreateEpisodeSkeleton(
    show.id,
    show.title,
    options.season ?? 1,
    options.episode ?? 1,
    userId,
  );
};

export const createApiLogEntry = async (
  mediaService: MediaService,
  logService: LogService,
  logSource: LogSource,
  options: CreateTypedLogOptions,
): Promise<CreatedLogResponseDto> => {
  const userId = getApiRequestUserId(options.request);
  const mediaItem = await resolveApiLogMediaItem(mediaService, options, userId);
  const createData: CreateLogData = {
    mediaItemId: mediaItem.id,
    loggedAt: options.dto.loggedAt ? new Date(options.dto.loggedAt) : new Date(),
    duration: options.dto.duration,
    platform: options.platform,
    playerCount: options.playerCount,
    won: options.won,
  };
  const entry = await logService.create(createData, userId, logSource);

  return toCreatedApiLogResponse(entry);
};

export const toApiLogResponse = (entry: LogEntryWithMedia): LogEntryResponseDto => {
  return {
    id: entry.id,
    title: entry.mediaItem.parent?.title ?? entry.mediaItem.title,
    type: entry.mediaItem.type,
    loggedAt: entry.loggedAt,
    duration: entry.duration,
    platform: entry.platform,
    players: entry.playerCount,
    won: entry.won,
    season: entry.mediaItem.seasonNumber,
    episode: entry.mediaItem.episodeNumber,
  };
};

export const toCreatedApiLogResponse = (
  entry: LogEntryWithMedia,
): CreatedLogResponseDto => {
  const response: CreatedLogResponseDto = {
    id: entry.id,
    title: entry.mediaItem.parent?.title ?? entry.mediaItem.title,
    loggedAt: entry.loggedAt,
    duration: entry.duration,
    status: "created",
  };

  if (entry.mediaItem.type === MediaType.TV_EPISODE) {
    return {
      ...response,
      type: MediaType.TV_EPISODE,
      season: entry.mediaItem.seasonNumber,
      episode: entry.mediaItem.episodeNumber,
    } as CreatedTvEpisodeLogResponseDto;
  }

  if (entry.mediaItem.type === MediaType.GAME) {
    return {
      ...response,
      type: MediaType.GAME,
      platform: entry.platform,
    } as CreatedGameLogResponseDto;
  }

  if (entry.mediaItem.type === MediaType.BOARD_GAME) {
    return {
      ...response,
      type: MediaType.BOARD_GAME,
      players: entry.playerCount,
      won: entry.won,
    } as CreatedBoardGameLogResponseDto;
  }

  return {
    ...response,
    type: entry.mediaItem.type,
  } as CreatedMovieLogResponseDto | CreatedMusicLogResponseDto;
};
