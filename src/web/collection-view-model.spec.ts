import { MediaType } from "@prisma/client";
import type { MediaDetail } from "../modules/collection/collection.service";
import { toCollectionViewModel, toMediaDetailViewModel } from "./collection-view-model";

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

  it("exposes identify for skeletons and reidentify for identified items", () => {
    const skeleton = {
      id: "movie-1",
      type: MediaType.MOVIE,
      title: "Unknown movie",
      isSkeleton: true,
      description: null,
      imageUrl: null,
      logEntries: [],
      episodes: [],
    } as unknown as MediaDetail;
    const identified = { ...skeleton, isSkeleton: false } as MediaDetail;

    expect(toMediaDetailViewModel(skeleton).identifyUrl)
      .toBe("/collection/movie/movie-1/identify");
    expect(toMediaDetailViewModel(skeleton).identifyActionLabel).toBe("Identify");
    expect(toMediaDetailViewModel(identified).identifyUrl).toBe("/collection/movie/movie-1/identify");
    expect(toMediaDetailViewModel(identified).identifyActionLabel).toBe("Reidentify");
  });
});
