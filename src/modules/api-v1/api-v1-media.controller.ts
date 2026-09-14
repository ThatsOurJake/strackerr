import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
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
import { MediaType } from "@prisma/client";
import type { Request } from "express";
import { MediaService } from "../media/media.service";
import { getApiRequestUserId } from "./api-v1-log.controller.helpers";
import {
  ExternalAliasDto,
  MediaExternalAliasesResponseDto,
  type MediaItemDto,
  ResolvedMediaResponseDto,
} from "./dto/media-alias.dto";
import { MediaSearchResponseDto } from "./dto/response.dto";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

@ApiTags("media")
@ApiSecurity("ApiKey")
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller("api/v1/media")
export class ApiV1MediaController {
  constructor(private readonly mediaService: MediaService) { }

  private mapMediaItem = ({
    id,
    title,
    type,
    year,
    imageUrl,
  }: {
    id: string;
    title: string;
    type: MediaItemDto["type"];
    year: number | null;
    imageUrl: string | null;
  }): MediaItemDto => ({
    id,
    title,
    type,
    year: year ?? undefined,
    imageUrl: imageUrl ?? undefined,
  });

  private async assertMediaAccess(mediaItemId: string, userId: string): Promise<void> {
    const mediaItem = await this.mediaService.findById(mediaItemId);
    if (!mediaItem) {
      throw new NotFoundException("Media item not found");
    }

    const hasAccess = await this.mediaService.hasUserAccess(mediaItemId, userId);
    if (!hasAccess) {
      throw new ForbiddenException("You cannot modify aliases for this media item");
    }
  }

  @Get("search")
  @ApiOperation({ summary: "Search the authenticated user's media" })
  @ApiQuery({ name: "q", type: String, required: true, example: "Sever" })
  @ApiQuery({ name: "type", enum: MediaType, required: false })
  @ApiResponse({ status: 200, type: MediaSearchResponseDto, description: "Matching media items" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  async search(
    @Query("q") rawQuery: string,
    @Query("type") type: MediaType | undefined,
    @Req() request: Request,
  ): Promise<MediaSearchResponseDto> {
    if (!request.user) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    const q = rawQuery?.trim();
    if (!q || q.length < 2) {
      throw new BadRequestException("q must be at least 2 characters");
    }

    if (type && !Object.values(MediaType).includes(type)) {
      throw new BadRequestException("type is invalid");
    }

    const results = await this.mediaService.searchForUser(request.user.userId, q, type);
    return {
      data: results.map((item) => this.mapMediaItem(item)),
    };
  }

  @Get("resolve")
  @ApiOperation({
  })
  @ApiQuery({ name: "provider", type: String, required: true, example: "steam" })
  @ApiQuery({ name: "id", type: String, required: true, example: "app:620", maxLength: 128 })
  @ApiResponse({ status: 200, type: ResolvedMediaResponseDto, description: "Resolved canonical media item" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  @ApiResponse({ status: 404, description: "No media item found for provider and external ID" })
  async resolve(
    @Query("provider") provider: string,
    @Query("id") id: string,
    @Req() request: Request,
  ): Promise<ResolvedMediaResponseDto> {
    if (!request.user) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    const mediaItem = await this.mediaService.resolveByExternalLookup(
      provider,
      id,
    );

    if (!mediaItem) {
      throw new NotFoundException("Media item not found for the provided alias");
    }

    const hasAccess = await this.mediaService.hasUserAccess(
      mediaItem.id,
      request.user.userId,
    );

    if (!hasAccess) {
      throw new NotFoundException("Media item not found for the provided alias");
    }

    return {
      data: this.mapMediaItem(mediaItem),
    };
  }

  @Get(":mediaItemId/external-aliases")
  @ApiOperation({
    summary: "List external aliases for a media item",
    description:
      "External aliases are additional provider namespaces used for lookup and do not replace canonical metadata identity.",
  })
  @ApiResponse({ status: 200, type: MediaExternalAliasesResponseDto, description: "External aliases" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  @ApiResponse({ status: 403, description: "No access to this media item" })
  @ApiResponse({ status: 404, description: "Media item not found" })
  async listExternalAliases(
    @Param("mediaItemId") mediaItemId: string,
    @Req() request: Request,
  ): Promise<MediaExternalAliasesResponseDto> {
    const userId = getApiRequestUserId(request);
    await this.assertMediaAccess(mediaItemId, userId);

    const aliases = await this.mediaService.listExternalAliases(mediaItemId);

    return {
      data: aliases.map((alias) => ({
        provider: alias.providerNamespace,
        id: alias.externalId,
      })),
    };
  }

  @Post(":mediaItemId/external-aliases")
  @ApiOperation({
    summary: "Attach an external alias to a media item",
    description:
      "Adds a lookup alias without changing canonical metadata provider identity. Conflicts return 409.",
  })
  @ApiResponse({ status: 201, type: MediaExternalAliasesResponseDto, description: "Alias attached" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  @ApiResponse({ status: 403, description: "No access to this media item" })
  @ApiResponse({ status: 404, description: "Media item not found" })
  @ApiResponse({ status: 409, description: "Alias is already assigned to another media item" })
  async createExternalAlias(
    @Param("mediaItemId") mediaItemId: string,
    @Body() dto: ExternalAliasDto,
    @Req() request: Request,
  ): Promise<MediaExternalAliasesResponseDto> {
    const userId = getApiRequestUserId(request);
    await this.assertMediaAccess(mediaItemId, userId);

    const alias = await this.mediaService.addExternalAlias(
      mediaItemId,
      dto.provider,
      dto.id,
    );

    return {
      data: [{
        provider: alias.providerNamespace,
        id: alias.externalId,
      }],
    };
  }

  @Delete(":mediaItemId/external-aliases")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove an external alias from a media item" })
  @ApiQuery({ name: "provider", type: String, required: true, example: "steam" })
  @ApiQuery({ name: "id", type: String, required: true, example: "app:620", maxLength: 128 })
  @ApiResponse({ status: 204, description: "Alias removed" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  @ApiResponse({ status: 403, description: "No access to this media item" })
  @ApiResponse({ status: 404, description: "Media item or alias not found" })
  async removeExternalAlias(
    @Param("mediaItemId") mediaItemId: string,
    @Query("provider") provider: string,
    @Query("id") id: string,
    @Req() request: Request,
  ): Promise<void> {
    const userId = getApiRequestUserId(request);
    await this.assertMediaAccess(mediaItemId, userId);

    const removed = await this.mediaService.removeExternalAlias(
      mediaItemId,
      provider,
      id,
    );

    if (!removed) {
      throw new NotFoundException("Alias not found for this media item");
    }
  }
}
