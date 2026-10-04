import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaType } from "@prisma/client";

export class ApiErrorDto {
  @ApiProperty({ example: 422, description: "HTTP status code" })
  statusCode!: number;

  @ApiProperty({
    example: "Identification could not run due to missing alias",
    description: "Primary error message",
  })
  message!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["loggedAt must be an ISO date string"],
    description: "Optional validation or field-level details",
  })
  details?: string[];
}

export class ApiErrorResponseDto {
  @ApiProperty({
    type: ApiErrorDto,
    description: "Standardized API error envelope",
    example: {
      statusCode: 400,
      message: "Invalid request fields",
      details: ["loggedAt must be an ISO date string"],
    },
  })
  error!: ApiErrorDto;
}

export class ApiProfileDto {
  @ApiProperty({ example: "clx123", description: "User identifier" })
  id!: string;

  @ApiProperty({ example: "john", description: "Username attached to the API key" })
  username!: string;

  @ApiProperty({ example: false, description: "Whether the user has administrator access" })
  isAdmin!: boolean;

  @ApiProperty({ example: "2026-01-01T12:00:00.000Z", description: "Profile creation time" })
  createdAt!: Date;
}

export class ApiProfileResponseDto {
  @ApiProperty({ type: ApiProfileDto, description: "Authenticated API profile" })
  data!: ApiProfileDto;
}

export class ActivityEntryResponseDto {
  @ApiProperty({ example: "clog123", description: "Activity entry identifier" })
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

export class CreatedActivityResponseBaseDto {
  @ApiProperty({ example: "clog123", description: "Activity entry identifier" })
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

export class CreatedMovieActivityDto extends CreatedActivityResponseBaseDto {
  @ApiProperty({ enum: [MediaType.MOVIE], example: MediaType.MOVIE, description: "Media type" })
  type!: typeof MediaType.MOVIE;
}

export class CreatedTvEpisodeActivityDto extends CreatedActivityResponseBaseDto {
  @ApiProperty({ enum: [MediaType.TV_EPISODE], example: MediaType.TV_EPISODE, description: "Media type" })
  type!: typeof MediaType.TV_EPISODE;

  @ApiProperty({ example: 1, description: "TV season number" })
  season!: number;

  @ApiProperty({ example: 3, description: "TV episode number" })
  episode!: number;
}

export class CreatedGameActivityDto extends CreatedActivityResponseBaseDto {
  @ApiProperty({ enum: [MediaType.GAME], example: MediaType.GAME, description: "Media type" })
  type!: typeof MediaType.GAME;

  @ApiPropertyOptional({ example: "PC", description: "Game platform", nullable: true })
  platform?: string | null;
}

export class CreatedBoardGameActivityDto extends CreatedActivityResponseBaseDto {
  @ApiProperty({ enum: [MediaType.BOARD_GAME], example: MediaType.BOARD_GAME, description: "Media type" })
  type!: typeof MediaType.BOARD_GAME;

  @ApiPropertyOptional({ example: 4, description: "Board game player count", nullable: true })
  players?: number | null;

  @ApiPropertyOptional({ example: true, description: "Board game win state", nullable: true })
  won?: boolean | null;
}

export class CreatedMusicActivityDto extends CreatedActivityResponseBaseDto {
  @ApiProperty({ enum: [MediaType.MUSIC_TRACK], example: MediaType.MUSIC_TRACK, description: "Media type" })
  type!: typeof MediaType.MUSIC_TRACK;
}

export type CreatedActivityResponseDto =
  | CreatedMovieActivityDto
  | CreatedTvEpisodeActivityDto
  | CreatedGameActivityDto
  | CreatedBoardGameActivityDto
  | CreatedMusicActivityDto;

export class CreatedMovieActivityResponseDto {
  @ApiProperty({ type: CreatedMovieActivityDto, description: "Created activity entry" })
  data!: CreatedMovieActivityDto;
}

export class CreatedTvEpisodeActivityResponseDto {
  @ApiProperty({ type: CreatedTvEpisodeActivityDto, description: "Created activity entry" })
  data!: CreatedTvEpisodeActivityDto;
}

export class CreatedGameActivityResponseDto {
  @ApiProperty({ type: CreatedGameActivityDto, description: "Created activity entry" })
  data!: CreatedGameActivityDto;
}

export class CreatedBoardGameActivityResponseDto {
  @ApiProperty({ type: CreatedBoardGameActivityDto, description: "Created activity entry" })
  data!: CreatedBoardGameActivityDto;
}

export class CreatedMusicActivityResponseDto {
  @ApiProperty({ type: CreatedMusicActivityDto, description: "Created activity entry" })
  data!: CreatedMusicActivityDto;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 75, description: "Total matching entries" })
  total!: number;

  @ApiProperty({ example: 2, description: "Current page number" })
  page!: number;

  @ApiProperty({ example: 50, description: "Entries per page" })
  limit!: number;
}

export class PaginatedActivityResponseDto {
  @ApiProperty({ type: [ActivityEntryResponseDto], description: "Activity entries for the requested page" })
  data!: ActivityEntryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto, description: "Pagination metadata" })
  meta!: PaginationMetaDto;
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

  @ApiPropertyOptional({
    type: [String],
    example: ["Sci-Fi", "Mystery"],
    description: "Tags assigned to this media item for the authenticated user",
  })
  tags?: string[];

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

export class StatsDataDto {
  @ApiProperty({ example: { MOVIE: 232, GAME: 480 }, description: "Activity minutes grouped by media type" })
  totalTimeByType!: Partial<Record<MediaType, number>>;

  @ApiProperty({ type: [TopItemDto], description: "Most-used media items by duration" })
  topItems!: TopItemDto[];

  @ApiProperty({ example: 14, description: "Number of activity entries in the period" })
  totalSessions!: number;
}

export class StatsResponseDto {
  @ApiProperty({ type: StatsDataDto, description: "User-scoped activity summary" })
  data!: StatsDataDto;
}
