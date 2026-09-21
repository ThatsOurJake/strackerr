import { CanActivate, ExecutionContext, Injectable, NotFoundException } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class ApiKeyNotFoundGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header("X-API-Key");

    if (request.query.apiKey !== undefined) {
      throw new NotFoundException("Not Found");
    }

    if (!apiKey) {
      throw new NotFoundException("Not Found");
    }

    const user = await this.prisma.user.findUnique({ where: { apiKey } });
    if (!user) {
      throw new NotFoundException("Not Found");
    }

    request.user = {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };
    return true;
  }
}
