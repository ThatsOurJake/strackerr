import { MediaType } from "@prisma/client";
import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { createActivityEntry } from "../../test-utils/activity-entry.factory";
import { ActivityService } from "./activity.service";

describe("ActivityService", () => {
  let findMany: jest.Mock;
  let service: ActivityService;

  beforeEach(() => {
    findMany = jest.fn();
    service = new ActivityService({ logEntry: { findMany } } as unknown as PrismaService);
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
      createActivityEntry("movie", MediaType.MOVIE, { loggedAt: new Date(2026, 7, 24, 23, 45), duration: 120 }),
      createActivityEntry("track-1", MediaType.MUSIC_TRACK, { loggedAt: new Date(2026, 7, 24, 8), duration: 4 }),
      createActivityEntry("track-2", MediaType.MUSIC_TRACK, { loggedAt: new Date(2026, 7, 24, 7), duration: null }),
      createActivityEntry("game", MediaType.GAME, { loggedAt: new Date(2026, 7, 23, 22), duration: 60 }),
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
