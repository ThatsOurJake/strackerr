import { readdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MediaType } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

export interface ImageCleanupStatus {
  state: "idle" | "running" | "completed" | "failed";
  removedFiles?: number;
}

const MANAGED_IMAGE_PATTERN = /^([A-Za-z0-9_-]+)-(thumb|cover)\.webp$/;

@Injectable()
export class ImageCleanupService {
  private readonly logger = new Logger(ImageCleanupService.name);
  private running = false;
  private status: ImageCleanupStatus = { state: "idle" };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  scheduledCleanup(): void {
    this.startCleanup();
  }

  startCleanup(): boolean {
    if (this.running) {
      this.logger.warn("Image cleanup is already running.");
      return false;
    }

    void this.cleanupOrphanedImages();
    return true;
  }

  getStatus(): ImageCleanupStatus {
    return { ...this.status };
  }

  async cleanupOrphanedImages(): Promise<number | null> {
    if (this.running) {
      this.logger.warn("Image cleanup is already running.");
      return null;
    }

    this.running = true;
    this.status = { state: "running" };
    this.logger.log("Image cleanup started.");

    try {
      const removedFiles = await this.removeUnusedFiles();
      this.status = { state: "completed", removedFiles };
      this.logger.log(
        `Image cleanup complete: deleted ${removedFiles} unused files.`,
      );
      return removedFiles;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.status = { state: "failed" };
      this.logger.error(`Image cleanup failed: ${message}`);
      return null;
    } finally {
      this.running = false;
    }
  }

  private async removeUnusedFiles(): Promise<number> {
    const dataDir = this.configService.get<string>("DATA_DIR") ?? "./data";
    const imageRoot = resolve(dataDir, "images");
    let files: string[];

    try {
      files = await readdir(imageRoot, { encoding: "utf8" });
    } catch {
      this.logger.log("Image cleanup skipped: images directory not found.");
      return 0;
    }

    const referencedFiles = await this.findReferencedFiles();
    if (referencedFiles === null) {
      throw new Error("could not verify MediaItem image references");
    }

    await this.clearEpisodeImageReferences();

    let removedFiles = 0;
    for (const fileName of files) {
      if (
        !MANAGED_IMAGE_PATTERN.test(fileName) ||
        referencedFiles.has(fileName)
      ) {
        continue;
      }

      const filePath = resolve(imageRoot, fileName);
      if (dirname(filePath) !== imageRoot) {
        this.logger.warn(`Image cleanup skipped unsafe path: ${fileName}`);
        continue;
      }

      try {
        await rm(filePath, { force: true });
        removedFiles += 1;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Image cleanup could not remove ${fileName}: ${message}`,
        );
      }
    }

    return removedFiles;
  }

  private async findReferencedFiles(): Promise<Set<string> | null> {
    try {
      const mediaItems = await this.prisma.mediaItem.findMany({
        where: {
          type: { not: MediaType.TV_EPISODE },
          imageUrl: { not: null },
        },
        select: { id: true, imageUrl: true },
      });
      const referencedFiles = new Set<string>();

      for (const mediaItem of mediaItems) {
        const coverFileName = `${mediaItem.id}-cover.webp`;
        if (mediaItem.imageUrl === `/img/${coverFileName}`) {
          referencedFiles.add(coverFileName);
          referencedFiles.add(`${mediaItem.id}-thumb.webp`);
        }
      }

      return referencedFiles;
    } catch {
      return null;
    }
  }

  private async clearEpisodeImageReferences(): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.cachedImage.deleteMany({
          where: { mediaItem: { type: MediaType.TV_EPISODE } },
        }),
        this.prisma.mediaItem.updateMany({
          where: { type: MediaType.TV_EPISODE },
          data: { imageUrl: null, imageSourceUrl: null },
        }),
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Image cleanup could not clear episode image references: ${message}`,
      );
    }
  }
}
