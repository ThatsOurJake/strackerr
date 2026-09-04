import { MediaType } from "@prisma/client";
import type { MetadataService } from "../../modules/metadata/metadata.service";
import type { MetadataProviderName } from "../../modules/metadata/metadata-provider.interface";
import type { UsersService } from "../../modules/users/users.service";

export interface SaveTmdbKeyBody {
  key: string;
}

export interface SaveIgdbCredentialsBody {
  clientId: string;
  clientSecret: string;
}

export interface SaveBggKeyBody {
  key: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RemoveProviderBody {
  confirmRemoval?: string;
}

export interface SaveProviderPreferencesBody {
  movieProvider?: string;
  tvShowProvider?: string;
  animeProvider?: string;
  gameProvider?: string;
  boardGameProvider?: string;
  musicTrackProvider?: string;
}

export interface SettingsFeedback {
  success?: string;
  error?: string;
  passwordErrors?: Record<string, string>;
  newApiKey?: string;
}

export interface ProviderPreferenceField {
  field: keyof SaveProviderPreferencesBody;
  mediaType: MediaType;
  label: string;
  anime?: boolean;
}

export interface ProviderCredential {
  provider: string;
  label: string;
  credentialLabel: string;
}

export const PROVIDER_PREFERENCE_FIELDS: ProviderPreferenceField[] = [
  { field: "movieProvider", mediaType: MediaType.MOVIE, label: "Movies" },
  { field: "tvShowProvider", mediaType: MediaType.TV_SHOW, label: "TV Shows" },
  {
    field: "animeProvider",
    mediaType: MediaType.TV_SHOW,
    label: "TV Shows (Anime)",
    anime: true,
  },
  { field: "gameProvider", mediaType: MediaType.GAME, label: "Games" },
  {
    field: "boardGameProvider",
    mediaType: MediaType.BOARD_GAME,
    label: "Board Games",
  },
  {
    field: "musicTrackProvider",
    mediaType: MediaType.MUSIC_TRACK,
    label: "Music Tracks",
  },
];

export const PROVIDER_CREDENTIALS: ProviderCredential[] = [
  { provider: "tmdb", label: "TMDB", credentialLabel: "API key" },
  {
    provider: "igdb",
    label: "IGDB",
    credentialLabel: "Twitch client credentials",
  },
  {
    provider: "bgg",
    label: "BoardGameGeek",
    credentialLabel: "API key",
  },
];

export const SETTINGS_TABS = ["account", "providers", "maintenance"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const normalizeSettingsTab = (tab?: string): SettingsTab => {
  return SETTINGS_TABS.includes(tab as SettingsTab)
    ? (tab as SettingsTab)
    : "account";
};

export const validateProviderName = (
  provider: string,
): provider is MetadataProviderName => {
  return PROVIDER_CREDENTIALS.some((item) => item.provider === provider);
};

export const buildPasswordErrors = (
  body: ChangePasswordBody,
): Record<string, string> => {
  const passwordErrors: Record<string, string> = {};

  if (!body.currentPassword) {
    passwordErrors.currentPassword = "Current password is required";
  }
  if (!body.newPassword || body.newPassword.length < 8) {
    passwordErrors.newPassword = "New password must be at least 8 characters";
  }
  if (body.newPassword !== body.confirmPassword) {
    passwordErrors.confirmPassword = "New passwords do not match";
  }

  return passwordErrors;
};

export const getProviderPreferences = async (
  usersService: UsersService,
  metadataService: MetadataService,
  userId: string,
) => {
  return Promise.all(
    PROVIDER_PREFERENCE_FIELDS.map(async (preference) => {
      const savedProvider = await usersService.getSetting(
        userId,
        metadataService.getProviderSettingKey(
          preference.mediaType,
          preference.anime,
        ),
      );
      const options = metadataService.getProviderOptions(
        preference.mediaType,
        preference.anime,
      );
      const selectedProvider = savedProvider ?? options[0]?.name;

      return {
        ...preference,
        options: options.map((option) => ({
          ...option,
          selected: option.name === selectedProvider,
        })),
      };
    }),
  );
};
