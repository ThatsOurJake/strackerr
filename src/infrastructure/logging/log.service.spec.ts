import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  type LogEntry,
  LogSource,
  MediaType,
  type Prisma,
} from "@prisma/client";
import type { PrismaService } from "../database/prisma.service";
import { Events } from "../events/event-names";
import { LogService } from "./log.service";

type LogEntryWithMediaItem = Prisma.LogEntryGetPayload<{
  include: { mediaItem: true };
}>;

const movie = { type: MediaType.MOVIE, duration: 120 };
const game = { type: MediaType.GAME, duration: null };
const show = { type: MediaType.TV_SHOW, duration: null };
const music = { type: MediaType.MUSIC_TRACK, duration: null };

interface LogPrismaMock {
  mediaItem: { findUnique: jest.Mock };
  logEntry: {
    findFirst: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    delete: jest.Mock;
  };
}

const createPrismaMock = (): LogPrismaMock => ({
  mediaItem: { findUnique: jest.fn() },
  logEntry: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
});

const createService = (
  prisma: LogPrismaMock,
  events: EventEmitter2,
): LogService => new LogService(prisma as unknown as PrismaService, events);

const createEntry = (
  id: string,
  loggedAt: string,
  media: { type: MediaType },
  duration: number | null = null,
): LogEntryWithMediaItem => ({
  id,
  userId: "user-1",
  mediaItemId: `media-${id}`,
  loggedAt: new Date(loggedAt),
  duration,
  platform: null,
  playerCount: null,
  won: null,
  source: LogSource.MANUAL,
  createdAt: new Date(loggedAt),
  mediaItem: {
    id: `media-${id}`,
    type: media.type,
    title: id,
    sortTitle: id,
    isSkeleton: false,
    createdByUserId: null,
    parentId: null,
    seasonNumber: null,
    episodeNumber: null,
    description: null,
    imageUrl: null,
    imageSourceUrl: null,
    year: null,
    duration: media.type === MediaType.MOVIE ? 120 : null,
    createdAt: new Date(loggedAt),
    updatedAt: new Date(loggedAt),
  },
});

describe("LogService", () => {
  it("rejects games without a platform or duration", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findUnique.mockResolvedValue(game);
    const service = createService(prisma, new EventEmitter2());

    await expect(
      service.create(
        { mediaItemId: "game-1", loggedAt: new Date(), platform: "" },
        "user-1",
        LogSource.MANUAL,
      ),
    ).rejects.toThrow("Games require duration and platform");
  });

  it("rejects a TV show when a TV episode is requested", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findUnique.mockResolvedValue(show);
    const service = createService(prisma, new EventEmitter2());

    await expect(
      service.create(
        {
          mediaItemId: "show-1",
          loggedAt: new Date(),
          type: MediaType.TV_EPISODE,
        },
        "user-1",
        LogSource.MANUAL,
      ),
    ).rejects.toThrow("Media item must be a TV episode");
  });

  it("rejects API duplicates by user, media item, and day", async () => {
    const prisma = createPrismaMock();
    prisma.mediaItem.findUnique.mockResolvedValue(movie);
    prisma.logEntry.findFirst.mockResolvedValue({ id: "existing" });
    const service = createService(prisma, new EventEmitter2());

    await expect(
      service.create(
        { mediaItemId: "movie-1", loggedAt: new Date("2026-08-23T18:00:00Z") },
        "user-1",
        LogSource.API,
      ),
    ).rejects.toThrow("Log entry already exists for this day");
    expect(prisma.logEntry.create).not.toHaveBeenCalled();
  });

  it("allows manual duplicates and defaults duration from media metadata", async () => {
    const prisma = createPrismaMock();
    const entry = createEntry("entry-1", "2026-08-23T18:00:00Z", movie, 120);
    prisma.mediaItem.findUnique.mockResolvedValue(movie);
    prisma.logEntry.create.mockResolvedValue(entry);
    const events = { emit: jest.fn() } as unknown as EventEmitter2;
    const service = createService(prisma, events);

    await service.create(
      { mediaItemId: "movie-1", loggedAt: new Date("2026-08-23T18:00:00Z") },
      "user-1",
      LogSource.MANUAL,
    );

    expect(prisma.logEntry.findFirst).not.toHaveBeenCalled();
    expect(prisma.logEntry.create).toHaveBeenCalledWith({
      data: {
        mediaItemId: "movie-1",
        loggedAt: new Date("2026-08-23T18:00:00Z"),
        userId: "user-1",
        source: LogSource.MANUAL,
        duration: 120,
      },
    });
    expect(events.emit).toHaveBeenCalledWith(Events.LOG_ENTRY_CHANGED, {
      userId: "user-1",
    });
  });

  it("applies date and type filters", async () => {
    const prisma = createPrismaMock();
    prisma.logEntry.findMany.mockResolvedValue([]);
    const service = createService(prisma, new EventEmitter2());
    const dateFrom = new Date("2026-08-01T00:00:00Z");
    const dateTo = new Date("2026-08-31T23:59:59Z");

    await service.findByUser("user-1", {
      dateFrom,
      dateTo,
      type: MediaType.MOVIE,
      skip: 10,
      take: 5,
    });

    expect(prisma.logEntry.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        loggedAt: { gte: dateFrom, lte: dateTo },
        mediaItem: { type: MediaType.MOVIE },
      },
      include: { mediaItem: true },
      orderBy: { loggedAt: "desc" },
      skip: 10,
      take: 5,
    });
  });

  it("groups music entries by day", () => {
    const prisma = createPrismaMock();
    const service = createService(prisma, new EventEmitter2());
    const entries = [
      createEntry("movie-1", "2026-08-23T10:00:00Z", movie, 120),
      createEntry("track-1", "2026-08-23T11:00:00Z", music, 4),
      createEntry("track-2", "2026-08-23T12:00:00Z", music, 5),
    ];

    const groups = service.groupByDay(entries);

    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(1);
    expect(groups[0].musicGroup).toMatchObject({
      trackCount: 2,
      totalDuration: 9,
    });
  });

  it("emits a change event after deleting an entry", async () => {
    const prisma = createPrismaMock();
    const entry = {} as LogEntry;
    prisma.logEntry.delete.mockResolvedValue(entry);
    const events = { emit: jest.fn() } as unknown as EventEmitter2;
    const service = createService(prisma, events);

    await expect(service.delete("entry-1", "user-1")).resolves.toBe(entry);
    expect(events.emit).toHaveBeenCalledWith(Events.LOG_ENTRY_CHANGED, {
      userId: "user-1",
    });
  });
});
