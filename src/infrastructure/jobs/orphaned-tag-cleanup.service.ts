import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const CLEANUP_BATCH_SIZE = 200;

export interface OrphanedTagCleanupStatus {
  state: "idle" | "running" | "completed" | "failed";
  removedTags?: number;
  failedTags?: number;
}

@Injectable()
export class OrphanedTagCleanupService {
  private readonly logger = new Logger(OrphanedTagCleanupService.name);
  private running = false;
  private status: OrphanedTagCleanupStatus = { state: "idle" };

  constructor(private readonly prisma: PrismaService) { }

  startCleanup(): boolean {
    if (this.running) {
      this.logger.warn("Orphaned tag cleanup is already running.");
      return false;
    }

    void this.cleanupOrphanedTags();
    return true;
  }

  getStatus(): OrphanedTagCleanupStatus {
    return { ...this.status };
  }

  async cleanupOrphanedTags(): Promise<{ removedTags: number; failedTags: number } | null> {
    if (this.running) {
      this.logger.warn("Orphaned tag cleanup is already running.");
      return null;
    }

    this.running = true;
    this.status = { state: "running" };
    this.logger.log("Orphaned tag cleanup started.");

    let removedTags = 0;
    let failedTags = 0;

    try {
      while (true) {
        const candidates = await this.prisma.tag.findMany({
          where: {
            mediaItemTags: { none: {} },
          },
          select: { id: true },
          orderBy: { id: "asc" },
          take: CLEANUP_BATCH_SIZE,
        });

        if (candidates.length === 0) {
          break;
        }

        let removedInBatch = 0;
        for (const candidate of candidates) {
          try {
            const deleted = await this.prisma.tag.deleteMany({
              where: {
                id: candidate.id,
                mediaItemTags: { none: {} },
              },
            });

            if (deleted.count > 0) {
              removedTags += 1;
              removedInBatch += 1;
            }
          } catch (error: unknown) {
            failedTags += 1;
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Orphaned tag cleanup failed for ${candidate.id}: ${message}`);
          }
        }

        if (removedInBatch === 0) {
          this.logger.warn("Orphaned tag cleanup made no progress for a batch; stopping run.");
          break;
        }
      }

      this.status = { state: "completed", removedTags, failedTags };
      this.logger.log(
        `Orphaned tag cleanup complete: removed ${removedTags} tag(s), failed ${failedTags}.`,
      );
      return { removedTags, failedTags };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.status = { state: "failed", removedTags, failedTags };
      this.logger.error(`Orphaned tag cleanup failed: ${message}`);
      return null;
    } finally {
      this.running = false;
    }
  }
}
