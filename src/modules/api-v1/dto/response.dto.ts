import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaType } from "@prisma/client";

export class LogEntryResponseDto {
  @ApiProperty({ example: "clog123", description: "Log entry identifier" })
  id!: string;

  @ApiProperty({ example: "Arrival", description: "Media title or TV show title" })
  title!: string;

  @ApiProperty({ enum: MediaType, example: MediaType.MOVIE, description: "Media type" })
  type!: MediaType;

  @ApiProperty({ example: "2026-08-25T20:30:00.000Z", description: "Activity time" })
  loggedAt!: Date;

  @ApiPropertyOptional({ example: 116, description: "Duration in minutes", nullable: true })
  duration!: number | null;

  @ApiPropertyOptional({ example: "PC", description: "Game platform", nullable: true })
  platform?: string | null;

  @ApiPropertyOptional({ example: 4, description: "Board game player count", nullable: true })
  players?: number | null;

  @ApiPropertyOptional({ example: true, description: "Board game win state", nullable: true })
  won?: boolean | null;

  @ApiPropertyOptional({ example: 1, description: "TV season number", nullable: true })
  season?: number | null;

  @ApiPropertyOptional({ example: 3, description: "TV episode number", nullable: true })
  episode?: number | null;
}

export class CreatedLogResponseDto {
  @ApiProperty({ example: "clog123", description: "Log entry identifier" })
  id!: string;

  @ApiProperty({ example: "Arrival", description: "Media title or TV show title" })
  title!: string;

  @ApiProperty({ example: "2026-08-25T20:30:00.000Z", description: "Activity time" })
  loggedAt!: Date;

  @ApiPropertyOptional({ example: 116, description: "Duration in minutes", nullable: true })
  duration!: number | null;

  @ApiProperty({ example: "created", description: "Creation result" })
  status!: "created";
}

export class CreatedMovieLogResponseDto extends CreatedLogResponseDto {
  @ApiProperty({ enum: [MediaType.MOVIE], example: MediaType.MOVIE, description: "Media type" })
  type!: typeof MediaType.MOVIE;
}

export class CreatedTvEpisodeLogResponseDto extends CreatedLogResponseDto {
  @ApiProperty({ enum: [MediaType.TV_EPISODE], example: MediaType.TV_EPISODE, description: "Media type" })
  type!: typeof MediaType.TV_EPISODE;

  @ApiProperty({ example: 1, description: "TV season number" })
  season!: number;

  @ApiProperty({ example: 3, description: "TV episode number" })
  episode!: number;
}

export class CreatedGameLogResponseDto extends CreatedLogResponseDto {
  @ApiProperty({ enum: [MediaType.GAME], example: MediaType.GAME, description: "Media type" })
  type!: typeof MediaType.GAME;

  @ApiPropertyOptional({ example: "PC", description: "Game platform", nullable: true })
  platform?: string | null;
}

export class CreatedBoardGameLogResponseDto extends CreatedLogResponseDto {
  @ApiProperty({ enum: [MediaType.BOARD_GAME], example: MediaType.BOARD_GAME, description: "Media type" })
  type!: typeof MediaType.BOARD_GAME;

  @ApiPropertyOptional({ example: 4, description: "Board game player count", nullable: true })
  players?: number | null;

  @ApiPropertyOptional({ example: true, description: "Board game win state", nullable: true })
  won?: boolean | null;
}

export class CreatedMusicLogResponseDto extends CreatedLogResponseDto {
  @ApiProperty({ enum: [MediaType.MUSIC_TRACK], example: MediaType.MUSIC_TRACK, description: "Media type" })
  type!: typeof MediaType.MUSIC_TRACK;
}

export class PaginatedLogsResponseDto {
  @ApiProperty({ type: [LogEntryResponseDto], description: "Log entries for the requested page" })
  data!: LogEntryResponseDto[];

  @ApiProperty({ example: 75, description: "Total matching entries" })
  total!: number;

  @ApiProperty({ example: 2, description: "Current page number" })
  page!: number;
}

export class MediaSearchItemDto {
  @ApiProperty({ example: "cm123", description: "Media item identifier" })
  id!: string;

  @ApiProperty({ example: "Severance", description: "Media title" })
  title!: string;

  @ApiProperty({ enum: MediaType, example: MediaType.TV_SHOW, description: "Media type" })
  type!: MediaType;

  @ApiPropertyOptional({ example: 2022, description: "Release year" })
  year?: number;

  @ApiPropertyOptional({ example: "https://example.com/poster.jpg", description: "Artwork URL" })
  imageUrl?: string;

}

export class MediaSearchResponseDto {
  @ApiProperty({ type: [MediaSearchItemDto], description: "Matching user-scoped media items" })
  data!: MediaSearchItemDto[];
}

export class TopItemDto {
  @ApiProperty({ example: "cm123", description: "Media item identifier" })
  id!: string;

  @ApiProperty({ example: "Arrival", description: "Media title" })
  title!: string;

  @ApiProperty({ enum: MediaType, example: MediaType.MOVIE, description: "Media type" })
  type!: MediaType;

  @ApiProperty({ example: 232, description: "Total logged minutes" })
  totalMinutes!: number;
}

export class StatsResponseDto {
  @ApiProperty({ example: { MOVIE: 232, GAME: 480 }, description: "Logged minutes grouped by media type" })
  totalTimeByType!: Partial<Record<MediaType, number>>;

  @ApiProperty({ type: [TopItemDto], description: "Most-used media items by duration" })
  topItems!: TopItemDto[];

  @ApiProperty({ example: 14, description: "Number of log entries in the period" })
  totalSessions!: number;
}
