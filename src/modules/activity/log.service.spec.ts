import { MediaType } from "@prisma/client";
import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { createLogEntry } from "../../test-utils/log-entry.factory";
import { LogService } from "./log.service";

describe("LogService", () => {
  let findMany: jest.Mock;
  let service: LogService;

  beforeEach(() => {
    findMany = jest.fn();
    service = new LogService({ logEntry: { findMany } } as unknown as PrismaService);
  });

  it("scopes retrieval to the requested user and filters", async () => {
    findMany.mockResolvedValue([]);
    const dateFrom = new Date(2026, 7, 1);
    const dateTo = new Date(2026, 7, 31, 23, 59, 59, 999);

    await service.findByUser("user-2", {
      dateFrom,
      dateTo,
      type: MediaType.GAME,
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-2",
        loggedAt: { gte: dateFrom, lte: dateTo },
        mediaItem: { type: MediaType.GAME },
      },
      include: { mediaItem: { include: { parent: true } } },
      orderBy: { loggedAt: "desc" },
    });
  });

  it("groups entries by local calendar day and collapses music", () => {
    const entries = [
      createLogEntry("movie", MediaType.MOVIE, { loggedAt: new Date(2026, 7, 24, 23, 45), duration: 120 }),
      createLogEntry("track-1", MediaType.MUSIC_TRACK, { loggedAt: new Date(2026, 7, 24, 8), duration: 4 }),
      createLogEntry("track-2", MediaType.MUSIC_TRACK, { loggedAt: new Date(2026, 7, 24, 7), duration: null }),
      createLogEntry("game", MediaType.GAME, { loggedAt: new Date(2026, 7, 23, 22), duration: 60 }),
    ];

    const groups = service.groupByDay(entries);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      date: "2026-08-24",
      entries: [entries[0]],
      musicGroup: {
        trackCount: 2,
        totalDuration: 4,
        entries: [entries[1], entries[2]],
      },
    });
    expect(groups[1]).toMatchObject({
      date: "2026-08-23",
      entries: [entries[3]],
    });
  });
});
