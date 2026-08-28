import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { LogSource, type MediaItem, MediaType } from "@prisma/client";
import type { Request } from "express";
import {
  type CreateLogData,
  type LogEntryWithMedia,
  LogService,
} from "../activity/log.service";
import { MediaService } from "../media/media.service";
import {
  type BaseCreateLogDto,
  CreateBoardGameLogDto,
  CreateGameLogDto,
  CreateMovieLogDto,
  CreateMusicLogDto,
  CreateTvEpisodeLogDto,
  GetLogsQueryDto,
} from "./dto/log.dto";
import {
  CreatedBoardGameLogResponseDto,
  CreatedGameLogResponseDto,
  type CreatedLogResponseDto,
  CreatedMovieLogResponseDto,
  CreatedMusicLogResponseDto,
  CreatedTvEpisodeLogResponseDto,
  type LogEntryResponseDto,
  PaginatedLogsResponseDto,
} from "./dto/response.dto";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

interface CreateTypedLogOptions {
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

@ApiTags("log")
@ApiSecurity("ApiKey")
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller("api/v1/log")
export class ApiV1LogController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly logService: LogService,
  ) { }

  @Post("movie")
  @ApiOperation({ summary: "Log a movie" })
  @ApiResponse({
    status: 201,
    type: CreatedMovieLogResponseDto,
    description: "Movie logged",
  })
  @ApiResponse({ status: 400, description: "Invalid request fields" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  @ApiResponse({ status: 409, description: "Duplicate entry" })
  createMovie(@Body() dto: CreateMovieLogDto, @Req() request: Request) {
    return this.createTypedLog({
      title: dto.title,
      type: MediaType.MOVIE,
      dto,
      request,
    });
  }

  @Post("tv-episode")
  @ApiOperation({ summary: "Log a TV episode" })
  @ApiResponse({
    status: 201,
    type: CreatedTvEpisodeLogResponseDto,
    description: "TV episode logged",
  })
  @ApiResponse({ status: 400, description: "Invalid request fields" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  @ApiResponse({ status: 409, description: "Duplicate entry" })
  createTvEpisode(@Body() dto: CreateTvEpisodeLogDto, @Req() request: Request) {
    return this.createTypedLog({
      title: dto.show,
      type: MediaType.TV_EPISODE,
      dto,
      request,
      season: dto.season,
      episode: dto.episode,
    });
  }

  @Post("game")
  @ApiOperation({ summary: "Log a video game session" })
  @ApiResponse({
    status: 201,
    type: CreatedGameLogResponseDto,
    description: "Game session logged",
  })
  @ApiResponse({ status: 400, description: "Invalid request fields" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  @ApiResponse({ status: 409, description: "Duplicate entry" })
  createGame(@Body() dto: CreateGameLogDto, @Req() request: Request) {
    return this.createTypedLog({
      title: dto.title,
      type: MediaType.GAME,
      dto,
      request,
      platform: dto.platform,
    });
  }

  @Post("board-game")
  @ApiOperation({ summary: "Log a board game session" })
  @ApiResponse({
    status: 201,
    type: CreatedBoardGameLogResponseDto,
    description: "Board game session logged",
  })
  @ApiResponse({ status: 400, description: "Invalid request fields" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  @ApiResponse({ status: 409, description: "Duplicate entry" })
  createBoardGame(@Body() dto: CreateBoardGameLogDto, @Req() request: Request) {
    return this.createTypedLog({
      title: dto.title,
      type: MediaType.BOARD_GAME,
      dto,
      request,
      playerCount: dto.players,
      won: dto.won,
    });
  }

  @Post("music")
  @ApiOperation({ summary: "Log a music track" })
  @ApiResponse({
    status: 201,
    type: CreatedMusicLogResponseDto,
    description: "Music track logged",
  })
  @ApiResponse({ status: 400, description: "Invalid request fields" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  @ApiResponse({ status: 409, description: "Duplicate entry" })
  createMusic(@Body() dto: CreateMusicLogDto, @Req() request: Request) {
    return this.createTypedLog({
      title: dto.title,
      type: MediaType.MUSIC_TRACK,
      dto,
      request,
    });
  }

  @Get()
  @ApiOperation({ summary: "List activity log entries" })
  @ApiResponse({
    status: 200,
    type: PaginatedLogsResponseDto,
    description: "Paginated user-scoped log entries",
  })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  async findAll(
    @Query() query: GetLogsQueryDto,
    @Req() request: Request,
  ): Promise<PaginatedLogsResponseDto> {
    const result = await this.logService.findByUserPaginated(
      this.getUserId(request),
      {
        type: query.type,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      },
      query.page,
      query.limit,
    );

    return {
      data: result.data.map((entry) => this.toResponse(entry)),
      total: result.total,
      page: query.page,
    };
  }

  private async createTypedLog(
    options: CreateTypedLogOptions,
  ): Promise<CreatedLogResponseDto> {
    const userId = this.getUserId(options.request);
    const mediaItem = await this.resolveMediaItem(options, userId);
    const createData: CreateLogData = {
      mediaItemId: mediaItem.id,
      loggedAt: options.dto.loggedAt
        ? new Date(options.dto.loggedAt)
        : new Date(),
      duration: options.dto.duration,
      platform: options.platform,
      playerCount: options.playerCount,
      won: options.won,
    };
    const entry = await this.logService.create(
      createData,
      userId,
      LogSource.API,
    );
    return this.toCreatedResponse(entry);
  }

  private async resolveMediaItem(
    options: CreateTypedLogOptions,
    userId: string,
  ): Promise<MediaItem> {
    const matched =
      options.dto.provider && options.dto.externalId
        ? await this.mediaService.findByExternalId(
          options.dto.provider,
          options.dto.externalId,
        )
        : null;

    if (options.type !== MediaType.TV_EPISODE) {
      return (
        matched ??
        this.mediaService.findOrCreateSkeleton(
          options.title,
          options.type,
          userId,
        )
      );
    }

    if (matched?.type === MediaType.TV_EPISODE) {
      return matched;
    }

    const show =
      matched ??
      (await this.mediaService.findOrCreateSkeleton(
        options.title,
        MediaType.TV_SHOW,
        userId,
      ));
    return this.mediaService.findOrCreateEpisodeSkeleton(
      show.id,
      show.title,
      options.season ?? 1,
      options.episode ?? 1,
      userId,
    );
  }

  private toResponse(entry: LogEntryWithMedia): LogEntryResponseDto {
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
  }

  private toCreatedResponse(entry: LogEntryWithMedia): CreatedLogResponseDto {
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
  }

  private getUserId(request: Request): string {
    if (!request.user) {
      throw new UnauthorizedException("Invalid or missing API key");
    }
    return request.user.userId;
  }
}
