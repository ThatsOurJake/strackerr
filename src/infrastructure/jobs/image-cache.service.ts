import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import sharp from "sharp";
import { PrismaService } from "../database/prisma.service";
import { Events } from "../events/event-names";
import {
  ImageCacheRequestEvent,
  MediaItemDeletedEvent,
} from "../events/events";

const MAX_CONCURRENT_DOWNLOADS = 3;

@Injectable()
export class ImageCacheService {
  private readonly logger = new Logger(ImageCacheService.name);
  private readonly queue: ImageCacheRequestEvent[] = [];
  private activeDownloads = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  @OnEvent(Events.IMAGE_CACHE)
  enqueue(request: ImageCacheRequestEvent): void {
    this.queue.push(request);
    this.processQueue();
  }

  @OnEvent(Events.MEDIA_ITEM_DELETED)
  async handleMediaItemDeleted(event: MediaItemDeletedEvent): Promise<void> {
    await this.deleteImages(event.mediaItemId);
  }

  async deleteImages(mediaItemId: string): Promise<void> {
    const imageDir = this.getImageDir();
    await Promise.all([
      rm(join(imageDir, `${mediaItemId}-thumb.webp`), { force: true }),
      rm(join(imageDir, `${mediaItemId}-cover.webp`), { force: true }),
    ]);
  }

  private processQueue(): void {
    while (
      this.activeDownloads < MAX_CONCURRENT_DOWNLOADS &&
      this.queue.length > 0
    ) {
      const request = this.queue.shift();
      if (!request) {
        return;
      }

      this.activeDownloads += 1;
      void this.cacheImage(request).finally(() => {
        this.activeDownloads -= 1;
        this.processQueue();
      });
    }
  }

  private async cacheImage(request: ImageCacheRequestEvent): Promise<void> {
    try {
      const response = await fetch(request.sourceUrl);
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.startsWith("image/")) {
        this.logger.warn(
          `Image download failed for ${request.mediaItemId}: status ${response.status}, content type ${contentType || "unknown"}.`,
        );
        return;
      }

      const input = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(input).metadata();
      const portrait =
        metadata.width !== undefined &&
        metadata.height !== undefined &&
        metadata.height > metadata.width;
      const thumb = portrait
        ? { width: 160, height: 240 }
        : { width: 160, height: 160 };
      const cover = portrait
        ? { width: 400, height: 600 }
        : { width: 400, height: 400 };
      const imageDir = this.getImageDir();
      const thumbFileName = `${request.mediaItemId}-thumb.webp`;
      const coverFileName = `${request.mediaItemId}-cover.webp`;

      await mkdir(imageDir, { recursive: true });
      await Promise.all([
        sharp(input)
          .resize({ ...thumb, fit: "cover" })
          .webp({ quality: 80 })
          .toFile(join(imageDir, thumbFileName)),
        sharp(input)
          .resize({ ...cover, fit: "cover" })
          .webp({ quality: 80 })
          .toFile(join(imageDir, coverFileName)),
      ]);

      const imageUrl = `/img/${coverFileName}`;
      await this.prisma.$transaction([
        this.prisma.mediaItem.update({
          where: { id: request.mediaItemId },
          data: { imageUrl },
        }),
        this.prisma.cachedImage.upsert({
          where: {
            mediaItemId_sourceUrl: {
              mediaItemId: request.mediaItemId,
              sourceUrl: request.sourceUrl,
            },
          },
          create: {
            mediaItemId: request.mediaItemId,
            sourceUrl: request.sourceUrl,
            localPath: imageUrl,
          },
          update: { localPath: imageUrl },
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Image caching failed for ${request.mediaItemId}: ${message}`,
      );
    }
  }

  private getImageDir(): string {
    const dataDir = this.configService.get<string>("DATA_DIR") ?? "./data";
    return join(dataDir, "images");
  }
}
