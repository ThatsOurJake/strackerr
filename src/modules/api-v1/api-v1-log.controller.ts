import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { LogSource, MediaType } from "@prisma/client";
import type { Request } from "express";
import { LogService } from "../activity/log.service";
import { MediaService } from "../media/media.service";
import {
  type CreateTypedLogOptions,
  createApiLogEntry,
  getApiRequestUserId,
  toApiLogResponse,
} from "./api-v1-log.controller.helpers";
import {
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
  PaginatedLogsResponseDto,
} from "./dto/response.dto";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

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
      getApiRequestUserId(request),
      {
        type: query.type,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      },
      query.page,
      query.limit,
    );

    return {
      data: result.data.map((entry) => toApiLogResponse(entry)),
      total: result.total,
      page: query.page,
    };
  }

  private async createTypedLog(
    options: CreateTypedLogOptions,
  ): Promise<CreatedLogResponseDto> {
    return createApiLogEntry(
      this.mediaService,
      this.logService,
      LogSource.API,
      options,
    );
  }
}
