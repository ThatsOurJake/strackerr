import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header("X-API-Key");

    if (request.query.apiKey !== undefined || !apiKey) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    const user = await this.prisma.user.findUnique({ where: { apiKey } });
    if (!user) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    request.user = {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };
    return true;
  }
}
