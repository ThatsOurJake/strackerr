import { BadRequestException, Controller, Get, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { LogService } from "../activity/log.service";
import { STATS_PERIODS, type StatsPeriodSlug, StatsService } from "../stats/stats.service";
import { StatsResponseDto } from "./dto/response.dto";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

@ApiTags("stats")
@ApiSecurity("ApiKey")
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller("api/v1/stats")
export class ApiV1StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly logService: LogService,
  ) { }

  @Get()
  @ApiOperation({ summary: "Get activity statistics" })
  @ApiQuery({ name: "period", enum: STATS_PERIODS.map(({ slug }) => slug), required: false })
  @ApiQuery({ name: "year", type: Number, required: false, example: 2026 })
  @ApiResponse({ status: 200, type: StatsResponseDto, description: "User-scoped activity summary" })
  @ApiResponse({ status: 400, description: "Invalid or conflicting period filters" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  async getStats(
    @Query("period") period: string | undefined,
    @Query("year") rawYear: string | undefined,
    @Req() request: Request,
  ): Promise<StatsResponseDto> {
    const periodSlugs = STATS_PERIODS.map(({ slug }) => slug) as StatsPeriodSlug[];
    const year = rawYear ? Number.parseInt(rawYear, 10) : undefined;
    let parsedPeriod: StatsPeriodSlug | undefined;

    if (period !== undefined) {
      if (!periodSlugs.includes(period as StatsPeriodSlug)) {
        throw new BadRequestException("period is invalid");
      }
      parsedPeriod = period as StatsPeriodSlug;
    }

    if (
      rawYear !== undefined &&
      (year === undefined || !Number.isInteger(year) || year < 1970 || year > 9999)
    ) {
      throw new BadRequestException("year must be between 1970 and 9999");
    }

    if (parsedPeriod && year) {
      throw new BadRequestException("period and year cannot be combined");
    }

    const range = year
      ? { from: new Date(year, 0, 1), to: new Date(year + 1, 0, 1, 0, 0, 0, -1) }
      : this.statsService.resolveDateRange(parsedPeriod ?? "this-year");

    if (!request.user) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    const userId = request.user.userId;
    const [totalTimeByType, topItems, entries] = await Promise.all([
      this.statsService.totalTimeByType(userId, range),
      this.statsService.topItems(userId, range),
      this.logService.findByUser(userId, { dateFrom: range?.from, dateTo: range?.to }),
    ]);

    return {
      totalTimeByType,
      topItems: topItems.map(({ mediaItem, totalMinutes }) => ({
        id: mediaItem.id,
        title: mediaItem.title,
        type: mediaItem.type,
        totalMinutes,
      })),
      totalSessions: entries.length,
    };
  }
}
