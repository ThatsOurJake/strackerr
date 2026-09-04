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
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { CollectionService } from "../../modules/collection/collection.service";
import { IdentificationService } from "../../modules/media/identification.service";
import {
  buildProviderSearchQuery,
  parseIdentificationQuery,
} from "../../modules/media/identification-query.parser";
import { MediaService } from "../../modules/media/media.service";
import {
  assertProviderExternalId,
  normalizeProviderExternalId,
} from "../../modules/media/provider-external-id.validator";
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
    private readonly collectionService: CollectionService,
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
    const item = await this.getAccessibleMediaItem(typeSlug, id, user.userId);
    const resolved = await this.metadataService.getProviderForUser(
      item.type,
      user.userId,
    );
    const currentIdentity = item.externalIds[0]
      ? `${item.externalIds[0].provider}:${item.externalIds[0].externalId}`
      : "None";
    return response.render("partials/identify-panel", {
      layout: false,
      item,
      typeSlug,
      providerLabel: resolved.provider.name,
      actionLabel: item.isSkeleton ? "Identify" : "Reidentify",
      currentIdentity,
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
    const item = await this.getAccessibleMediaItem(typeSlug, id, user.userId);
    const query = rawQuery?.trim() ?? "";
    const parsedQueryResult = parseIdentificationQuery(query);
    if (!parsedQueryResult.ok || !parsedQueryResult.value) {
      return response.render("partials/identify-search-results", {
        layout: false,
        error: parsedQueryResult.error?.message ?? "Invalid query syntax.",
      });
    }

    const parsedQuery = parsedQueryResult.value;
    const hasStructuredFields = Object.values(parsedQuery.fields).some(
      (value) => Boolean(value),
    );
    const hasFreeText = parsedQuery.freeTextTerms.join(" ").trim().length >= 3;
    if (!parsedQuery.providerLookup && !hasStructuredFields && !hasFreeText) {
      return response.render("partials/identify-search-results", {
        layout: false,
      });
    }

    try {
      if (parsedQuery.providerLookup) {
        const directLookup = await this.metadataService.getProviderForUser(
          item.type,
          user.userId,
        );
        if (
          ["tmdb", "igdb", "bgg"].includes(directLookup.provider.name) &&
          !directLookup.apiKey
        ) {
          return response.render("partials/identify-search-results", {
            layout: false,
            missingKey: true,
          });
        }

        const normalizedExternalId = normalizeProviderExternalId(
          directLookup.provider.name,
          parsedQuery.providerLookup.identifier,
          item.type,
        );
        assertProviderExternalId(
          directLookup.provider.name,
          normalizedExternalId,
        );
        const result = await directLookup.provider.getById(
          normalizedExternalId,
          directLookup.apiKey,
        );
        return response.render("partials/identify-search-results", {
          layout: false,
          results: [result],
          hasResults: true,
          searched: true,
          provider: directLookup.provider.name,
          submitUrl: `/collection/${typeSlug}/${id}/identify/confirm`,
          resultsTarget: `#identify-results-${id}`,
        });
      }

      const resolved = await this.metadataService.getProviderForUser(
        item.type,
        user.userId,
      );
      if (
        ["tmdb", "igdb", "bgg"].includes(resolved.provider.name) &&
        !resolved.apiKey
      ) {
        return response.render("partials/identify-search-results", {
          layout: false,
          missingKey: true,
        });
      }

      const providerQuery = buildProviderSearchQuery(
        parsedQuery,
        resolved.provider.name,
      );
      const results = await resolved.provider.search(
        providerQuery,
        resolved.apiKey,
      );
      return response.render("partials/identify-search-results", {
        layout: false,
        results,
        hasResults: results.length > 0,
        searched: true,
        provider: resolved.provider.name,
        submitUrl: `/collection/${typeSlug}/${id}/identify/confirm`,
        resultsTarget: `#identify-results-${id}`,
      });
    } catch (error) {
      const message =
        error instanceof Error && /status\s404/i.test(error.message)
          ? "No result found for that identifier. Try artist/title search instead."
          : error instanceof Error
            ? error.message
            : "Provider search failed";
      return response.render("partials/identify-search-results", {
        layout: false,
        error: message,
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
    await this.getAccessibleMediaItem(typeSlug, id, user.userId);
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

  @Post("confirm")
  async confirm(
    @Param("type") typeSlug: string,
    @Param("id") id: string,
    @Body() body: IdentifyBody,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const item = await this.getAccessibleMediaItem(typeSlug, id, user.userId);
    if (!body.provider || !body.externalId) {
      return response.status(400).send("Select a valid provider result");
    }

    try {
      const providerName = body.provider as MetadataProviderName;
      const resolved = await this.metadataService.getProviderForUser(
        item.type,
        user.userId,
        {
          providerOverride: providerName,
          anime: providerName === "anilist",
        },
      );
      const proposed = await resolved.provider.getById(
        body.externalId,
        resolved.apiKey,
      );
      return response.render("partials/identify-confirm", {
        layout: false,
        item,
        provider: providerName,
        externalId: body.externalId,
        proposed,
        submitUrl: `/collection/${typeSlug}/${id}/identify`,
      });
    } catch (error) {
      return response.render("partials/identify-search-results", {
        layout: false,
        error:
          error instanceof Error ? error.message : "Unable to load this result",
      });
    }
  }

  private async getAccessibleMediaItem(
    typeSlug: string,
    id: string,
    userId: string,
  ) {
    const item = await this.mediaService.findByIdWithExternalIds(id);
    const expectedType = typeFromSlug(typeSlug);
    if (!item || !expectedType || item.type !== expectedType) {
      throw new ForbiddenException("You cannot identify this media item");
    }

    if (!item.isSkeleton) {
      await this.collectionService.findDetail(userId, item.id);
      return item;
    }

    if (item.createdByUserId !== userId) {
      throw new ForbiddenException("You cannot identify this media item");
    }

    return item;
  }
}
