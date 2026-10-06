import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import type { Request } from "express";
import { getApiRequestUserId } from "./api-v1-activity.controller.helpers";
import {
  ProviderSearchResponseDto,
  ProviderTvSearchResponseDto,
} from "./dto/provider-search.dto";
import { ApiErrorResponseDto } from "./dto/response.dto";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";
import { ProviderSearchService } from "./provider-search.service";

const PROVIDER_CREDENTIAL_HEADER_PATTERN = /tmdb|igdb|bgg|boardgamegeek/i;

@ApiTags("provider search")
@ApiSecurity("ApiKey")
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
@Controller("api/v1/providers")
export class ApiV1ProviderSearchController {
  constructor(private readonly providerSearchService: ProviderSearchService) {}

  @Get("tmdb/movies/search")
  @ApiOperation({
    summary:
      "Search TMDB movies using the authenticated user's configured credential",
  })
  @ApiQuery({
    name: "query",
    type: String,
    required: true,
    example: "Interstellar",
    minLength: 2,
    maxLength: 200,
  })
  @ApiResponse({
    status: 200,
    type: ProviderSearchResponseDto,
    description: "Normalized TMDB movie candidates",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Missing, invalid, or unexpected search input",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 424,
    type: ApiErrorResponseDto,
    description: "TMDB credential configuration is required",
  })
  @ApiResponse({
    status: 429,
    type: ApiErrorResponseDto,
    description: "API rate limit exceeded",
  })
  @ApiResponse({
    status: 502,
    type: ApiErrorResponseDto,
    description: "TMDB search is temporarily unavailable",
  })
  async searchTmdbMovies(
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<ProviderSearchResponseDto> {
    const searchQuery = this.validateSearchRequest(query, body, request);
    return {
      data: await this.providerSearchService.searchMovies(
        getApiRequestUserId(request),
        searchQuery,
      ),
    };
  }

  @Get("tmdb/tv/search")
  @ApiOperation({
    summary:
      "Search TMDB TV shows with every season and episode for local importer mapping",
  })
  @ApiQuery({
    name: "query",
    type: String,
    required: true,
    example: "Severance",
    minLength: 2,
    maxLength: 200,
  })
  @ApiResponse({
    status: 200,
    type: ProviderTvSearchResponseDto,
    description:
      "TMDB TV candidates, each with a complete nested episode mapping",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Missing, invalid, or unexpected search input",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 424,
    type: ApiErrorResponseDto,
    description: "TMDB credential configuration is required",
  })
  @ApiResponse({
    status: 429,
    type: ApiErrorResponseDto,
    description: "API rate limit exceeded",
  })
  @ApiResponse({
    status: 502,
    type: ApiErrorResponseDto,
    description: "TMDB search or episode expansion is temporarily unavailable",
  })
  async searchTmdbTv(
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<ProviderTvSearchResponseDto> {
    const searchQuery = this.validateSearchRequest(query, body, request);
    return {
      data: await this.providerSearchService.searchTvShows(
        getApiRequestUserId(request),
        searchQuery,
      ),
    };
  }

  @Get("igdb/search")
  @ApiOperation({
    summary:
      "Search IGDB games using the authenticated user's configured credential",
  })
  @ApiQuery({
    name: "query",
    type: String,
    required: true,
    example: "The Last of Us",
    minLength: 2,
    maxLength: 200,
  })
  @ApiResponse({
    status: 200,
    type: ProviderSearchResponseDto,
    description: "Normalized IGDB game candidates",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Missing, invalid, or unexpected search input",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 424,
    type: ApiErrorResponseDto,
    description: "IGDB credential configuration is required",
  })
  @ApiResponse({
    status: 429,
    type: ApiErrorResponseDto,
    description: "API rate limit exceeded",
  })
  @ApiResponse({
    status: 502,
    type: ApiErrorResponseDto,
    description: "IGDB search is temporarily unavailable",
  })
  async searchIgdb(
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<ProviderSearchResponseDto> {
    const searchQuery = this.validateSearchRequest(query, body, request);
    return {
      data: await this.providerSearchService.searchGames(
        getApiRequestUserId(request),
        searchQuery,
      ),
    };
  }

  @Get("bgg/search")
  @ApiOperation({
    summary:
      "Search BoardGameGeek using the authenticated user's configured credential",
  })
  @ApiQuery({
    name: "query",
    type: String,
    required: true,
    example: "Catan",
    minLength: 2,
    maxLength: 200,
  })
  @ApiResponse({
    status: 200,
    type: ProviderSearchResponseDto,
    description: "Normalized BoardGameGeek candidates",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Missing, invalid, or unexpected search input",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 424,
    type: ApiErrorResponseDto,
    description: "BoardGameGeek credential configuration is required",
  })
  @ApiResponse({
    status: 429,
    type: ApiErrorResponseDto,
    description: "API rate limit exceeded",
  })
  @ApiResponse({
    status: 502,
    type: ApiErrorResponseDto,
    description: "BoardGameGeek search is temporarily unavailable",
  })
  async searchBgg(
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<ProviderSearchResponseDto> {
    const searchQuery = this.validateSearchRequest(query, body, request);
    return {
      data: await this.providerSearchService.searchBoardGames(
        getApiRequestUserId(request),
        searchQuery,
      ),
    };
  }

  private validateSearchRequest(
    query: Record<string, unknown>,
    body: unknown,
    request: Request,
  ): string {
    if (
      Object.keys(query).length !== 1 ||
      !("query" in query) ||
      typeof query.query !== "string" ||
      (body !== undefined &&
        body !== null &&
        Object.keys(body as object).length > 0)
    ) {
      throw new BadRequestException("Only a query parameter is allowed");
    }
    const hasProviderCredentialHeader = Object.keys(request.headers).some(
      (header) =>
        header === "authorization" ||
        PROVIDER_CREDENTIAL_HEADER_PATTERN.test(header),
    );
    if (hasProviderCredentialHeader) {
      throw new BadRequestException(
        "Provider credentials must not be supplied",
      );
    }

    const value = query.query.trim();
    if (value.length < 2 || value.length > 200) {
      throw new BadRequestException(
        "query must be between 2 and 200 characters",
      );
    }
    return value;
  }
}
