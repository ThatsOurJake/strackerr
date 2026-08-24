import { Injectable } from "@nestjs/common";
import { MediaType, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface FindLogsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  type?: MediaType;
}

export type LogEntryWithMedia = Prisma.LogEntryGetPayload<{
  include: { mediaItem: { include: { parent: true } } };
}>;

export interface MusicLogGroup {
  trackCount: number;
  totalDuration: number;
  entries: LogEntryWithMedia[];
}

export interface LogDayGroup {
  date: string;
  entries: LogEntryWithMedia[];
  musicGroup?: MusicLogGroup;
}

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) { }

  findByUser(
    userId: string,
    filters: FindLogsFilters = {},
  ): Promise<LogEntryWithMedia[]> {
    return this.prisma.logEntry.findMany({
      where: {
        userId,
        loggedAt: {
          gte: filters.dateFrom,
          lte: filters.dateTo,
        },
        mediaItem: filters.type ? { type: filters.type } : undefined,
      },
      include: { mediaItem: { include: { parent: true } } },
      orderBy: { loggedAt: "desc" },
    });
  }

  groupByDay(entries: LogEntryWithMedia[]): LogDayGroup[] {
    const groups = new Map<string, LogDayGroup>();

    for (const entry of entries) {
      const date = LogService.toLocalDateKey(entry.loggedAt);
      const group = groups.get(date) ?? { date, entries: [] };

      if (entry.mediaItem.type === MediaType.MUSIC_TRACK) {
        const musicGroup = group.musicGroup ?? {
          trackCount: 0,
          totalDuration: 0,
          entries: [],
        };
        musicGroup.trackCount += 1;
        musicGroup.totalDuration += entry.duration ?? 0;
        musicGroup.entries.push(entry);
        group.musicGroup = musicGroup;
      } else {
        group.entries.push(entry);
      }

      groups.set(date, group);
    }

    return [...groups.values()];
  }

  private static toLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}