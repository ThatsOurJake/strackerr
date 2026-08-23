import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import type { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  @Get()
  async search(
    @Query("q") query: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const searchQuery = query?.trim() ?? "";
    const results =
      searchQuery.length >= 3
        ? await this.searchService.search(user.userId, searchQuery)
        : [];
    const grouped = new Map<string, typeof results>();
    for (const result of results) {
      const group = grouped.get(result.type) ?? [];
      group.push(result);
      grouped.set(result.type, group);
    }

    return response.render("search", {
      title: "Search",
      query: searchQuery,
      groups: [...grouped.entries()].map(([type, groupResults]) => ({
        type,
        results: groupResults,
      })),
    });
  }

  @Get("partial")
  async partial(
    @Query("q") query: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const searchQuery = query?.trim() ?? "";
    const results =
      searchQuery.length >= 3
        ? (await this.searchService.search(user.userId, searchQuery)).slice(
          0,
          5,
        )
        : [];

    return response.render("partials/search-dropdown", {
      layout: false,
      query: searchQuery,
      results,
    });
  }
}
