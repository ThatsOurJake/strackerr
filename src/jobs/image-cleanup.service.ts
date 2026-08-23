import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ImageCleanupService {
  private readonly logger = new Logger(ImageCleanupService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOrphanedImages(): Promise<void> {
    const dataDir = this.configService.get<string>("DATA_DIR") ?? "./data";
    const imageDir = join(dataDir, "images");

    let files: string[] = [];

    try {
      files = await readdir(imageDir, { encoding: "utf8" });
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
    try {
      const mediaItems = await this.prisma.mediaItem.findMany({
        where: { id: { in: mediaItemIds } },
        select: { id: true },
      });

      return new Set(mediaItems.map((mediaItem) => mediaItem.id));
    } catch {
      return null;
    }
  }
}
