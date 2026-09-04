import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { LogSource, MediaType } from "@prisma/client";
import type { Response } from "express";
import { LogService } from "../../modules/activity/log.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { MediaService } from "../../modules/media/media.service";
import { MetadataService } from "../../modules/metadata/metadata.service";
import type { MetadataProviderName } from "../../modules/metadata/metadata-provider.interface";
import {
  ADD_TYPES,
  AddFormValidationError,
  buildEntryFormModel,
  type ConfirmAddBody,
  parseType,
  resolveSubmissionMediaItem,
  type SubmitAddBody,
  TYPE_DETAILS,
  validateSubmission,
} from "./add.controller.helpers";

@Controller("add")
@UseGuards(JwtAuthGuard)
export class AddController {
  constructor(
    private readonly metadataService: MetadataService,
    private readonly mediaService: MediaService,
    private readonly logService: LogService,
  ) { }

  @Get()
  add(@Res() response: Response) {
    return response.render("add", {
      title: "Add activity",
      types: ADD_TYPES.map((type) => ({ type, ...TYPE_DETAILS[type] })),
    });
  }

  @Get("form")
  async form(
    @Query("type") rawType: string | undefined,
    @Query("manual") manual: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const type = parseType(rawType);
    if (manual === "true") {
      return response.render("partials/add-entry-form", {
        layout: false,
        ...buildEntryFormModel(type),
      });
    }

    const resolved = await this.metadataService.getProviderForUser(
      type,
      user.userId,
    );
    return response.render("partials/add-search-form", {
      layout: false,
      type,
      typeLabel: TYPE_DETAILS[type].label,
      providerLabel: resolved.provider.name,
      missingKey:
        ["tmdb", "igdb", "bgg"].includes(resolved.provider.name) &&
        !resolved.apiKey,
    });
  }

  @Get("search")
  async search(
    @Query("type") rawType: string | undefined,
    @Query("q") rawQuery: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const type = parseType(rawType);
    const query = rawQuery?.trim() ?? "";
    if (query.length < 3) {
      return response.render("partials/add-search-results", {
        layout: false,
        type,
      });
    }

    try {
      const resolved = await this.metadataService.getProviderForUser(
        type,
        user.userId,
      );
      if (
        ["tmdb", "igdb", "bgg"].includes(resolved.provider.name) &&
        !resolved.apiKey
      ) {
        return response.render("partials/add-search-results", {
          layout: false,
          type,
          missingKey: true,
        });
      }
      const results = await resolved.provider.search(query, resolved.apiKey);
      return response.render("partials/add-search-results", {
        layout: false,
        type,
        provider: resolved.provider.name,
        results,
        hasResults: results.length > 0,
        searched: true,
      });
    } catch (error) {
      return response.render("partials/add-search-results", {
        layout: false,
        type,
        error:
          error instanceof Error ? error.message : "Provider search failed",
      });
    }
  }

  @Post("confirm")
  async confirm(
    @Body() body: ConfirmAddBody,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const type = parseType(body.type);
    const providerName = body.provider as MetadataProviderName;
    if (!body.externalId || !providerName) {
      return response.render("partials/add-entry-form", {
        layout: false,
        ...buildEntryFormModel(type, body, "Select a valid search result"),
      });
    }

    try {
      const resolved = await this.metadataService.getProviderForUser(
        type,
        user.userId,
        {
          providerOverride: providerName,
          anime: providerName === "anilist",
        },
      );
      const metadata = await resolved.provider.getById(
        body.externalId,
        resolved.apiKey,
      );
      const catalogType =
        type === MediaType.TV_EPISODE ? MediaType.TV_SHOW : type;
      const mediaItem = await this.mediaService.findOrCreateIdentified({
        type: catalogType,
        title: metadata.title,
        description: metadata.description,
        imageUrl: metadata.imageUrl,
        year: metadata.year,
        duration: metadata.duration,
        provider: providerName,
        externalId: body.externalId,
      });
      return response.render("partials/add-entry-form", {
        layout: false,
        ...buildEntryFormModel(type, {
          mediaItemId: mediaItem.id,
          title: mediaItem.title,
          defaultDuration: mediaItem.duration?.toString(),
        }),
      });
    } catch (error) {
      return response.render("partials/add-entry-form", {
        layout: false,
        ...buildEntryFormModel(
          type,
          body,
          error instanceof Error ? error.message : "Unable to load this result",
        ),
      });
    }
  }

  @Post()
  async submit(
    @Body() body: SubmitAddBody,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    let type: (typeof ADD_TYPES)[number];
    try {
      type = parseType(body.type);
      const validated = validateSubmission(type, body);
      const mediaItem = await resolveSubmissionMediaItem(
        this.mediaService,
        type,
        body,
        user.userId,
      );
      await this.logService.create(
        {
          mediaItemId: mediaItem.id,
          loggedAt: validated.loggedAt,
          duration: validated.duration ?? mediaItem.duration ?? undefined,
          notes: body.notes?.trim() || undefined,
          platform: body.platform?.trim() || undefined,
          playerCount: validated.playerCount,
          won:
            body.won === "true"
              ? true
              : body.won === "false"
                ? false
                : undefined,
        },
        user.userId,
        LogSource.MANUAL,
      );
      return response.redirect("/history");
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      const fallbackType = ADD_TYPES.includes(
        body.type as (typeof ADD_TYPES)[number],
      )
        ? (body.type as (typeof ADD_TYPES)[number])
        : MediaType.MOVIE;
      return response.status(400).render("add", {
        title: "Add activity",
        types: ADD_TYPES.map((itemType) => ({
          type: itemType,
          ...TYPE_DETAILS[itemType],
        })),
        entryForm: buildEntryFormModel(
          fallbackType,
          body,
          error instanceof Error ? error.message : "Unable to add activity",
          error instanceof AddFormValidationError
            ? { [error.field]: error.message }
            : undefined,
        ),
      });
    }
  }
}
