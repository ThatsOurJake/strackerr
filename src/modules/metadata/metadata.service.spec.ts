import { MediaType } from "@prisma/client";
import { UsersService } from "../users/users.service";
import { AniListProvider } from "./anilist.provider";
import { BggProvider } from "./bgg.provider";
import { IgdbProvider } from "./igdb.provider";
import { MetadataService } from "./metadata.service";
import { IMetadataProvider } from "./metadata-provider.interface";
import { MusicBrainzProvider } from "./musicbrainz.provider";
import { TmdbProvider } from "./tmdb.provider";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

const provider = (name: IMetadataProvider["name"]): IMetadataProvider => ({
  name,
  search: jest.fn(),
  getById: jest.fn(),
});

describe("MetadataService", () => {
  const tmdbMovie = provider("tmdb");
  const tmdbTv = provider("tmdb") as TmdbProvider;
  const anilist = provider("anilist") as AniListProvider;
  const igdb = provider("igdb") as IgdbProvider;
  const bgg = provider("bgg") as BggProvider;
  const musicbrainz = provider("musicbrainz") as MusicBrainzProvider;
  const usersService = {
    getSetting: jest.fn(),
    getDecryptedKey: jest.fn(),
  } as unknown as UsersService;
  let service: MetadataService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MetadataService(
      tmdbMovie,
      tmdbTv,
      anilist,
      igdb,
      bgg,
      musicbrainz,
      usersService,
    );
  });

  it("returns the compatible default provider for each media type", () => {
    expect(service.getProvider(MediaType.MOVIE)).toBe(tmdbMovie);
    expect(service.getProvider(MediaType.TV_SHOW)).toBe(tmdbTv);
    expect(service.getProvider(MediaType.GAME)).toBe(igdb);
    expect(service.getProvider(MediaType.BOARD_GAME)).toBe(bgg);
    expect(service.getProvider(MediaType.MUSIC_TRACK)).toBe(musicbrainz);
  });

  it("uses the saved anime provider and resolves no BYOK key", async () => {
    jest.spyOn(usersService, "getSetting").mockResolvedValue("anilist");
    jest.spyOn(usersService, "getDecryptedKey").mockResolvedValue(null);

    await expect(
      service.getProviderForUser(MediaType.TV_SHOW, "user-1", { anime: true }),
    ).resolves.toEqual({ provider: anilist, apiKey: undefined });
    expect(usersService.getSetting).toHaveBeenCalledWith(
      "user-1",
      "metadata-provider:TV_SHOW:anime",
    );
    expect(usersService.getDecryptedKey).not.toHaveBeenCalled();
  });

  it("keeps regular TV on its separate TMDB preference", () => {
    expect(service.getProviderOptions(MediaType.TV_SHOW)).toEqual([
      { name: "tmdb", label: "TMDB" },
    ]);
    expect(service.getProviderOptions(MediaType.TV_SHOW, true)).toEqual([
      { name: "anilist", label: "AniList" },
      { name: "tmdb", label: "TMDB" },
    ]);
  });

  it("allows TMDB to override the default AniList anime provider", async () => {
    jest.spyOn(usersService, "getSetting").mockResolvedValue("tmdb");
    jest.spyOn(usersService, "getDecryptedKey").mockResolvedValue("tmdb-key");

    await expect(
      service.getProviderForUser(MediaType.TV_SHOW, "user-1", { anime: true }),
    ).resolves.toEqual({ provider: tmdbTv, apiKey: "tmdb-key" });
  });

  it("returns a decrypted BYOK key with the selected provider", async () => {
    jest.spyOn(usersService, "getSetting").mockResolvedValue(undefined);
    jest.spyOn(usersService, "getDecryptedKey").mockResolvedValue("secret");

    await expect(
      service.getProviderForUser(MediaType.MOVIE, "user-1"),
    ).resolves.toEqual({ provider: tmdbMovie, apiKey: "secret" });
    expect(usersService.getDecryptedKey).toHaveBeenCalledWith("user-1", "tmdb");
  });

  it("returns the decrypted BoardGameGeek API key", async () => {
    jest.spyOn(usersService, "getSetting").mockResolvedValue(undefined);
    jest.spyOn(usersService, "getDecryptedKey").mockResolvedValue("bgg-key");

    await expect(
      service.getProviderForUser(MediaType.BOARD_GAME, "user-1"),
    ).resolves.toEqual({ provider: bgg, apiKey: "bgg-key" });
    expect(usersService.getDecryptedKey).toHaveBeenCalledWith("user-1", "bgg");
  });

  it("rejects a provider that is incompatible with the media type", () => {
    expect(() => service.getProvider(MediaType.GAME, "tmdb")).toThrow(
      "does not support GAME",
    );
  });
});
