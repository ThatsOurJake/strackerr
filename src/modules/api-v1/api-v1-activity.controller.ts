import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
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
import {
  ActivityService,
  type CreateActivityData,
} from "../activity/activity.service";
import { MediaService } from "../media/media.service";
import {
  getApiRequestUserId,
  toApiActivityResponse,
  toCreatedApiActivityResponse,
} from "./api-v1-activity.controller.helpers";
import {
  CreateBoardGameActivityDto,
  CreateGameActivityDto,
  CreateMovieActivityDto,
  CreateMusicActivityDto,
  CreateTvEpisodeActivityDto,
} from "./dto/activity.dto";
import {
  ApiErrorResponseDto,
  type CreatedActivityResponseDto,
  CreatedBoardGameActivityResponseDto,
  CreatedGameActivityResponseDto,
  CreatedMovieActivityResponseDto,
  CreatedMusicActivityResponseDto,
  CreatedTvEpisodeActivityResponseDto,
  PaginatedActivityResponseDto,
} from "./dto/response.dto";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

@ApiTags("activity")
@ApiSecurity("ApiKey")
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller("api/v1/activity")
export class ApiV1ActivityController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly activityService: ActivityService,
  ) { }

  @Post("movie")
  @ApiOperation({ summary: "Create movie activity for a media item" })
  @ApiResponse({
    status: 201,
    type: CreatedMovieActivityResponseDto,
    description: "Movie activity logged",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Invalid request fields",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "Media item not found",
  })
  @ApiResponse({
    status: 409,
    type: ApiErrorResponseDto,
    description: "Duplicate entry",
  })
  async createMovie(
    @Body() dto: CreateMovieActivityDto,
    @Req() request: Request,
  ): Promise<CreatedMovieActivityResponseDto> {
    const userId = getApiRequestUserId(request);
    await this.assertRouteMediaType(dto.mediaItemId, userId, [MediaType.MOVIE]);
    const created = await this.createActivityEntry(
      dto.mediaItemId,
      dto,
      userId,
    );
    if (created.type !== MediaType.MOVIE) {
      throw new BadRequestException(
        "Activity route does not support media type",
      );
    }

    return {
      data: created,
    };
  }

  @Post("tv-episode")
  @ApiOperation({
    summary: "Create TV episode activity for a show or episode item",
  })
  @ApiResponse({
    status: 201,
    type: CreatedTvEpisodeActivityResponseDto,
    description: "TV episode activity logged",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Invalid request fields",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "Media item not found",
  })
  @ApiResponse({
    status: 409,
    type: ApiErrorResponseDto,
    description: "Duplicate entry",
  })
  async createTvEpisode(
    @Body() dto: CreateTvEpisodeActivityDto,
    @Req() request: Request,
  ): Promise<CreatedTvEpisodeActivityResponseDto> {
    const userId = getApiRequestUserId(request);
    const target = await this.assertRouteMediaType(dto.mediaItemId, userId, [
      MediaType.TV_SHOW,
      MediaType.TV_EPISODE,
    ]);

    if (target.type === MediaType.TV_EPISODE) {
      if (
        target.seasonNumber !== dto.season ||
        target.episodeNumber !== dto.episode
      ) {
        throw new BadRequestException(
          "season and episode must match the target TV episode item",
        );
      }

      const created = await this.createActivityEntry(target.id, dto, userId);
      if (created.type !== MediaType.TV_EPISODE) {
        throw new BadRequestException(
          "Activity route does not support media type",
        );
      }

      return {
        data: created,
      };
    }

    const episode = await this.mediaService.findOrCreateEpisodeSkeleton(
      target.id,
      target.title,
      dto.season,
      dto.episode,
      userId,
    );

    const created = await this.createActivityEntry(episode.id, dto, userId);
    if (created.type !== MediaType.TV_EPISODE) {
      throw new BadRequestException(
        "Activity route does not support media type",
      );
    }

    return {
      data: created,
    };
  }

  @Post("game")
  @ApiOperation({ summary: "Create game activity for a media item" })
  @ApiResponse({
    status: 201,
    type: CreatedGameActivityResponseDto,
    description: "Game activity logged",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Invalid request fields",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "Media item not found",
  })
  @ApiResponse({
    status: 409,
    type: ApiErrorResponseDto,
    description: "Duplicate entry",
  })
  async createGame(
    @Body() dto: CreateGameActivityDto,
    @Req() request: Request,
  ): Promise<CreatedGameActivityResponseDto> {
    const userId = getApiRequestUserId(request);
    await this.assertRouteMediaType(dto.mediaItemId, userId, [MediaType.GAME]);
    const created = await this.createActivityEntry(
      dto.mediaItemId,
      dto,
      userId,
      {
        platform: dto.platform,
      },
    );
    if (created.type !== MediaType.GAME) {
      throw new BadRequestException(
        "Activity route does not support media type",
      );
    }

    return {
      data: created,
    };
  }

  @Post("board-game")
  @ApiOperation({ summary: "Create board game activity for a media item" })
  @ApiResponse({
    status: 201,
    type: CreatedBoardGameActivityResponseDto,
    description: "Board game activity logged",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Invalid request fields",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "Media item not found",
  })
  @ApiResponse({
    status: 409,
    type: ApiErrorResponseDto,
    description: "Duplicate entry",
  })
  async createBoardGame(
    @Body() dto: CreateBoardGameActivityDto,
    @Req() request: Request,
  ): Promise<CreatedBoardGameActivityResponseDto> {
    const userId = getApiRequestUserId(request);
    await this.assertRouteMediaType(dto.mediaItemId, userId, [
      MediaType.BOARD_GAME,
    ]);
    const created = await this.createActivityEntry(
      dto.mediaItemId,
      dto,
      userId,
      {
        playerCount: dto.players,
        won: dto.won,
      },
    );
    if (created.type !== MediaType.BOARD_GAME) {
      throw new BadRequestException(
        "Activity route does not support media type",
      );
    }

    return {
      data: created,
    };
  }

  @Post("music")
  @ApiOperation({ summary: "Create music activity for a media item" })
  @ApiResponse({
    status: 201,
    type: CreatedMusicActivityResponseDto,
    description: "Music activity logged",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Invalid request fields",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "Media item not found",
  })
  @ApiResponse({
    status: 409,
    type: ApiErrorResponseDto,
    description: "Duplicate entry",
  })
  async createMusic(
    @Body() dto: CreateMusicActivityDto,
    @Req() request: Request,
  ): Promise<CreatedMusicActivityResponseDto> {
    const userId = getApiRequestUserId(request);
    await this.assertRouteMediaType(dto.mediaItemId, userId, [
      MediaType.MUSIC_TRACK,
    ]);
    const created = await this.createActivityEntry(
      dto.mediaItemId,
      dto,
      userId,
    );
    if (created.type !== MediaType.MUSIC_TRACK) {
      throw new BadRequestException(
        "Activity route does not support media type",
      );
    }

    return {
      data: created,
    };
  }

  @Get(":mediaItemId")
  @ApiOperation({ summary: "List activity entries for one media item" })
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
    type: PaginatedActivityResponseDto,
    description:
      "Paginated user-scoped activity entries for the requested media item",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "Media item not found",
  })
  async findAll(
    @Param("mediaItemId") mediaItemId: string,
    @Query("dateFrom") dateFrom: string | undefined,
    @Query("dateTo") dateTo: string | undefined,
    @Query("page") rawPage: string | undefined,
    @Query("limit") rawLimit: string | undefined,
    @Req() request: Request,
  ): Promise<PaginatedActivityResponseDto> {
    const userId = getApiRequestUserId(request);
    const mediaItem = await this.assertMediaAccess(mediaItemId, userId);

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

    const result = await this.activityService.findByUserAndMediaItemPaginated(
      userId,
      mediaItem.id,
      mediaItem.type === MediaType.TV_SHOW,
      {
        dateFrom: parsedDateFrom,
        dateTo: parsedDateTo,
      },
      page,
      limit,
    );

    return {
      data: result.data.map((entry) => toApiActivityResponse(entry)),
      meta: {
        total: result.total,
        page,
        limit,
      },
    };
  }

  private async assertMediaAccess(mediaItemId: string, userId: string) {
    const mediaItem = await this.mediaService.findById(mediaItemId);
    if (!mediaItem) {
      throw new NotFoundException("Media item not found");
    }

    const hasAccess = await this.mediaService.hasUserAccess(
      mediaItemId,
      userId,
    );
    if (!hasAccess) {
      throw new NotFoundException("Media item not found");
    }

    return mediaItem;
  }

  private async assertRouteMediaType(
    mediaItemId: string,
    userId: string,
    expectedTypes: MediaType[],
  ) {
    const mediaItem = await this.assertMediaAccess(mediaItemId, userId);

    if (!expectedTypes.includes(mediaItem.type)) {
      throw new BadRequestException(
        `Activity route does not support media type ${mediaItem.type}`,
      );
    }

    return mediaItem;
  }

  private async createActivityEntry(
    mediaItemId: string,
    dto: Pick<CreateMovieActivityDto, "loggedAt" | "duration" | "description">,
    userId: string,
    extras?: Pick<CreateActivityData, "platform" | "playerCount" | "won">,
  ): Promise<CreatedActivityResponseDto> {
    const entry = await this.activityService.create(
      {
        mediaItemId,
        loggedAt: dto.loggedAt ? new Date(dto.loggedAt) : new Date(),
        duration: dto.duration,
        description: dto.description,
        platform: extras?.platform,
        playerCount: extras?.playerCount,
        won: extras?.won,
      },
      userId,
      LogSource.API,
    );

    return toCreatedApiActivityResponse(entry);
  }
}
