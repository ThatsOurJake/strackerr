import { ConflictException, Injectable } from "@nestjs/common";
import { LogSource, MediaType, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface FindLogsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  type?: MediaType;
}

export interface CreateLogData {
  mediaItemId: string;
  loggedAt: Date;
  duration?: number;
  notes?: string;
  platform?: string;
  playerCount?: number;
  won?: boolean;
}

export interface PaginatedLogs {
  data: LogEntryWithMedia[];
  total: number;
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

  async create(
    data: CreateLogData,
    userId: string,
    source: LogSource,
  ): Promise<LogEntryWithMedia> {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.logEntry.findFirst({
        where: {
          userId,
          mediaItemId: data.mediaItemId,
          loggedAt: data.loggedAt,
        },
      });

      if (duplicate) {
        throw new ConflictException("A log entry already exists at this time");
      }

      return transaction.logEntry.create({
        data: { ...data, userId, source },
        include: { mediaItem: { include: { parent: true } } },
      });
    });
  }

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

  async findByUserPaginated(
    userId: string,
    filters: FindLogsFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedLogs> {
    const where: Prisma.LogEntryWhereInput = {
      userId,
      loggedAt: {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      },
      mediaItem: filters.type ? { type: filters.type } : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.logEntry.findMany({
        where,
        include: { mediaItem: { include: { parent: true } } },
        orderBy: { loggedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.logEntry.count({ where }),
    ]);

    return { data, total };
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
