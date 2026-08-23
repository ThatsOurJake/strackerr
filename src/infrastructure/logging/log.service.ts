import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  type LogEntry,
  LogSource,
  MediaType,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { Events } from "../events/event-names";

export interface CreateLogData {
  mediaItemId: string;
  loggedAt: Date;
  type?: MediaType;
  duration?: number;
  platform?: string;
  playerCount?: number;
  won?: boolean;
}

export interface LogFilters {
  dateFrom?: Date;
  dateTo?: Date;
  type?: MediaType;
  skip?: number;
  take?: number;
}

export interface MusicGroup {
  trackCount: number;
  totalDuration: number;
  entries: LogEntry[];
}

export interface DayGroup {
  date: string;
  entries: LogEntry[];
  musicGroup?: MusicGroup;
}

type LogEntryWithMediaItem = Prisma.LogEntryGetPayload<{
  include: { mediaItem: true };
}>;

@Injectable()
export class LogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) { }

  async create(
    dto: CreateLogData,
    userId: string,
    source: LogSource,
  ): Promise<LogEntry> {
    const { type, ...logData } = dto;
    const mediaItem = await this.prisma.mediaItem.findUnique({
      where: { id: dto.mediaItemId },
    });

    if (!mediaItem) {
      throw new BadRequestException("Media item not found");
    }

    if (
      mediaItem.type === MediaType.GAME &&
      (!dto.platform || dto.duration === undefined)
    ) {
      throw new BadRequestException("Games require duration and platform");
    }

    if (
      type === MediaType.TV_EPISODE &&
      mediaItem.type !== MediaType.TV_EPISODE
    ) {
      throw new BadRequestException("Media item must be a TV episode");
    }

    if (source === LogSource.API) {
      const dayStart = new Date(
        Date.UTC(
          dto.loggedAt.getUTCFullYear(),
          dto.loggedAt.getUTCMonth(),
          dto.loggedAt.getUTCDate(),
        ),
      );

      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const duplicate = await this.prisma.logEntry.findFirst({
        where: {
          userId,
          mediaItemId: dto.mediaItemId,
          loggedAt: { gte: dayStart, lt: dayEnd },
        },
      });

      if (duplicate) {
        throw new ConflictException("Log entry already exists for this day");
      }
    }

    const entry = await this.prisma.logEntry.create({
      data: {
        ...logData,
        userId,
        source,
        duration: dto.duration ?? mediaItem.duration,
      },
    });

    this.events.emit(Events.LOG_ENTRY_CHANGED, { userId });

    return entry;
  }

  async delete(id: string, userId: string): Promise<LogEntry> {
    const entry = await this.prisma.logEntry.delete({ where: { id, userId } });
    this.events.emit(Events.LOG_ENTRY_CHANGED, { userId });
    return entry;
  }

  findByUser(
    userId: string,
    filters: LogFilters = {},
  ): Promise<LogEntryWithMediaItem[]> {
    return this.prisma.logEntry.findMany({
      where: {
        userId,
        loggedAt: { gte: filters.dateFrom, lte: filters.dateTo },
        ...(filters.type ? { mediaItem: { type: filters.type } } : {}),
      },
      include: { mediaItem: true },
      orderBy: { loggedAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    });
  }

  findByUserAndMediaItem(
    userId: string,
    mediaItemId: string,
  ): Promise<LogEntry[]> {
    return this.prisma.logEntry.findMany({
      where: { userId, mediaItemId },
      orderBy: { loggedAt: "desc" },
    });
  }

  groupByDay(entries: LogEntryWithMediaItem[]): DayGroup[] {
    const groups = new Map<string, DayGroup>();

    for (const entry of entries) {
      const date = entry.loggedAt.toISOString().slice(0, 10);
      const group = groups.get(date) ?? { date, entries: [] };

      if (entry.mediaItem.type === MediaType.MUSIC_TRACK) {
        if (!group.musicGroup) {
          group.musicGroup = {
            trackCount: 0,
            totalDuration: 0,
            entries: [],
          };
        }

        group.musicGroup.trackCount++;
        group.musicGroup.totalDuration += entry.duration ?? 0;
        group.musicGroup.entries.push(entry);
      } else {
        group.entries.push(entry);
      }

      groups.set(date, group);
    }

    return [...groups.values()].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
  }
}
