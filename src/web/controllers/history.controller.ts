import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import { CacheKeys } from "../../infrastructure/cache/cache-keys";
import { LogService } from "../../modules/activity/log.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { toDayViewModels } from "../activity-view-model";

interface HistoryMonth {
  key: string;
  heading: string;
  start: Date;
  end: Date;
  previousKey: string;
  nextKey?: string;
}

interface HistoryPageModel {
  days: ReturnType<typeof toDayViewModels>;
  month: string;
  monthHeading: string;
  previousMonth: string;
  nextMonth?: string;
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
    @Query("month") requestedMonth: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const currentMonth = HistoryController.monthKey(new Date());
    if (!requestedMonth || !HistoryController.isValidMonth(requestedMonth)) {
      return response.redirect(`/history?month=${currentMonth}`);
    }

    const selectedMonth = HistoryController.resolveMonth(requestedMonth);
    if (selectedMonth.start > HistoryController.resolveMonth(currentMonth).start) {
      return response.redirect(`/history?month=${currentMonth}`);
    }

    const model = await this.getMonth(user.userId, selectedMonth, currentMonth);
    return response.render("history", { title: "History", ...model });
  }

  private async getMonth(
    userId: string,
    selectedMonth: HistoryMonth,
    currentMonth: string,
  ): Promise<HistoryPageModel> {
    const cacheKey = CacheKeys.history(userId, selectedMonth.key);
    const cached = await this.cacheService.get<HistoryPageModel>(cacheKey);
    if (cached) {
      return cached;
    }

    const entries = await this.logService.findByUser(userId, {
      dateFrom: selectedMonth.start,
      dateBefore: selectedMonth.end,
    });
    const model = {
      days: toDayViewModels(this.logService.groupByDay(entries)),
      month: selectedMonth.key,
      monthHeading: selectedMonth.heading,
      previousMonth: selectedMonth.previousKey,
      nextMonth:
        selectedMonth.key === currentMonth ? undefined : selectedMonth.nextKey,
    };
    await this.cacheService.set(cacheKey, model, 300, userId);
    return model;
  }

  private static isValidMonth(value: string): boolean {
    return /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value);
  }

  private static resolveMonth(key: string): HistoryMonth {
    const [year, month] = key.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const previous = new Date(year, month - 2, 1);
    return {
      key,
      heading: start.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
      start,
      end,
      previousKey: HistoryController.monthKey(previous),
      nextKey: HistoryController.monthKey(end),
    };
  }

  private static monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
}
