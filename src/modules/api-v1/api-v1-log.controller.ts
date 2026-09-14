import {
  BadRequestException,
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
  ApiQuery,
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
  @ApiQuery({ name: "type", enum: MediaType, required: false })
  @ApiQuery({
    name: "dateFrom",
    type: String,
    required: false,
    example: "2026-01-01",
  })
  @ApiQuery({
    name: "dateTo",
    type: String,
    required: false,
    example: "2026-12-31",
  })
  @ApiQuery({ name: "page", type: Number, required: false, example: 1 })
  @ApiQuery({ name: "limit", type: Number, required: false, example: 50 })
  @ApiResponse({
    status: 200,
    type: PaginatedLogsResponseDto,
    description: "Paginated user-scoped log entries",
  })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  async findAll(
    @Query("type") type: MediaType | undefined,
    @Query("dateFrom") dateFrom: string | undefined,
    @Query("dateTo") dateTo: string | undefined,
    @Query("page") rawPage: string | undefined,
    @Query("limit") rawLimit: string | undefined,
    @Req() request: Request,
  ): Promise<PaginatedLogsResponseDto> {
    if (type && !Object.values(MediaType).includes(type)) {
      throw new BadRequestException("type is invalid");
    }

    const page = rawPage ? Number.parseInt(rawPage, 10) : 1;
    const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 50;
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException("page must be at least 1");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException("limit must be between 1 and 100");
    }

    const parsedDateFrom = dateFrom ? new Date(dateFrom) : undefined;
    const parsedDateTo = dateTo ? new Date(dateTo) : undefined;
    if (parsedDateFrom && Number.isNaN(parsedDateFrom.getTime())) {
      throw new BadRequestException("dateFrom must be a valid ISO date");
    }
    if (parsedDateTo && Number.isNaN(parsedDateTo.getTime())) {
      throw new BadRequestException("dateTo must be a valid ISO date");
    }

    const result = await this.logService.findByUserPaginated(
      getApiRequestUserId(request),
      {
        type,
        dateFrom: parsedDateFrom,
        dateTo: parsedDateTo,
      },
      page,
      limit,
    );

    return {
      data: result.data.map((entry) => toApiLogResponse(entry)),
      total: result.total,
      page,
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
