import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class ImageCleanupService {
  private readonly logger = new Logger(ImageCleanupService.name);

  constructor(private readonly configService: ConfigService) { }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOrphanedImages(): Promise<void> {
    const dataDir = this.configService.get<string>("DATA_DIR") ?? "./data";
    const imageDir = join(dataDir, "images");

    let files: string[] = [];

    try {
      files = await readdir(imageDir);
    } catch {
      this.logger.log("Image cleanup skipped: images directory not found.");
      return;
    }

    const fileToMediaItemId = new Map<string, string>();
    for (const file of files) {
      const match = file.match(/^(.+)-(thumb|cover)\.webp$/);
      if (match?.[1]) {
        fileToMediaItemId.set(file, match[1]);
      }
    }

    const mediaItemIds = [...new Set(fileToMediaItemId.values())];
    if (mediaItemIds.length === 0) {
      this.logger.log("Image cleanup complete: deleted 0 orphaned files.");
      return;
    }

    const existingIds = await this.findExistingMediaItemIds(mediaItemIds);
    if (existingIds === null) {
      this.logger.warn(
        "Image cleanup skipped: could not verify MediaItem records.",
      );
      return;
    }

    let deletedFiles = 0;
    for (const [fileName, mediaItemId] of fileToMediaItemId.entries()) {
      if (existingIds.has(mediaItemId)) {
        continue;
      }

      await rm(join(imageDir, fileName), { force: true });
      deletedFiles += 1;
    }

    this.logger.log(
      `Image cleanup complete: deleted ${deletedFiles} orphaned files.`,
    );
  }

  private async findExistingMediaItemIds(
    mediaItemIds: string[],
  ): Promise<Set<string> | null> {
    const prismaModule = await this.loadPrismaModule();
    if (!prismaModule) {
      return null;
    }

    const prisma = new prismaModule.PrismaClient();

    try {
      const placeholders = mediaItemIds
        .map((_, index) => `$${index + 1}`)
        .join(", ");
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id FROM "MediaItem" WHERE id IN (${placeholders})`,
        ...mediaItemIds,
      )) as Array<{ id: string }>;

      return new Set(rows.map((row) => row.id));
    } catch {
      return null;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async loadPrismaModule(): Promise<{
    PrismaClient: new () => {
      $queryRawUnsafe: (...args: unknown[]) => Promise<unknown>;
      $disconnect: () => Promise<void>;
    };
  } | null> {
    try {
      const prismaModule = (await import("@prisma/client")) as {
        PrismaClient?: new () => {
          $queryRawUnsafe: (...args: unknown[]) => Promise<unknown>;
          $disconnect: () => Promise<void>;
        };
      };

      if (!prismaModule.PrismaClient) {
        return null;
      }

      return {
        PrismaClient: prismaModule.PrismaClient,
      };
    } catch {
      return null;
    }
  }
}
