import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { MediaService } from "../media/media.service";
import { MediaSearchQueryDto } from "./dto/query.dto";
import { MediaSearchResponseDto } from "./dto/response.dto";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

@ApiTags("media")
@ApiSecurity("ApiKey")
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller("api/v1/media")
export class ApiV1MediaController {
  constructor(private readonly mediaService: MediaService) { }

  @Get("search")
  @ApiOperation({ summary: "Search the authenticated user's media" })
  @ApiResponse({ status: 200, type: MediaSearchResponseDto, description: "Matching media items" })
  @ApiResponse({ status: 401, description: "Invalid or missing API key" })
  async search(@Query() query: MediaSearchQueryDto, @Req() request: Request): Promise<MediaSearchResponseDto> {
    if (!request.user) {
      throw new UnauthorizedException("Invalid or missing API key");
    }
    const results = await this.mediaService.searchForUser(request.user.userId, query.q, query.type);
    return {
      data: results.map(({ id, title, type, year, imageUrl }) => ({
        id,
        title,
        type,
        year: year ?? undefined,
        imageUrl: imageUrl ?? undefined,
      })),
    };
  }
}
