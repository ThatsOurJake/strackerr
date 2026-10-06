import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import {
  IDENTIFICATION_FIELDS,
  IdentificationService,
} from "../../modules/media/identification.service";
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
  fields?: string | string[];
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
      actionLabel: item.isSkeleton ? "Identify" : "Refetch metadata",
      currentIdentity,
      missingKey:
        ["tmdb", "igdb", "bgg"].includes(resolved.provider.name) &&
        !resolved.apiKey,
    });
  }

  @Get("refetch")
  async refetchPanel(
    @Param("type") typeSlug: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const item = await this.getAccessibleMediaItem(typeSlug, id, user.userId);
    if (item.isSkeleton) {
      return response
        .status(409)
        .send("Media item must be identified before refetching");
    }

    const canonicalIdentity = item.externalIds[0];
    if (!canonicalIdentity) {
      return response
        .status(409)
        .send("Media item has no provider identity to refetch");
    }

    try {
      const providerName = canonicalIdentity.provider as MetadataProviderName;
      const resolved = await this.metadataService.getProviderForUser(
        item.type,
        user.userId,
        {
          providerOverride: providerName,
          anime: providerName === "anilist",
        },
      );
      const proposed = await resolved.provider.getById(
        canonicalIdentity.externalId,
        resolved.apiKey,
      );
      const currentTags = await this.mediaService.listTagsForItem(item.id, user.userId);

      return response.render("partials/identify-confirm", {
        layout: false,
        mode: "refetch",
        item,
        provider: providerName,
        externalId: canonicalIdentity.externalId,
        proposed,
        selectedFields: [...IDENTIFICATION_FIELDS],
        fieldRows: this.buildFieldRows(item, proposed),
        tagPreview: this.buildTagPreview(
          currentTags.map((tag) => tag.label),
          proposed.tags ?? [],
        ),
        submitUrl: `/collection/${typeSlug}/${id}/identify/refetch`,
      });
    } catch (error) {
      return response
        .status(422)
        .send(
          error instanceof Error
            ? error.message
            : "Unable to refetch provider metadata",
        );
    }
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
    try {
      await this.identificationService.identify(
        id,
        body.provider as MetadataProviderName,
        body.externalId,
        user.userId,
        this.parseSelectedFields(body.fields),
      );
    } catch (error) {
      return this.redirectWithIdentifyError(error, typeSlug, id, response);
    }
    return response.redirect(`/collection/${typeSlug}/${id}`);
  }

  @Post("refetch")
  async refetch(
    @Param("type") typeSlug: string,
    @Param("id") id: string,
    @Body() body: IdentifyBody,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    await this.getAccessibleMediaItem(typeSlug, id, user.userId);
    try {
      await this.identificationService.refetch(
        id,
        user.userId,
        this.parseSelectedFields(body.fields),
      );
    } catch (error) {
      return this.redirectWithIdentifyError(error, typeSlug, id, response);
    }

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
      const currentTags = await this.mediaService.listTagsForItem(item.id, user.userId);
      return response.render("partials/identify-confirm", {
        layout: false,
        mode: "identify",
        item,
        provider: providerName,
        externalId: body.externalId,
        proposed,
        selectedFields: [...IDENTIFICATION_FIELDS],
        fieldRows: this.buildFieldRows(item, proposed),
        tagPreview: this.buildTagPreview(
          currentTags.map((tag) => tag.label),
          proposed.tags ?? [],
        ),
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

    const hasAccess = await this.mediaService.hasUserAccess(item.id, userId);
    if (!hasAccess) {
      throw new ForbiddenException("You cannot identify this media item");
    }

    return item;
  }

  private parseSelectedFields(fields: string | string[] | undefined): string[] {
    if (!fields) {
      return [];
    }

    const entries = Array.isArray(fields) ? fields : [fields];
    return entries
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);
  }

  private buildFieldRows(
    item: Awaited<ReturnType<MediaService["findByIdWithExternalIds"]>>,
    proposed: {
      title: string;
      description?: string | null;
      year?: number | null;
      duration?: number | null;
      imageUrl?: string | null;
    },
  ) {
    const currentArtwork = item?.imageSourceUrl ?? item?.imageUrl ?? null;
    const proposedArtwork = proposed.imageUrl ?? null;

    return [
      {
        key: "title",
        label: "Title",
        currentValue: item?.title ?? "",
        proposedValue: proposed.title,
      },
      {
        key: "description",
        label: "Description",
        currentValue: item?.description ?? "None",
        proposedValue: proposed.description ?? "None",
      },
      {
        key: "year",
        label: "Year",
        currentValue: item?.year ? String(item.year) : "None",
        proposedValue: proposed.year ? String(proposed.year) : "None",
      },
      {
        key: "duration",
        label: "Duration",
        currentValue: item?.duration ? `${item.duration} min` : "None",
        proposedValue: proposed.duration ? `${proposed.duration} min` : "None",
      },
      {
        key: "artwork",
        label: "Refetch images",
        currentValue: currentArtwork ? "Current images kept" : "No current images",
        proposedValue: proposedArtwork ? "Pull provider images" : "Provider returned no images",
      },
    ];
  }

  private buildTagPreview(currentTags: string[], proposedTags: string[]) {
    const uniqueByKey = (tags: string[]) => {
      const map = new Map<string, string>();
      for (const tag of tags) {
        const trimmed = tag.trim();
        if (!trimmed) {
          continue;
        }

        const key = trimmed.toLowerCase();
        if (!map.has(key)) {
          map.set(key, trimmed);
        }
      }

      return map;
    };

    const current = uniqueByKey(currentTags);
    const provider = uniqueByKey(proposedTags);
    const additions = [...provider.entries()]
      .filter(([key]) => !current.has(key))
      .map(([, label]) => label);

    return {
      current: [...current.values()],
      provider: [...provider.values()],
      additions,
      currentText: [...current.values()].join(", "),
      providerText: [...provider.values()].join(", "),
      additionsText: additions.join(", "),
    };
  }

  private redirectWithIdentifyError(
    error: unknown,
    typeSlug: string,
    id: string,
    response: Response,
  ) {
    const message =
      error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof UnprocessableEntityException
        ? this.exceptionMessage(error)
        : "Identification failed";

    return response.redirect(
      `/collection/${typeSlug}/${id}?error=${encodeURIComponent(message)}`,
    );
  }

  private exceptionMessage(
    error:
      | BadRequestException
      | ConflictException
      | UnprocessableEntityException,
  ): string {
    const errorResponse = error.getResponse();
    if (typeof errorResponse === "string") {
      return errorResponse;
    }
    if (
      typeof errorResponse === "object" &&
      errorResponse !== null &&
      "message" in errorResponse
    ) {
      const message = (errorResponse as { message?: string | string[] })
        .message;
      return Array.isArray(message)
        ? message.join(", ")
        : (message ?? "Identification failed");
    }
    return "Identification failed";
  }
}
