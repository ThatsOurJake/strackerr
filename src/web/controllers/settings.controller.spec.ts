import type { Response } from "express";
import type { AppCacheService } from "../../infrastructure/cache/app-cache.service";
import type { ImageCleanupService } from "../../infrastructure/jobs/image-cleanup.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { MetadataService } from "../../modules/metadata/metadata.service";
import type { UsersService } from "../../modules/users/users.service";
import { SettingsWebController } from "./settings.controller";

jest.mock("@paralleldrive/cuid2", () => ({
  createId: jest.fn(() => "mock-cuid-id"),
}));

const user: AuthenticatedUser = {
  userId: "user-1",
  username: "tester",
  isAdmin: true,
};
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
    verifyPassword: jest.Mock;
    changePassword: jest.Mock;
  };
  let metadataService: {
    getProvider: jest.Mock;
    getProviderOptions: jest.Mock;
    getProviderSettingKey: jest.Mock;
  };
  let clearForUser: jest.Mock;
  let startCleanup: jest.Mock;
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
      verifyPassword: jest.fn().mockResolvedValue(true),
      changePassword: jest.fn(),
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
    startCleanup = jest.fn().mockReturnValue(true);
    controller = new SettingsWebController(
      usersService as unknown as UsersService,
      { clearForUser } as unknown as AppCacheService,
      metadataService as unknown as MetadataService,
      {
        startCleanup,
        getStatus: jest.fn().mockReturnValue({ state: "idle" }),
      } as unknown as ImageCleanupService,
    );
    response = { render: jest.fn() };
  });

  it("renders the requested tab without exposing credential values", async () => {
    await controller.getSettings(
      "providers",
      response as unknown as Response,
      user,
    );

    expect(usersService.listProviderKeysForUser).toHaveBeenCalledWith("user-1");
    expect(response.render).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({
        activeTab: "providers",
        username: "tester",
        providerCredentials: expect.arrayContaining([
          expect.objectContaining({ provider: "tmdb", configured: true }),
          expect.objectContaining({ provider: "bgg", configured: false }),
        ]),
      }),
    );
    expect(JSON.stringify(response.render.mock.calls[0])).not.toContain(
      "secret",
    );
  });

  it("falls back to the account tab for an unknown tab", async () => {
    await controller.getSettings(
      "unknown",
      response as unknown as Response,
      user,
    );

    expect(response.render).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({ activeTab: "account" }),
    );
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
  });

  it("trims and saves a BoardGameGeek key", async () => {
    await controller.saveBggKey(
      { key: " bgg-secret " },
      response as unknown as Response,
      user,
    );

    expect(usersService.upsertMetadataKey).toHaveBeenCalledWith(
      "user-1",
      "bgg",
      "bgg-secret",
    );
    expect(response.render).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({ success: "BoardGameGeek API key saved" }),
    );
  });

  it("requires explicit confirmation before removing credentials", async () => {
    await controller.deleteProviderKey(
      "tmdb",
      {},
      response as unknown as Response,
      user,
    );

    expect(usersService.deleteMetadataKey).not.toHaveBeenCalled();
    expect(response.render).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({
        error: "Confirm credential removal before continuing",
      }),
    );
  });

  it("removes a supported provider after confirmation", async () => {
    await controller.deleteProviderKey(
      "tmdb",
      { confirmRemoval: "yes" },
      response as unknown as Response,
      user,
    );

    expect(usersService.deleteMetadataKey).toHaveBeenCalledWith("user-1", "tmdb");
  });

  it("does not verify or change a mismatched new password", async () => {
    await controller.changePassword(
      {
        currentPassword: "current-password",
        newPassword: "new-password",
        confirmPassword: "different-password",
      },
      response as unknown as Response,
      user,
    );

    expect(usersService.verifyPassword).not.toHaveBeenCalled();
    expect(usersService.changePassword).not.toHaveBeenCalled();
    expect(response.render).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({
        passwordErrors: { confirmPassword: "New passwords do not match" },
      }),
    );
  });

  it("leaves the password unchanged when the current password is incorrect", async () => {
    usersService.verifyPassword.mockResolvedValue(false);

    await controller.changePassword(
      {
        currentPassword: "wrong-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      },
      response as unknown as Response,
      user,
    );

    expect(usersService.changePassword).not.toHaveBeenCalled();
    expect(response.render).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({
        passwordErrors: { currentPassword: "Current password is incorrect" },
      }),
    );
  });

  it("changes a valid password for the signed-in account", async () => {
    await controller.changePassword(
      {
        currentPassword: "current-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      },
      response as unknown as Response,
      user,
    );

    expect(usersService.verifyPassword).toHaveBeenCalledWith(
      "user-1",
      "current-password",
    );
    expect(usersService.changePassword).toHaveBeenCalledWith(
      "user-1",
      "new-password",
    );
  });

  it("clears only the authenticated user's cache", async () => {
    await controller.clearCache(response as unknown as Response, user);

    expect(clearForUser).toHaveBeenCalledWith("user-1");
  });

  it("starts unused image cleanup without awaiting the job", async () => {
    await controller.cleanupImages(response as unknown as Response, user);

    expect(startCleanup).toHaveBeenCalledTimes(1);
    expect(response.render).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({ success: "Unused image cleanup started" }),
    );
  });

  it("reports when image cleanup is already running", async () => {
    startCleanup.mockReturnValue(false);

    await controller.cleanupImages(response as unknown as Response, user);

    expect(response.render).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({
        error: "Unused image cleanup is already running",
      }),
    );
  });
});
