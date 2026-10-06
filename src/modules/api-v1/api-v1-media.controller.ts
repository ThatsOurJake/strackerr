import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { MediaType } from "@prisma/client";
import type { Request } from "express";
import { IdentificationService } from "../media/identification.service";
import { MediaService } from "../media/media.service";
import { getApiRequestUserId } from "./api-v1-activity.controller.helpers";
import {
  CreatedMediaResponseDto,
  CreateMediaItemDto,
  ExternalAliasDto,
  IdentifiedMediaResponseDto,
  IdentifyMediaRequestDto,
  MediaExternalAliasesResponseDto,
  type MediaItemDto,
  ResolvedMediaResponseDto,
  ResolveMediaQueryDto,
} from "./dto/media-alias.dto";
import {
  ApiErrorResponseDto,
  MediaSearchResponseDto,
} from "./dto/response.dto";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

@ApiTags("media")
@ApiSecurity("ApiKey")
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
@Controller("api/v1/media")
export class ApiV1MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly identificationService: IdentificationService,
  ) { }

  private mapMediaItem = async (
    userId: string,
    {
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
    }): Promise<MediaItemDto> => {
    const tags = await this.mediaService.listTagsForItem(id, userId);
    return {
      id,
      title,
      type,
      year: year ?? undefined,
      imageUrl: imageUrl ?? undefined,
      tags: tags.map((tag) => tag.label),
    };
  };

  private async assertMediaAccess(
    mediaItemId: string,
    userId: string,
  ): Promise<void> {
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
  }

  private assertExactlyOneResolveMode(query: ResolveMediaQueryDto): void {
    const hasItemId = Boolean(query.mediaItemId);
    const hasTitle = Boolean(query.title);
    const hasProvider = Boolean(query.provider);
    const hasAliasId = Boolean(query.id);

    if (hasProvider !== hasAliasId) {
      throw new BadRequestException(
        "Resolve alias mode requires both provider and id",
      );
    }

    const selectedModes = [
      hasItemId,
      hasTitle,
      hasProvider && hasAliasId,
    ].filter(Boolean).length;

    if (selectedModes !== 1) {
      throw new BadRequestException(
        "Resolve requires exactly one lookup mode: mediaItemId, title, or provider plus id",
      );
    }
  }

  @Get("search")
  @ApiOperation({ summary: "Search the authenticated user's media" })
  @ApiQuery({ name: "q", type: String, required: true, example: "Sever" })
  @ApiQuery({ name: "type", enum: MediaType, required: false })
  @ApiResponse({
    status: 200,
    type: MediaSearchResponseDto,
    description: "Matching media items",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  async search(
    @Query("q") rawQuery: string,
    @Query("type") type: MediaType | undefined,
    @Req() request: Request,
  ): Promise<MediaSearchResponseDto> {
    const userId = getApiRequestUserId(request);

    const q = rawQuery?.trim();
    if (!q || q.length < 2) {
      throw new BadRequestException("q must be at least 2 characters");
    }

    if (type && !Object.values(MediaType).includes(type)) {
      throw new BadRequestException("type is invalid");
    }

    const results = await this.mediaService.searchForUser(userId, q, type);
    return {
      data: await Promise.all(results.map((item) => this.mapMediaItem(userId, item))),
    };
  }

  @Get("resolve")
  @ApiOperation({
    summary:
      "Resolve one of the authenticated user's media items by exactly one lookup mode",
  })
  @ApiQuery({
    name: "mediaItemId",
    type: String,
    required: false,
    example: "cm123",
  })
  @ApiQuery({
    name: "title",
    type: String,
    required: false,
    example: "Severance",
  })
  @ApiQuery({
    name: "provider",
    type: String,
    required: false,
    example: "steam",
  })
  @ApiQuery({
    name: "id",
    type: String,
    required: false,
    example: "app:620",
    maxLength: 128,
  })
  @ApiResponse({
    status: 200,
    type: ResolvedMediaResponseDto,
    description: "Resolved canonical media item",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Mixed, missing, or invalid resolve lookup mode",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "No accessible media item found for the lookup",
  })
  async resolve(
    @Query() query: ResolveMediaQueryDto,
    @Req() request: Request,
  ): Promise<ResolvedMediaResponseDto> {
    const userId = getApiRequestUserId(request);
    this.assertExactlyOneResolveMode(query);

    let mediaItem: Awaited<ReturnType<MediaService["findById"]>> | null = null;
    if (query.mediaItemId) {
      mediaItem = await this.mediaService.findById(query.mediaItemId);
    } else if (query.title) {
      mediaItem = await this.mediaService.resolveByTitleForUser(
        userId,
        query.title,
      );
    } else if (query.provider && query.id) {
      mediaItem = await this.mediaService.resolveByExternalLookup(
        userId,
        query.provider,
        query.id,
      );
    }

    if (!mediaItem) {
      throw new NotFoundException(
        "Media item not found for the provided lookup",
      );
    }

    const hasAccess = await this.mediaService.hasUserAccess(
      mediaItem.id,
      userId,
    );

    if (!hasAccess) {
      throw new NotFoundException(
        "Media item not found for the provided lookup",
      );
    }

    return {
      data: await this.mapMediaItem(userId, mediaItem),
    };
  }

  @Get(":mediaItemId")
  @ApiOperation({ summary: "Get one accessible media item by id" })
  @ApiResponse({
    status: 200,
    type: ResolvedMediaResponseDto,
    description: "Accessible media item",
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
  async getById(
    @Param("mediaItemId") mediaItemId: string,
    @Req() request: Request,
  ): Promise<ResolvedMediaResponseDto> {
    const userId = getApiRequestUserId(request);
    await this.assertMediaAccess(mediaItemId, userId);

    const mediaItem = await this.mediaService.findById(mediaItemId);
    if (!mediaItem) {
      throw new NotFoundException("Media item not found");
    }

    return {
      data: await this.mapMediaItem(userId, mediaItem),
    };
  }

  @Post()
  @ApiOperation({
    summary:
      "Create a minimal media item owned by the authenticated user for importer workflows",
  })
  @ApiResponse({
    status: 201,
    type: CreatedMediaResponseDto,
    description: "Media item created",
  })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: "Invalid creation payload",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 409,
    type: ApiErrorResponseDto,
    description: "One or more external aliases are already assigned",
  })
  async create(
    @Body() dto: CreateMediaItemDto,
    @Req() request: Request,
  ): Promise<CreatedMediaResponseDto> {
    const userId = getApiRequestUserId(request);
    if (dto.type === MediaType.TV_EPISODE) {
      throw new BadRequestException(
        "TV episode items must be created through a TV show workflow",
      );
    }

    let mediaItem: Awaited<ReturnType<MediaService["createSkeletonWithExternalAliases"]>>;
    try {
      mediaItem = await this.mediaService.createSkeletonWithExternalAliases({
        title: dto.title,
        description: dto.description,
        type: dto.type,
        userId,
        externalAliases: dto.externalAliases?.map((alias) => ({
          providerNamespace: alias.provider,
          externalId: alias.id,
        })),
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(
          "External alias conflict: one or more aliases are already assigned to existing media items. No media item was created.",
        );
      }
      throw error;
    }

    return {
      data: await this.mapMediaItem(userId, mediaItem),
    };
  }

  @Post(":mediaItemId/identity")
  @ApiOperation({
    summary:
      "Trigger manual identification for one media item using configured provider",
    description:
      "Uses the authenticated user's configured metadata provider and the media item's stored external aliases. Optional field selection applies only the requested provider fields.",
  })
  @ApiResponse({
    status: 201,
    type: IdentifiedMediaResponseDto,
    description: "Media item identified",
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
    description:
      "Media item is already identified or alias mapping is ambiguous",
  })
  @ApiResponse({
    status: 422,
    type: ApiErrorResponseDto,
    description:
      "Identification could not run due to missing alias or provider lookup failure",
  })
  async identify(
    @Param("mediaItemId") mediaItemId: string,
    @Body() body: IdentifyMediaRequestDto,
    @Req() request: Request,
  ): Promise<IdentifiedMediaResponseDto> {
    const userId = getApiRequestUserId(request);
    const identified =
      await this.identificationService.identifyFromConfiguredAlias(
        mediaItemId,
        userId,
        body.fields,
      );

    return {
      data: await this.mapMediaItem(userId, identified),
    };
  }

  @Post(":mediaItemId/refetch")
  @ApiOperation({
    summary:
      "Refetch provider metadata for one identified media item owned by the authenticated user",
    description:
      "Re-fetches metadata using the media item's stored canonical provider identity. Optional field selection applies only requested provider fields.",
  })
  @ApiResponse({
    status: 201,
    type: IdentifiedMediaResponseDto,
    description: "Media item refreshed",
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
    description:
      "Media item is not identified or lacks canonical provider identity",
  })
  async refetch(
    @Param("mediaItemId") mediaItemId: string,
    @Body() body: IdentifyMediaRequestDto,
    @Req() request: Request,
  ): Promise<IdentifiedMediaResponseDto> {
    const userId = getApiRequestUserId(request);
    const identified = await this.identificationService.refetch(
      mediaItemId,
      userId,
      body.fields,
    );

    return {
      data: await this.mapMediaItem(userId, identified),
    };
  }

  @Get(":mediaItemId/external-aliases")
  @ApiOperation({
    summary: "List external aliases for a media item",
    description:
      "External aliases are additional provider namespaces used for lookup and do not replace canonical metadata identity.",
  })
  @ApiResponse({
    status: 200,
    type: MediaExternalAliasesResponseDto,
    description: "External aliases",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 403,
    type: ApiErrorResponseDto,
    description: "No access to this media item",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "Media item not found",
  })
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
  @ApiResponse({
    status: 201,
    type: MediaExternalAliasesResponseDto,
    description: "Alias attached",
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 403,
    type: ApiErrorResponseDto,
    description: "No access to this media item",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "Media item not found",
  })
  @ApiResponse({
    status: 409,
    type: ApiErrorResponseDto,
    description: "Alias is already assigned to another media item",
  })
  async createExternalAlias(
    @Param("mediaItemId") mediaItemId: string,
    @Body() dto: ExternalAliasDto,
    @Req() request: Request,
  ): Promise<MediaExternalAliasesResponseDto> {
    const userId = getApiRequestUserId(request);
    await this.assertMediaAccess(mediaItemId, userId);

    const alias = await this.mediaService.addExternalAlias(
      mediaItemId,
      userId,
      dto.provider,
      dto.id,
    );

    return {
      data: [
        {
          provider: alias.providerNamespace,
          id: alias.externalId,
        },
      ],
    };
  }

  @Delete(":mediaItemId/external-aliases")
  @HttpCode(204)
  @ApiOperation({ summary: "Remove an external alias from a media item" })
  @ApiQuery({
    name: "provider",
    type: String,
    required: true,
    example: "steam",
  })
  @ApiQuery({
    name: "id",
    type: String,
    required: true,
    example: "app:620",
    maxLength: 128,
  })
  @ApiResponse({ status: 204, description: "Alias removed" })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: "Invalid or missing API key",
  })
  @ApiResponse({
    status: 403,
    type: ApiErrorResponseDto,
    description: "No access to this media item",
  })
  @ApiResponse({
    status: 404,
    type: ApiErrorResponseDto,
    description: "Media item or alias not found",
  })
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
