import { MediaType } from "@prisma/client";
import { createLogEntry } from "../test-utils/log-entry.factory";
import {
  formatDuration,
  mediaTypeDetails,
  toDayViewModels,
  toEntryViewModel,
} from "./activity-view-model";


describe("activity view model", () => {
  describe("formatDuration", () => {
    it.each([
      [0, "0m"],
      [45, "45m"],
      [60, "1h"],
      [125, "2h 5m"],
    ])("formats %i minutes as %s", (minutes, expected) => {
      expect(formatDuration(minutes)).toBe(expected);
    });
  });

  it.each([
    [MediaType.MOVIE, "Movie", "film", "movie"],
    [MediaType.TV_SHOW, "TV show", "tv-2", "tv"],
    [MediaType.TV_EPISODE, "TV episode", "tv-2", "tv"],
    [MediaType.GAME, "Game", "gamepad-2", "game"],
    [MediaType.BOARD_GAME, "Board game", "dice-5", "boardgame"],
    [MediaType.MUSIC_TRACK, "Music", "music", "music"],
  ])("provides display details for %s", (type, label, icon, accent) => {
    expect(mediaTypeDetails(type)).toMatchObject({ label, icon, accent });
  });

  it("maps a TV episode to its parent show and episode subtitle", () => {
    const entry = createLogEntry("episode", MediaType.TV_EPISODE, {
      duration: 47,
      title: "International Assassin",
      parentTitle: "The Leftovers",
      seasonNumber: 2,
      episodeNumber: 8,
      imageUrl: "/images/episode.jpg",
    });

    expect(toEntryViewModel(entry)).toEqual({
      id: "media-episode",
      title: "The Leftovers",
      subtitle: "S02E08 - International Assassin",
      imageUrl: "/images/episode.jpg",
      duration: "47m",
      playerCount: null,
      wonLabel: null,
      platform: null,
      label: "TV episode",
      icon: "tv-2",
      accent: "tv",
      path: "tv",
      detailUrl: "/collection/tv/media-episode",
    });
  });

  it("uses the game platform as its subtitle", () => {
    const model = toEntryViewModel(createLogEntry("game", MediaType.GAME, {
      duration: 90,
      platform: "Steam Deck",
    }));

    expect(model).toMatchObject({
      subtitle: "Steam Deck",
      platform: "Steam Deck",
      duration: "1h 30m",
      detailUrl: "/collection/game/media-game",
    });
  });

  it.each([
    [true, "Won"],
    [false, "Lost"],
    [null, null],
  ])("maps board-game result %s to %s", (won, wonLabel) => {
    const model = toEntryViewModel(createLogEntry("board-game", MediaType.BOARD_GAME, {
      won,
      playerCount: 4,
    }));

    expect(model).toMatchObject({ wonLabel, playerCount: 4 });
  });

  it("maps day headings, combined totals, entries, and music groups", () => {
    const movie = createLogEntry("movie", MediaType.MOVIE, { duration: 120 });
    const game = createLogEntry("game", MediaType.GAME, { duration: 35 });
    const track = createLogEntry("track", MediaType.MUSIC_TRACK, { duration: 5 });

    const days = toDayViewModels([{
      date: "2026-08-24",
      entries: [movie, game],
      musicGroup: {
        trackCount: 2,
        totalDuration: 10,
        entries: [track],
      },
    }]);

    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({
      date: "2026-08-24",
      heading: "Monday, 24 August 2026",
      totalDuration: "2h 45m",
      musicGroup: { trackCount: 2, totalDuration: "10m" },
    });
    expect(days[0].entries).toHaveLength(2);
  });

  it("uses zero duration and no music group when values are absent", () => {
    const entry = createLogEntry("movie", MediaType.MOVIE);

    const [day] = toDayViewModels([{
      date: "2026-08-24",
      entries: [entry],
    }]);

    expect(day.totalDuration).toBe("0m");
    expect(day.entries[0].duration).toBe("0m");
    expect(day.musicGroup).toBeNull();
  });
});
