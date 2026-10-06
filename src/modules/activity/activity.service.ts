import { ConflictException, Injectable } from "@nestjs/common";
import { LogSource, MediaType, Prisma } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { stripHtmlTags } from "../../infrastructure/security/sanitize-string";

export interface FindActivityFilters {
  dateFrom?: Date;
  dateTo?: Date;
  dateBefore?: Date;
  type?: MediaType;
}

export interface CreateActivityData {
  mediaItemId: string;
  loggedAt: Date;
  duration?: number;
  description?: string;
  platform?: string;
  playerCount?: number;
  won?: boolean;
}

export interface PaginatedActivities {
  data: ActivityEntryWithMedia[];
  total: number;
}

export type ActivityEntryWithMedia = Prisma.LogEntryGetPayload<{
  include: { mediaItem: { include: { parent: true } } };
}>;

export interface MusicActivityGroup {
  trackCount: number;
  totalDuration: number;
  entries: ActivityEntryWithMedia[];
}

export interface ActivityDayGroup {
  date: string;
  entries: ActivityEntryWithMedia[];
  musicGroup?: MusicActivityGroup;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) { }

  async create(
    data: CreateActivityData,
    userId: string,
    source: LogSource,
  ): Promise<ActivityEntryWithMedia> {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.logEntry.findFirst({
        where: {
          userId,
          mediaItemId: data.mediaItemId,
          loggedAt: data.loggedAt,
        },
      });

      if (duplicate) {
        throw new ConflictException("An activity entry already exists at this time");
      }

      return transaction.logEntry.create({
        data: {
          ...data,
          description: data.description ? stripHtmlTags(data.description) : undefined,
          platform: data.platform ? stripHtmlTags(data.platform) : undefined,
          userId,
          source,
        },
        include: { mediaItem: { include: { parent: true } } },
      });
    });
  }

  findByUser(
    userId: string,
    filters: FindActivityFilters = {},
  ): Promise<ActivityEntryWithMedia[]> {
    return this.prisma.logEntry.findMany({
      where: {
        userId,
        loggedAt: {
          gte: filters.dateFrom,
          lte: filters.dateTo,
          lt: filters.dateBefore,
        },
        mediaItem: filters.type ? { type: filters.type } : undefined,
      },
      include: { mediaItem: { include: { parent: true } } },
      orderBy: { loggedAt: "desc" },
    });
  }

  async findByUserPaginated(
    userId: string,
    filters: FindActivityFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedActivities> {
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

  async findByUserAndMediaItemPaginated(
    userId: string,
    mediaItemId: string,
    includeChildEpisodes: boolean,
    filters: Omit<FindActivityFilters, "type">,
    page: number,
    limit: number,
  ): Promise<PaginatedActivities> {
    const where: Prisma.LogEntryWhereInput = {
      userId,
      loggedAt: {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      },
      mediaItem: includeChildEpisodes
        ? { OR: [{ id: mediaItemId }, { parentId: mediaItemId }] }
        : { id: mediaItemId },
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

  groupByDay(entries: ActivityEntryWithMedia[]): ActivityDayGroup[] {
    const groups = new Map<string, ActivityDayGroup>();

    for (const entry of entries) {
      const date = ActivityService.toLocalDateKey(entry.loggedAt);
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
