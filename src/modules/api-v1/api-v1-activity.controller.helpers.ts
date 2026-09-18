import { UnauthorizedException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import type { Request } from "express";
import type { ActivityEntryWithMedia } from "../activity/activity.service";
import {
  type CreatedBoardGameActivityDto,
  type CreatedActivityResponseDto,
  type CreatedGameActivityDto,
  type CreatedMovieActivityDto,
  type CreatedMusicActivityDto,
  type CreatedTvEpisodeActivityDto,
  type ActivityEntryResponseDto,
} from "./dto/response.dto";

export const getApiRequestUserId = (request: Request): string => {
  if (!request.user) {
    throw new UnauthorizedException("Invalid or missing API key");
  }

  return request.user.userId;
};

export const toApiActivityResponse = (entry: ActivityEntryWithMedia): ActivityEntryResponseDto => {
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

export const toCreatedApiActivityResponse = (
  entry: ActivityEntryWithMedia,
): CreatedActivityResponseDto => {
  const response = {
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
    } as CreatedTvEpisodeActivityDto;
  }

  if (entry.mediaItem.type === MediaType.GAME) {
    return {
      ...response,
      type: MediaType.GAME,
      platform: entry.platform,
    } as CreatedGameActivityDto;
  }

  if (entry.mediaItem.type === MediaType.BOARD_GAME) {
    return {
      ...response,
      type: MediaType.BOARD_GAME,
      players: entry.playerCount,
      won: entry.won,
    } as CreatedBoardGameActivityDto;
  }

  return {
    ...response,
    type: entry.mediaItem.type,
  } as CreatedMovieActivityDto | CreatedMusicActivityDto;
};
