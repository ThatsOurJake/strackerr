import { Module } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import { UsersModule } from "../users/users.module";
import { AniListProvider } from "./anilist.provider";
import { BggProvider } from "./bgg.provider";
import { IgdbProvider } from "./igdb.provider";
import { MetadataService, TMDB_MOVIE_PROVIDER } from "./metadata.service";
import { MusicBrainzProvider } from "./musicbrainz.provider";
import { TmdbProvider } from "./tmdb.provider";

@Module({
  imports: [UsersModule],
  providers: [
    MetadataService,
    AniListProvider,
    IgdbProvider,
    BggProvider,
    MusicBrainzProvider,
    {
      provide: TmdbProvider,
      useFactory: () => new TmdbProvider(MediaType.TV_SHOW),
    },
    {
      provide: TMDB_MOVIE_PROVIDER,
      useFactory: () => new TmdbProvider(MediaType.MOVIE),
    },
  ],
  exports: [MetadataService],
})
export class MetadataModule { }
