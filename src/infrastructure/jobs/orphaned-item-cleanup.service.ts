import { Injectable, Logger, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../database/prisma.service";
import { Events } from "../events/event-names";

const CLEANUP_BATCH_SIZE = 100;

export interface OrphanedItemCleanupStatus {
  state: "idle" | "running" | "completed" | "failed";
  removedItems?: number;
  failedItems?: number;
}

@Injectable()
export class OrphanedItemCleanupService {
  private readonly logger = new Logger(OrphanedItemCleanupService.name);
  private running = false;
  private status: OrphanedItemCleanupStatus = { state: "idle" };

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly events?: EventEmitter2,
  ) { }

  startCleanup(): boolean {
    if (this.running) {
      this.logger.warn("Orphaned item cleanup is already running.");
      return false;
    }

    void this.cleanupOrphanedItems();
    return true;
  }

  getStatus(): OrphanedItemCleanupStatus {
    return { ...this.status };
  }

  async cleanupOrphanedItems(): Promise<{ removedItems: number; failedItems: number } | null> {
    if (this.running) {
      this.logger.warn("Orphaned item cleanup is already running.");
      return null;
    }

    this.running = true;
    this.status = { state: "running" };
    this.logger.log("Orphaned item cleanup started.");

    let removedItems = 0;
    let failedItems = 0;

    try {
      while (true) {
        const candidates = await this.prisma.mediaItem.findMany({
          where: {
            isSkeleton: false,
            parentId: null,
            logEntries: { none: {} },
            episodes: { none: {} },
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
            const deleted = await this.prisma.mediaItem.deleteMany({
              where: {
                id: candidate.id,
                isSkeleton: false,
                parentId: null,
                logEntries: { none: {} },
                episodes: { none: {} },
              },
            });

            if (deleted.count > 0) {
              removedItems += 1;
              removedInBatch += 1;
              this.events?.emit(Events.MEDIA_ITEM_DELETED, {
                mediaItemId: candidate.id,
              });
            }
          } catch (error: unknown) {
            failedItems += 1;
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Orphaned item cleanup failed for ${candidate.id}: ${message}`);
          }
        }

        if (removedInBatch === 0) {
          this.logger.warn("Orphaned item cleanup made no progress for a batch; stopping run.");
          break;
        }
      }

      this.status = { state: "completed", removedItems, failedItems };
      this.logger.log(
        `Orphaned item cleanup complete: removed ${removedItems} item(s), failed ${failedItems}.`,
      );
      return { removedItems, failedItems };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.status = { state: "failed", removedItems, failedItems };
      this.logger.error(`Orphaned item cleanup failed: ${message}`);
      return null;
    } finally {
      this.running = false;
    }
  }
}
