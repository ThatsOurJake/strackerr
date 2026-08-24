import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import { CacheKeys } from "../../infrastructure/cache/cache-keys";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { LogService } from "../../modules/activity/log.service";
import { toDayViewModels } from "../activity-view-model";

interface HistoryPageModel {
  days: ReturnType<typeof toDayViewModels>;
  hasMore: boolean;
  nextPage: number;
}

@Controller("history")
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(
    private readonly logService: LogService,
    private readonly cacheService: AppCacheService,
  ) { }

  @Get()
  async history(
    @Query("page") rawPage: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const page = HistoryController.parsePage(rawPage);
    const model = await this.getPage(user.userId, page);
    return response.render("history", { title: "History", ...model, isInitial: true });
  }

  @Get("partial")
  async partial(
    @Query("page") rawPage: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const page = HistoryController.parsePage(rawPage);
    const model = await this.getPage(user.userId, page);
    return response.render("partials/history-days", { layout: false, ...model });
  }

  private async getPage(userId: string, page: number): Promise<HistoryPageModel> {
    const cacheKey = CacheKeys.history(userId, page);
    const cached = await this.cacheService.get<HistoryPageModel>(cacheKey);
    if (cached) {
      return cached;
    }

    const groups = this.logService.groupByDay(await this.logService.findByUser(userId));
    const start = (page - 1) * 30;
    const model = {
      days: toDayViewModels(groups.slice(start, start + 30)),
      hasMore: groups.length > start + 30,
      nextPage: page + 1,
    };
    await this.cacheService.set(cacheKey, model, 300, userId);
    return model;
  }

  private static parsePage(rawPage?: string): number {
    const page = Number.parseInt(rawPage ?? "1", 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }
}