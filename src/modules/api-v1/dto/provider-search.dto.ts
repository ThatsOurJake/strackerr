import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaType } from "@prisma/client";

export class ProviderSearchResultDto {
  @ApiProperty({ example: "movie:157336", description: "Provider-specific external identifier" })
  externalId!: string;

  @ApiProperty({ example: "Interstellar", description: "Provider result title" })
  title!: string;

  @ApiProperty({ enum: MediaType, example: MediaType.MOVIE, description: "Media type" })
  type!: MediaType;

  @ApiPropertyOptional({ example: 2014, description: "Release year" })
  year?: number;

  @ApiPropertyOptional({ example: "https://example.com/poster.jpg", description: "Artwork URL" })
  imageUrl?: string;

  @ApiPropertyOptional({ example: "A crew travels through a wormhole.", description: "Provider description" })
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ["Science Fiction"], description: "Provider tags" })
  tags?: string[];
}

export class ProviderEpisodeDto {
  @ApiProperty({ example: 1, description: "TMDB season number" })
  seasonNumber!: number;

  @ApiProperty({ example: 3, description: "TMDB episode number" })
  episodeNumber!: number;

  @ApiProperty({ example: "In Perpetuity", description: "Episode title" })
  title!: string;

  @ApiPropertyOptional({ example: "Mark returns to Lumon.", description: "Episode description" })
  description?: string;

  @ApiPropertyOptional({ example: 52, description: "Episode duration in minutes" })
  duration?: number;

  @ApiPropertyOptional({ example: "tmdb:1049476", description: "TMDB episode identifier" })
  externalId?: string;

  @ApiPropertyOptional({ example: "https://example.com/still.jpg", description: "Episode artwork URL" })
  imageUrl?: string;
}

export class ProviderTvSearchResultDto extends ProviderSearchResultDto {
  @ApiProperty({ type: [ProviderEpisodeDto], description: "Every episode from every TMDB season" })
  episodes!: ProviderEpisodeDto[];
}

export class ProviderSearchResponseDto {
  @ApiProperty({ type: [ProviderSearchResultDto], description: "Normalized provider candidates" })
  data!: ProviderSearchResultDto[];
}

export class ProviderTvSearchResponseDto {
  @ApiProperty({ type: [ProviderTvSearchResultDto], description: "TV candidates with complete TMDB episode mappings" })
  data!: ProviderTvSearchResultDto[];
}
