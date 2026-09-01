import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import { CacheKeys } from "../../infrastructure/cache/cache-keys";
import { LogService } from "../../modules/activity/log.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import {
  formatDuration,
  mediaTypeDetails,
  toDayViewModels,
} from "../activity-view-model";

@Controller()
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly logService: LogService,
    private readonly cacheService: AppCacheService,
  ) { }

  @Get()
  async dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const cacheKey = CacheKeys.dashboard(user.userId);
    const cached =
      await this.cacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return response.render("dashboard", { title: "Dashboard", ...cached });
    }

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 6);
    dateFrom.setHours(0, 0, 0, 0);
    const entries = await this.logService.findByUser(user.userId, { dateFrom });
    const totals = new Map<string, number>();
    for (const entry of entries) {
      totals.set(
        entry.mediaItem.type,
        (totals.get(entry.mediaItem.type) ?? 0) + (entry.duration ?? 0),
      );
    }
    const model = {
      days: toDayViewModels(this.logService.groupByDay(entries)),
      sessionCount: entries.length,
      stats: [...totals.entries()].map(([type, minutes]) => ({
        ...mediaTypeDetails(type as Parameters<typeof mediaTypeDetails>[0]),
        duration: formatDuration(minutes),
      })),
      hasActivity: entries.length > 0,
    };
    await this.cacheService.set(cacheKey, model, 300, user.userId);
    return response.render("dashboard", { title: "Dashboard", ...model });
  }
}
