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
import { LogSource, type MediaItem, MediaType } from "@prisma/client";
import type { Response } from "express";
import { LogService } from "../../modules/activity/log.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { MediaService } from "../../modules/media/media.service";
import { MetadataService } from "../../modules/metadata/metadata.service";
import type { MetadataProviderName } from "../../modules/metadata/metadata-provider.interface";

interface ConfirmAddBody {
  type?: string;
  provider?: string;
  externalId?: string;
}

interface SubmitAddBody {
  type?: string;
  mediaItemId?: string;
  title?: string;
  loggedAt?: string;
  duration?: string;
  defaultDuration?: string;
  notes?: string;
  seasonNumber?: string;
  episodeNumber?: string;
  platform?: string;
  playerCount?: string;
  won?: string;
}

interface EntryFormModel {
  type: MediaType;
  typeLabel: string;
  accentClass: string;
  mediaItemId?: string;
  title?: string;
  loggedAt: string;
  defaultDuration?: number;
  duration?: string;
  notes?: string;
  seasonNumber?: string;
  episodeNumber?: string;
  platform?: string;
  playerCount?: string;
  won?: string;
  isMovie: boolean;
  isTvEpisode: boolean;
  isGame: boolean;
  isBoardGame: boolean;
  isMusicTrack: boolean;
  error?: string;
  errors?: Record<string, string>;
}

class AddFormValidationError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

const ADD_TYPES = [
  MediaType.MOVIE,
  MediaType.TV_EPISODE,
  MediaType.GAME,
  MediaType.BOARD_GAME,
  MediaType.MUSIC_TRACK,
] as const;

const TYPE_DETAILS: Record<
  (typeof ADD_TYPES)[number],
  { label: string; icon: string; accentClass: string }
