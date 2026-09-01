import { MediaType } from "@prisma/client";
import { AniListProvider } from "./anilist.provider";
import { BggProvider } from "./bgg.provider";
import { IgdbProvider } from "./igdb.provider";
import { MusicBrainzProvider } from "./musicbrainz.provider";
import { TmdbProvider } from "./tmdb.provider";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("metadata providers", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("TmdbProvider", () => {
    it("normalizes TV search results and image URLs", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          results: [
            {
              id: 87108,
              name: "Severance",
              first_air_date: "2022-02-18",
              poster_path: "/poster.jpg",
              overview: "A workplace mystery.",
            },
          ],
        }),
      );

      const results = await new TmdbProvider(MediaType.TV_SHOW).search(
        "Severance",
        "key",
      );

      expect(results[0]).toEqual({
        externalId: "tv:87108",
        title: "Severance",
        year: 2022,
        imageUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
        description: "A workplace mystery.",
        duration: undefined,
        type: MediaType.TV_SHOW,
      });
      expect(String(fetchMock.mock.calls[0][0])).toContain("/search/tv");
    });

    it("turns an unauthorized response into a descriptive error", async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 401));
      await expect(
        new TmdbProvider(MediaType.TV_SHOW).search("Severance", "bad"),
      ).rejects.toThrow("Invalid TMDB API key");
    });
  });

  describe("AniListProvider", () => {
    it("uses preferred titles and creates synthetic episodes", async () => {
      const media = {
        id: 16498,
        title: { english: "Attack on Titan", romaji: "Shingeki no Kyojin" },
        startDate: { year: 2013 },
        coverImage: { large: "https://example.com/cover.jpg" },
        description: "<b>Humanity</b> fights back.",
        episodes: 2,
        averageEpisodeDuration: 1_440,
      };
      fetchMock.mockImplementation(async () =>
        jsonResponse({ data: { Media: media } }),
      );
      const provider = new AniListProvider();

      await expect(provider.getById("anilist:16498")).resolves.toMatchObject({
        externalId: "anilist:16498",
        title: "Attack on Titan",
        description: "Humanity fights back.",
        type: MediaType.TV_SHOW,
      });
      await expect(provider.getEpisodes("anilist:16498")).resolves.toEqual([
        { seasonNumber: 1, episodeNumber: 1, title: "Episode 1", duration: 24 },
        { seasonNumber: 1, episodeNumber: 2, title: "Episode 2", duration: 24 },
      ]);
    });
  });

  describe("IgdbProvider", () => {
    it("fetches one token and reuses it for subsequent requests", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ access_token: "token", expires_in: 3_600 }),
        )
        .mockImplementation(async () =>
          jsonResponse([
            {
              id: 100,
              name: "The Last of Us",
              cover: { url: "//images.igdb.com/cover.jpg" },
              first_release_date: 1_364_774_400,
            },
          ]),
        );
      const credentials = JSON.stringify({
        clientId: "client",
        clientSecret: "secret",
      });
      const provider = new IgdbProvider();

      await provider.search("The Last of Us", credentials);
      const secondResults = await provider.search("The Last of Us", credentials);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(secondResults[0].imageUrl).toBe(
        "https://images.igdb.com/cover.jpg",
      );
    });

    it("requires configured credentials", async () => {
      await expect(new IgdbProvider().search("Halo")).rejects.toThrow(
        "IGDB API key not configured",
      );
    });
  });

  describe("BggProvider", () => {
    it("parses XML and decodes the board game description", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          '<items><item id="13"><name type="primary" sortindex="1" value="Catan"/><yearpublished value="1995"/><description>Trade &amp;amp; build</description><image>https://example.com/catan.jpg</image><playingtime value="90"/></item></items>',
        ),
      );

      await expect(new BggProvider().getById("bgg:13", "bgg-key")).resolves.toEqual({
        externalId: "bgg:13",
        title: "Catan",
        year: 1995,
        imageUrl: "https://example.com/catan.jpg",
        description: "Trade & build",
        duration: 90,
        type: MediaType.BOARD_GAME,
      });
      expect(fetchMock.mock.calls[0][1]).toEqual({
        headers: { Authorization: "Bearer bgg-key" },
      });
    });

    it("retries one queued thing request", async () => {
      jest.useFakeTimers();
      fetchMock
        .mockResolvedValueOnce(new Response("", { status: 202 }))
        .mockResolvedValueOnce(
          new Response(
            '<items><item id="13"><name sortindex="1" value="Catan"/></item></items>',
          ),
        );

      const result = new BggProvider().getById("bgg:13", "bgg-key");
      await jest.advanceTimersByTimeAsync(1_000);

      await expect(result).resolves.toMatchObject({ title: "Catan" });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("requires a configured API key", async () => {
      await expect(new BggProvider().search("Catan")).rejects.toThrow(
        "BoardGameGeek API key not configured",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("turns an unauthorized response into an actionable error", async () => {
      fetchMock.mockResolvedValue(new Response("", { status: 401 }));

      await expect(new BggProvider().search("Catan", "bad-key")).rejects.toThrow(
        "BoardGameGeek API key was rejected",
      );
    });
  });

  describe("MusicBrainzProvider", () => {
    it("maps recordings, sets User-Agent, and throttles requests", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-08-28T00:00:00Z"));
      fetchMock.mockImplementation(async () =>
        jsonResponse({
          recordings: [
            {
              id: "mbid",
              title: "Bohemian Rhapsody",
              length: 354_000,
              "artist-credit": [{ artist: { name: "Queen" } }],
              releases: [{ date: "1975-10-31" }],
            },
          ],
        }),
      );
      const provider = new MusicBrainzProvider();

      const first = provider.search("Bohemian Rhapsody");
      await jest.advanceTimersByTimeAsync(0);
      await expect(first).resolves.toMatchObject([
        { duration: 6, description: "Queen", year: 1975 },
      ]);
      const second = provider.search("Bohemian Rhapsody");
      await jest.advanceTimersByTimeAsync(999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await second;

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][1]).toEqual({
        headers: { "User-Agent": "STrackerr/1.0 (https://github.com/strackrr)" },
      });
    });
  });
});
