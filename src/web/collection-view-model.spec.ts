import { MediaType } from "@prisma/client";
import type { MediaDetail } from "../modules/collection/collection.service";
import {
  toCollectionViewModel,
  toItemEditViewModel,
  toMediaDetailViewModel,
} from "./collection-view-model";

describe("collection view models", () => {
  it("preserves additive filters in type, letter, and pagination URLs", () => {
    const model = toCollectionViewModel({
      items: [],
      availableLetters: new Set(["O"]),
      page: 2,
      totalPages: 3,
      totalItems: 100,
    }, {
      type: MediaType.TV_SHOW,
      unidentified: true,
      letter: "O",
      page: 2,
    });

    expect(model.typeFilters.find((filter) => filter.slug === "game")?.url)
      .toBe("/collection?type=game&filter=unidentified&letter=O");
    expect(model.letters.find((letter) => letter.label === "O")).toMatchObject({
      active: true,
      enabled: true,
    });
    expect(model.next?.url)
      .toBe("/collection?type=tv&filter=unidentified&letter=O&page=3");
  });

  it("counts unique watched episodes and totals only the current user's episode logs", () => {
    const detail = {
      id: "show-1",
      type: MediaType.TV_SHOW,
      title: "The Show",
      description: "Description",
      imageUrl: null,
      logEntries: [],
      episodes: [
        {
          id: "episode-1",
          seasonNumber: 1,
          episodeNumber: 1,
          title: "Pilot",
          logEntries: [{ duration: 45 }, { duration: 40 }],
        },
        {
          id: "episode-2",
          seasonNumber: 1,
          episodeNumber: 2,
          title: "Second",
          logEntries: [],
        },
      ],
    } as unknown as MediaDetail;

    const model = toMediaDetailViewModel(detail);

    expect(model.episodesWatched).toBe(1);
    expect(model.episodeDuration).toBe("1h 25m");
    expect(model.seasons[0].episodes).toEqual([
      expect.objectContaining({ id: "episode-1", watchCount: 2, totalDuration: "1h 25m", watched: true }),
      expect.objectContaining({ id: "episode-2", watchCount: 0, totalDuration: "0m", watched: false }),
    ]);
  });

  it("exposes identify for skeletons and refetch for identified items", () => {
    const skeleton = {
      id: "movie-1",
      type: MediaType.MOVIE,
      title: "Unknown movie",
      isSkeleton: true,
      description: null,
      imageUrl: null,
      externalIds: [],
      logEntries: [],
      episodes: [],
    } as unknown as MediaDetail;
    const identified = {
      ...skeleton,
      isSkeleton: false,
      externalIds: [{ provider: "tmdb", externalId: "movie:1" }],
    } as unknown as MediaDetail;

    expect(toMediaDetailViewModel(skeleton).identifyUrl)
      .toBe("/collection/movie/movie-1/identify");
    expect(toMediaDetailViewModel(identified).identifyUrl).toBeNull();
    expect(toMediaDetailViewModel(identified).refetchUrl).toBe("/collection/movie/movie-1/identify/refetch");
  });

  it("uses the latest session description as music header artist fallback", () => {
    const detail = {
      id: "track-1",
      type: MediaType.MUSIC_TRACK,
      title: "The Chain",
      description: null,
      isSkeleton: true,
      imageUrl: null,
      externalIds: [],
      logEntries: [
        {
          id: "log-2",
          loggedAt: new Date("2026-09-03T00:00:00Z"),
          duration: 4,
          description: "Fleetwood Mac",
        },
        {
          id: "log-1",
          loggedAt: new Date("2026-09-01T00:00:00Z"),
          duration: 4,
          description: "",
        },
      ],
      episodes: [],
    } as unknown as MediaDetail;

    const model = toMediaDetailViewModel(detail);

    expect(model.artist).toBe("Fleetwood Mac");
    expect(model.description).toBeNull();
  });

  it("builds edit view rows for history and aliases with selected removals", () => {
    const detail = {
      id: "show-1",
      type: MediaType.TV_SHOW,
      title: "The Show",
      description: "Description",
      imageUrl: null,
      externalAliases: [
        {
          id: "alias-1",
          mediaItemId: "show-1",
          providerNamespace: "tmdb",
          externalId: "123",
          createdAt: new Date("2026-09-01T00:00:00Z"),
        },
      ],
      logEntries: [
        {
          id: "log-1",
          loggedAt: new Date("2026-09-02T00:00:00Z"),
          duration: 50,
        },
      ],
      episodes: [
        {
          id: "episode-1",
          seasonNumber: 1,
          episodeNumber: 1,
          title: "Pilot",
          logEntries: [{ id: "log-2", loggedAt: new Date("2026-09-03T00:00:00Z"), duration: 40 }],
        },
      ],
    } as unknown as MediaDetail;

    const model = toItemEditViewModel(detail, {
      title: "Edited Show",
      description: "Updated",
      removeLogEntryIds: ["log-2"],
      aliases: [
        {
          rowKey: "alias-1",
          id: "alias-1",
          providerNamespace: "tmdb",
          externalId: "123",
          remove: true,
        },
      ],
    });

    expect(model.titleValue).toBe("Edited Show");
    expect(model.historyRows.length).toBe(2);
    expect(model.historyRows[0]).toMatchObject({ id: "log-2", selected: true });
    expect(model.selectedHistoryCount).toBe(1);
    expect(model.selectedAliasRemovalCount).toBe(1);
  });
});
