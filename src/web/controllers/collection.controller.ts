import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { CollectionFilters, CollectionService } from "../../modules/collection/collection.service";
import {
  toCollectionViewModel,
  toMediaDetailViewModel,
  typeFromSlug,
} from "../collection-view-model";

const DETAIL_VIEWS = {
  MOVIE: "collection/movie",
  TV_SHOW: "collection/tv-show",
  GAME: "collection/game",
  BOARD_GAME: "collection/board-game",
  MUSIC_TRACK: "collection/music-track",
} as const;

@Controller("collection")
@UseGuards(JwtAuthGuard)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) { }

  @Get()
  async collection(
    @Query("type") type: string | undefined,
    @Query("filter") filter: string | undefined,
    @Query("letter") letter: string | undefined,
    @Query("page") page: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const model = await this.getCollectionModel(user.userId, type, filter, letter, page);
    return response.render("collection", { title: "Collection", ...model });
  }

  @Get("partial")
  async partial(
    @Query("type") type: string | undefined,
    @Query("filter") filter: string | undefined,
    @Query("letter") letter: string | undefined,
    @Query("page") page: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const model = await this.getCollectionModel(user.userId, type, filter, letter, page);
    return response.render("partials/collection-grid", { layout: false, ...model });
  }

  @Get(":type/:id")
  async detail(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const item = await this.collectionService.findDetail(user.userId, id);
    const view = DETAIL_VIEWS[item.type as keyof typeof DETAIL_VIEWS];
    if (!view) {
      return response.status(404).send("Media item not found");
    }
    return response.render(view, {
      ...toMediaDetailViewModel(item),
    });
  }

  private async getCollectionModel(
    userId: string,
    type?: string,
    filter?: string,
    letter?: string,
    page?: string,
  ) {
    const normalizedLetter = letter?.toUpperCase();
    const filters: CollectionFilters = {
      type: typeFromSlug(type),
      unidentified: filter === "unidentified",
      letter: normalizedLetter && (/^[A-Z]$/.test(normalizedLetter) || normalizedLetter === "#")
        ? normalizedLetter
        : undefined,
      page: CollectionController.parsePage(page),
    };
    const collectionPage = await this.collectionService.findCollection(userId, filters);
    return toCollectionViewModel(collectionPage, filters);
  }

  private static parsePage(rawPage?: string): number {
    const page = Number.parseInt(rawPage ?? "1", 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }
}
