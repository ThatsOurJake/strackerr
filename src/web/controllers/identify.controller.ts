import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { MediaItem } from "@prisma/client";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { IdentificationService } from "../../modules/media/identification.service";
import { MediaService } from "../../modules/media/media.service";
import { MetadataService } from "../../modules/metadata/metadata.service";
import type { MetadataProviderName } from "../../modules/metadata/metadata-provider.interface";
import { typeFromSlug } from "../collection-view-model";

interface IdentifyBody {
  provider?: string;
  externalId?: string;
}

@Controller("collection/:type/:id/identify")
@UseGuards(JwtAuthGuard)
export class IdentifyController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly metadataService: MetadataService,
    private readonly identificationService: IdentificationService,
  ) { }

  @Get()
  async panel(
    @Param("type") typeSlug: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const item = await this.getOwnedSkeleton(typeSlug, id, user.userId);
    const resolved = await this.metadataService.getProviderForUser(item.type, user.userId);
    return response.render("partials/identify-panel", {
      layout: false,
      item,
      typeSlug,
      providerLabel: resolved.provider.name,
      missingKey:
        ["tmdb", "igdb", "bgg"].includes(resolved.provider.name) &&
        !resolved.apiKey,
    });
  }

  @Get("search")
  async search(
    @Param("type") typeSlug: string,
    @Param("id") id: string,
    @Query("q") rawQuery: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const item = await this.getOwnedSkeleton(typeSlug, id, user.userId);
    const query = rawQuery?.trim() ?? "";
    if (query.length < 3) {
      return response.render("partials/identify-search-results", { layout: false });
    }

    try {
      const resolved = await this.metadataService.getProviderForUser(item.type, user.userId);
      if (
        ["tmdb", "igdb", "bgg"].includes(resolved.provider.name) &&
        !resolved.apiKey
      ) {
        return response.render("partials/identify-search-results", {
          layout: false,
          missingKey: true,
        });
      }
      const results = await resolved.provider.search(query, resolved.apiKey);
      return response.render("partials/identify-search-results", {
        layout: false,
        results,
        hasResults: results.length > 0,
        searched: true,
        provider: resolved.provider.name,
        submitUrl: `/collection/${typeSlug}/${id}/identify`,
      });
    } catch (error) {
      return response.render("partials/identify-search-results", {
        layout: false,
        error: error instanceof Error ? error.message : "Provider search failed",
      });
    }
  }

  @Post()
  async identify(
    @Param("type") typeSlug: string,
    @Param("id") id: string,
    @Body() body: IdentifyBody,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    await this.getOwnedSkeleton(typeSlug, id, user.userId);
    if (!body.provider || !body.externalId) {
      return response.status(400).send("Select a valid provider result");
    }
    await this.identificationService.identify(
      id,
      body.provider as MetadataProviderName,
      body.externalId,
      user.userId,
    );
    return response.redirect(`/collection/${typeSlug}/${id}`);
  }

  private async getOwnedSkeleton(
    typeSlug: string,
    id: string,
    userId: string,
  ): Promise<MediaItem> {
    const item = await this.mediaService.findById(id);
    const expectedType = typeFromSlug(typeSlug);
    if (
      !item ||
      !expectedType ||
      item.type !== expectedType ||
      !item.isSkeleton ||
      item.createdByUserId !== userId
    ) {
      throw new ForbiddenException("You cannot identify this media item");
    }
    return item;
  }
}
