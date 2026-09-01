import { Inject, Injectable } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import { UsersService } from "../users/users.service";
import { AniListProvider } from "./anilist.provider";
import { BggProvider } from "./bgg.provider";
import { IgdbProvider } from "./igdb.provider";
import {
  IMetadataProvider,
  MetadataProviderName,
  ResolvedMetadataProvider,
} from "./metadata-provider.interface";
import { MusicBrainzProvider } from "./musicbrainz.provider";
import { TmdbProvider } from "./tmdb.provider";

export const TMDB_MOVIE_PROVIDER = Symbol("TMDB_MOVIE_PROVIDER");
export const METADATA_PROVIDER_SETTING_PREFIX = "metadata-provider:";

export interface MetadataProviderOption {
  name: MetadataProviderName;
  label: string;
}

export interface MetadataProviderLookupOptions {
  anime?: boolean;
  providerOverride?: MetadataProviderName;
}

const PROVIDER_OPTIONS: Partial<
  Record<MediaType, readonly MetadataProviderOption[]>
> = {
  [MediaType.MOVIE]: [{ name: "tmdb", label: "TMDB" }],
  [MediaType.TV_SHOW]: [{ name: "tmdb", label: "TMDB" }],
  [MediaType.GAME]: [{ name: "igdb", label: "IGDB" }],
  [MediaType.BOARD_GAME]: [{ name: "bgg", label: "BoardGameGeek" }],
  [MediaType.MUSIC_TRACK]: [
    { name: "musicbrainz", label: "MusicBrainz" },
  ],
};

@Injectable()
export class MetadataService {
  constructor(
    @Inject(TMDB_MOVIE_PROVIDER)
    private readonly tmdbMovieProvider: IMetadataProvider,
    private readonly tmdbTvProvider: TmdbProvider,
    private readonly aniListProvider: AniListProvider,
    private readonly igdbProvider: IgdbProvider,
    private readonly bggProvider: BggProvider,
    private readonly musicBrainzProvider: MusicBrainzProvider,
    private readonly usersService: UsersService,
  ) { }

  getProvider(
    mediaType: MediaType,
    providerName?: MetadataProviderName,
    anime = false,
  ): IMetadataProvider {
    const normalizedType =
      mediaType === MediaType.TV_EPISODE ? MediaType.TV_SHOW : mediaType;
    const options = this.getProviderOptions(normalizedType, anime);
    const selectedName = providerName ?? options[0]?.name;
    if (!selectedName || !options.some((option) => option.name === selectedName)) {
      throw new Error(
        `Provider ${providerName ?? "unknown"} does not support ${mediaType}`,
      );
    }

    if (selectedName === "tmdb") {
      return normalizedType === MediaType.MOVIE
        ? this.tmdbMovieProvider
        : this.tmdbTvProvider;
    }

    const providers: Record<
      Exclude<MetadataProviderName, "tmdb">,
      IMetadataProvider
    > = {
      anilist: this.aniListProvider,
      igdb: this.igdbProvider,
      bgg: this.bggProvider,
      musicbrainz: this.musicBrainzProvider,
    };
    return providers[selectedName];
  }

  async getProviderForUser(
    mediaType: MediaType,
    userId: string,
    options: MetadataProviderLookupOptions = {},
  ): Promise<ResolvedMetadataProvider> {
    const preferenceType =
      mediaType === MediaType.TV_EPISODE ? MediaType.TV_SHOW : mediaType;
    const savedProvider = options.providerOverride
      ? options.providerOverride
      : await this.usersService.getSetting(
        userId,
        this.getProviderSettingKey(preferenceType, options.anime),
      );
    const provider = this.getProvider(
      mediaType,
      savedProvider as MetadataProviderName | undefined,
      options.anime,
    );
    const apiKey = ["tmdb", "igdb", "bgg"].includes(provider.name)
      ? ((await this.usersService.getDecryptedKey(userId, provider.name)) ??
        undefined)
      : undefined;
    return { provider, apiKey };
  }

  getProviderOptions(
    mediaType: MediaType,
    anime = false,
  ): readonly MetadataProviderOption[] {
    const normalizedType =
      mediaType === MediaType.TV_EPISODE ? MediaType.TV_SHOW : mediaType;
    if (normalizedType === MediaType.TV_SHOW && anime) {
      return [
        { name: "anilist", label: "AniList" },
        { name: "tmdb", label: "TMDB" },
      ];
    }
    return PROVIDER_OPTIONS[normalizedType] ?? [];
  }

  getProviderSettingKey(mediaType: MediaType, anime = false): string {
    const normalizedType =
      mediaType === MediaType.TV_EPISODE ? MediaType.TV_SHOW : mediaType;
    const variant = normalizedType === MediaType.TV_SHOW && anime ? ":anime" : "";
    return `${METADATA_PROVIDER_SETTING_PREFIX}${normalizedType}${variant}`;
  }
}
