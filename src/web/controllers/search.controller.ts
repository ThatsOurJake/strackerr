import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { SearchService } from "../../modules/search/search.service";

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
      const group = grouped.get(result.group) ?? [];
      group.push(result);
      grouped.set(result.group, group);
    }

    return response.render("search", {
      title: searchQuery ? `Search: ${searchQuery}` : "Search",
      query: searchQuery,
      searched: searchQuery.length >= 3,
      groups: [...grouped.entries()].map(([label, groupResults]) => ({
        label,
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
