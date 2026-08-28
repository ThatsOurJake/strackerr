import type { Response } from "express";
import type { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { MetadataService } from "../../modules/metadata/metadata.service";
import type { UsersService } from "../../modules/users/users.service";
import { SettingsWebController } from "./settings.controller";

jest.mock("@paralleldrive/cuid2", () => ({
  createId: jest.fn(() => "mock-cuid-id"),
}));

const user: AuthenticatedUser = { userId: "user-1", username: "tester", isAdmin: false };
const providerKeys = [{ provider: "tmdb", configured: true }];

describe("SettingsWebController", () => {
  let usersService: {
    listProviderKeysForUser: jest.Mock;
    findById: jest.Mock;
    upsertMetadataKey: jest.Mock;
    deleteMetadataKey: jest.Mock;
    regenerateApiKey: jest.Mock;
    getSetting: jest.Mock;
    upsertSetting: jest.Mock;
  };
  let metadataService: {
    getProvider: jest.Mock;
    getProviderOptions: jest.Mock;
    getProviderSettingKey: jest.Mock;
  };
  let clearForUser: jest.Mock;
  let controller: SettingsWebController;
  let response: { render: jest.Mock };

  beforeEach(() => {
    usersService = {
      listProviderKeysForUser: jest.fn().mockResolvedValue(providerKeys),
      findById: jest.fn().mockResolvedValue({ username: "tester" }),
      upsertMetadataKey: jest.fn(),
      deleteMetadataKey: jest.fn(),
      regenerateApiKey: jest.fn(),
      getSetting: jest.fn().mockResolvedValue(undefined),
      upsertSetting: jest.fn(),
    };
    metadataService = {
      getProvider: jest.fn(),
      getProviderOptions: jest.fn((mediaType: string, anime = false) => {
        const providerByType: Record<string, string> = {
          MOVIE: "tmdb",
          TV_SHOW: "tmdb",
          GAME: "igdb",
          BOARD_GAME: "bgg",
          MUSIC_TRACK: "musicbrainz",
        };
        if (anime) {
          return [
            { name: "anilist", label: "AniList" },
            { name: "tmdb", label: "TMDB" },
          ];
        }
        const provider = providerByType[mediaType];
        return [{ name: provider, label: provider }];
      }),
      getProviderSettingKey: jest.fn(
        (mediaType: string, anime = false) =>
          `metadata-provider:${mediaType}${anime ? ":anime" : ""}`,
      ),
    };
    clearForUser = jest.fn();
    controller = new SettingsWebController(
      usersService as unknown as UsersService,
      { clearForUser } as unknown as AppCacheService,
      metadataService as unknown as MetadataService,
    );
    response = { render: jest.fn() };
  });

  it("renders user-scoped settings without exposing key values", async () => {
    await controller.getSettings(response as unknown as Response, user);

    expect(usersService.listProviderKeysForUser).toHaveBeenCalledWith("user-1");
    expect(usersService.findById).toHaveBeenCalledWith("user-1");
    expect(response.render).toHaveBeenCalledWith("settings", {
      title: "Settings",
      username: "tester",
      providerKeys,
      configuredProviders: ["tmdb"],
      providerPreferences: expect.arrayContaining([
        expect.objectContaining({
          field: "animeProvider",
          label: "TV Shows (Anime)",
          options: [
            expect.objectContaining({ name: "anilist", selected: true }),
            expect.objectContaining({ name: "tmdb", selected: false }),
          ],
        }),
      ]),
    });
  });

  it("validates and saves provider preferences for every media type", async () => {
    await controller.saveProviderPreferences(
      {
        movieProvider: "tmdb",
        tvShowProvider: "tmdb",
        animeProvider: "anilist",
        gameProvider: "igdb",
        boardGameProvider: "bgg",
        musicTrackProvider: "musicbrainz",
      },
      response as unknown as Response,
      user,
    );

    expect(metadataService.getProvider).toHaveBeenCalledTimes(6);
    expect(usersService.upsertSetting).toHaveBeenCalledTimes(6);
    expect(usersService.upsertSetting).toHaveBeenCalledWith(
      "user-1",
      "metadata-provider:TV_SHOW:anime",
      "anilist",
    );
    expect(response.render).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({
        success: "Metadata provider preferences saved",
      }),
    );
  });

  it("rejects an empty TMDB key", async () => {
    await controller.saveTmdbKey({ key: "  " }, response as unknown as Response, user);

    expect(usersService.upsertMetadataKey).not.toHaveBeenCalled();
    expect(response.render).toHaveBeenCalledWith("settings", expect.objectContaining({
      error: "TMDB API key is required",
    }));
  });

  it("trims and saves a TMDB key for the authenticated user", async () => {
    await controller.saveTmdbKey({ key: "  secret  " }, response as unknown as Response, user);

    expect(usersService.upsertMetadataKey).toHaveBeenCalledWith("user-1", "tmdb", "secret");
    expect(response.render).toHaveBeenCalledWith("settings", expect.objectContaining({
      success: "TMDB API key saved",
    }));
  });

  it("serializes trimmed IGDB credentials", async () => {
    await controller.saveIgdbCredentials(
      { clientId: " client ", clientSecret: " secret " },
      response as unknown as Response,
      user,
    );

    expect(usersService.upsertMetadataKey).toHaveBeenCalledWith(
      "user-1",
      "igdb",
      JSON.stringify({ clientId: "client", clientSecret: "secret" }),
    );
  });

  it("renders provider deletion failures", async () => {
    usersService.deleteMetadataKey.mockRejectedValue(new Error("failed"));

    await controller.deleteProviderKey("tmdb", response as unknown as Response, user);

    expect(usersService.deleteMetadataKey).toHaveBeenCalledWith("user-1", "tmdb");
    expect(response.render).toHaveBeenCalledWith("settings", expect.objectContaining({
      error: "Failed to delete provider key",
    }));
  });

  it("shows a newly regenerated API key once", async () => {
    usersService.regenerateApiKey.mockResolvedValue("new-key");

    await controller.regenerateApiKey(response as unknown as Response, user);

    expect(usersService.regenerateApiKey).toHaveBeenCalledWith("user-1");
    expect(response.render).toHaveBeenCalledWith("settings", expect.objectContaining({
      newApiKey: "new-key",
      success: expect.stringContaining("API key regenerated"),
    }));
  });

  it("clears only the authenticated user's cache", async () => {
    await controller.clearCache(response as unknown as Response, user);

    expect(clearForUser).toHaveBeenCalledWith("user-1");
    expect(response.render).toHaveBeenCalledWith("settings", expect.objectContaining({
      success: "All caches cleared",
    }));
  });
});