> = {
  [MediaType.MOVIE]: {
    label: "Movie",
    icon: "film",
    accentClass: "type-movie",
  },
  [MediaType.TV_EPISODE]: {
    label: "TV episode",
    icon: "tv-2",
    accentClass: "type-tv",
  },
  [MediaType.GAME]: {
    label: "Game",
    icon: "gamepad-2",
    accentClass: "type-game",
  },
  [MediaType.BOARD_GAME]: {
    label: "Board game",
    icon: "dice-5",
    accentClass: "type-boardgame",
  },
  [MediaType.MUSIC_TRACK]: {
    label: "Music track",
    icon: "music",
    accentClass: "type-music",
  },
};

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
    const type = AddController.parseType(rawType);
    if (manual === "true") {
      return response.render("partials/add-entry-form", {
        layout: false,
        ...AddController.entryFormModel(type),
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
    const type = AddController.parseType(rawType);
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
    const type = AddController.parseType(body.type);
    const providerName = body.provider as MetadataProviderName;
    if (!body.externalId || !providerName) {
      return response.render("partials/add-entry-form", {
        layout: false,
        ...AddController.entryFormModel(
          type,
          body,
          "Select a valid search result",
        ),
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
        ...AddController.entryFormModel(type, {
          mediaItemId: mediaItem.id,
          title: mediaItem.title,
          defaultDuration: mediaItem.duration?.toString(),
        }),
      });
    } catch (error) {
      return response.render("partials/add-entry-form", {
        layout: false,
        ...AddController.entryFormModel(
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
      type = AddController.parseType(body.type);
      const validated = AddController.validateSubmission(type, body);
      const mediaItem = await this.resolveMediaItem(type, body, user.userId);
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
        entryForm: AddController.entryFormModel(
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

  private async resolveMediaItem(
    type: (typeof ADD_TYPES)[number],
    body: SubmitAddBody,
    userId: string,
  ): Promise<MediaItem> {
    let selected: MediaItem | null = null;
    if (body.mediaItemId) {
      selected = await this.mediaService.findById(body.mediaItemId);
      if (!selected) {
        throw new Error("Selected media item no longer exists");
      }
      if (selected.isSkeleton && selected.createdByUserId !== userId) {
        throw new ForbiddenException(
          "You cannot log another user's unidentified item",
        );
      }
    }

    if (type !== MediaType.TV_EPISODE) {
      if (selected) {
        if (selected.type !== type) {
          throw new Error("Selected media item has the wrong type");
        }
        return selected;
      }
      return this.mediaService.findOrCreateSkeleton(
        body.title?.trim() ?? "",
        type,
        userId,
      );
    }

    const seasonNumber = AddController.parsePositiveInteger(
      body.seasonNumber,
      "Season number",
    );
    const episodeNumber = AddController.parsePositiveInteger(
      body.episodeNumber,
      "Episode number",
    );
    const show =
      selected ??
      (await this.mediaService.findOrCreateSkeleton(
        body.title?.trim() ?? "",
        MediaType.TV_SHOW,
        userId,
      ));
    if (show.type !== MediaType.TV_SHOW) {
      throw new Error("Selected media item is not a TV show");
    }
    return this.mediaService.findOrCreateEpisodeSkeleton(
      show.id,
      show.title,
      seasonNumber,
      episodeNumber,
      userId,
    );
  }

  private static validateSubmission(type: MediaType, body: SubmitAddBody) {
    if (!body.mediaItemId && !body.title?.trim()) {
      throw new AddFormValidationError("title", "Title is required");
    }
    if (!body.loggedAt || !/^\d{4}-\d{2}-\d{2}$/.test(body.loggedAt)) {
      throw new AddFormValidationError("loggedAt", "A valid date is required");
    }
    const duration = AddController.parseOptionalPositiveInteger(
      body.duration,
      "Duration",
    );
    if (type === MediaType.GAME && duration === undefined) {
      throw new AddFormValidationError(
        "duration",
        "Duration is required for games",
      );
    }
    if (type === MediaType.GAME && !body.platform?.trim()) {
      throw new AddFormValidationError(
        "platform",
        "Platform is required for games",
      );
    }
    const playerCount = AddController.parseOptionalPositiveInteger(
      body.playerCount,
      "Player count",
    );
    return {
      loggedAt: new Date(`${body.loggedAt}T12:00:00`),
      duration,
      playerCount,
    };
  }

  private static parseType(rawType?: string): (typeof ADD_TYPES)[number] {
    if (!ADD_TYPES.includes(rawType as (typeof ADD_TYPES)[number])) {
      throw new Error("Unsupported media type");
    }
    return rawType as (typeof ADD_TYPES)[number];
  }

  private static parsePositiveInteger(
    value: string | undefined,
    label: string,
  ): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(`${label} must be a positive whole number`);
    }
    return parsed;
  }

  private static parseOptionalPositiveInteger(
    value: string | undefined,
    label: string,
  ): number | undefined {
    if (!value?.trim()) {
      return undefined;
    }
    return AddController.parsePositiveInteger(value, label);
  }

  private static entryFormModel(
    type: (typeof ADD_TYPES)[number],
    values: Partial<SubmitAddBody> = {},
    error?: string,
    errors?: Record<string, string>,
  ): EntryFormModel {
    const today = new Date();
    const localDate = new Date(
      today.getTime() - today.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 10);
    return {
      type,
      typeLabel: TYPE_DETAILS[type].label,
      accentClass: TYPE_DETAILS[type].accentClass,
      mediaItemId: values.mediaItemId,
      title: values.title,
      loggedAt: values.loggedAt ?? localDate,
      defaultDuration: values.defaultDuration
        ? Number(values.defaultDuration)
        : undefined,
      duration: values.duration,
      notes: values.notes,
      seasonNumber: values.seasonNumber,
      episodeNumber: values.episodeNumber,
      platform: values.platform,
      playerCount: values.playerCount,
      won: values.won,
      isMovie: type === MediaType.MOVIE,
      isTvEpisode: type === MediaType.TV_EPISODE,
      isGame: type === MediaType.GAME,
      isBoardGame: type === MediaType.BOARD_GAME,
      isMusicTrack: type === MediaType.MUSIC_TRACK,
      error,
      errors,
    };
  }
}
