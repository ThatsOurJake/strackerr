import { Controller, Get, NotFoundException, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { UsersService } from "../users/users.service";
import { ApiErrorResponseDto, ApiProfileResponseDto } from "./dto/response.dto";
import { ApiKeyNotFoundGuard } from "./guards/api-key-not-found.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

@ApiTags("profile")
@ApiSecurity("ApiKey")
@UseGuards(ApiKeyNotFoundGuard, ApiThrottlerGuard)
@Controller("api/v1/profile")
export class ApiV1ProfileController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiOperation({
    summary: "Get the profile attached to the API key",
    description: "Use this endpoint as a quick sanity check that the supplied API key is valid.",
  })
  @ApiResponse({
    status: 200,
    type: ApiProfileResponseDto,
    description: "Authenticated profile details",
  })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto, description: "Not found" })
  async getProfile(@Req() request: Request): Promise<ApiProfileResponseDto> {
    const userId = request.user?.userId;

    if (!userId) {
      throw new NotFoundException("Not Found");
    }

    const profile = await this.usersService.findById(userId);

    if (!profile) {
      throw new NotFoundException("Not Found");
    }

    return {
      data: {
        id: profile.id,
        username: profile.username,
        isAdmin: profile.isAdmin,
        createdAt: profile.createdAt,
      },
    };
  }
}
