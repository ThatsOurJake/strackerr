import { BadRequestException, Controller, Get, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { LogService } from "../activity/log.service";
import { StatsService } from "../stats/stats.service";
import { StatsQueryDto } from "./dto/query.dto";
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
  @ApiResponse({ status: 200, type: StatsResponseDto, description: "User-scoped activity summary" })
  @ApiResponse({ status: 400, description: "Invalid or conflicting period filters" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  async getStats(@Query() query: StatsQueryDto, @Req() request: Request): Promise<StatsResponseDto> {
    if (query.period && query.year) {
      throw new BadRequestException("period and year cannot be combined");
    }

    const range = query.year
      ? { from: new Date(query.year, 0, 1), to: new Date(query.year + 1, 0, 1, 0, 0, 0, -1) }
      : this.statsService.resolveDateRange(query.period ?? "this-year");
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
