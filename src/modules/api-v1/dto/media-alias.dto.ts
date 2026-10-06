import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaType } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";

const PROVIDER_NAMESPACE_PATTERN = /^[a-z0-9](?:[a-z0-9._:-]{0,62}[a-z0-9])?$/;
export const IDENTIFY_FIELD_VALUES = [
  "title",
  "description",
  "year",
  "duration",
  "artwork",
] as const;
export type IdentifyFieldValue = (typeof IDENTIFY_FIELD_VALUES)[number];

export class ExternalAliasDto {
  @ApiProperty({
    example: "steam",
    description: "Alias provider namespace for lookup",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(PROVIDER_NAMESPACE_PATTERN)
  provider!: string;

  @ApiProperty({
    example: "app:620",
    description: "Alias external ID (opaque, max 128 chars)",
    maxLength: 128,
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  id!: string;
}

export class MediaItemDto {
  @ApiProperty({ example: "cm123", description: "Media item identifier" })
  id!: string;

  @ApiProperty({ example: "Severance", description: "Media title" })
  title!: string;

  @ApiProperty({
    enum: MediaType,
    example: MediaType.TV_SHOW,
    description: "Media type",
  })
  type!: MediaType;

  @ApiPropertyOptional({ example: 2022, description: "Release year" })
  year?: number;

  @ApiPropertyOptional({
    example: "https://example.com/poster.jpg",
    description: "Artwork URL",
  })
  imageUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["Sci-Fi", "Mystery"],
    description: "Tags assigned to this media item for the authenticated user",
  })
  tags?: string[];
}

export class ResolvedMediaResponseDto {
  @ApiProperty({
    type: MediaItemDto,
    description: "Resolved canonical media item",
  })
  data!: MediaItemDto;
}

export class MediaExternalAliasesResponseDto {
  @ApiProperty({
    type: [ExternalAliasDto],
    description: "External aliases on this media item",
  })
  data!: ExternalAliasDto[];
}

export class ResolveMediaQueryDto {
  @ApiPropertyOptional({
    example: "cm123",
    description: "Resolve by existing STrackerr item id",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  mediaItemId?: string;

  @ApiPropertyOptional({
    example: "Severance",
    description: "Resolve by title",
    maxLength: 500,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    example: "steam",
    description: "Resolve by external alias namespace",
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(PROVIDER_NAMESPACE_PATTERN)
  provider?: string;

  @ApiPropertyOptional({
    example: "app:620",
    description: "Resolve by external alias id",
    maxLength: 128,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  id?: string;
}

export class CreateMediaItemDto {
  @ApiProperty({
    enum: MediaType,
    example: MediaType.MOVIE,
    description: "Media type for the new item",
  })
  @IsEnum(MediaType)
  type!: MediaType;

  @ApiProperty({
    example: "Arrival",
    description: "Media title",
    maxLength: 500,
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({
    example: "Favorite live version",
    description: "Optional media description",
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    type: [ExternalAliasDto],
    description: "Optional external aliases attached at creation time",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalAliasDto)
  externalAliases?: ExternalAliasDto[];
}

export class CreatedMediaResponseDto {
  @ApiProperty({ type: MediaItemDto, description: "Created media item" })
  data!: MediaItemDto;
}

export class IdentifiedMediaResponseDto {
  @ApiProperty({
    type: MediaItemDto,
    description: "Updated identified media item",
  })
  data!: MediaItemDto;
}

export class IdentifyMediaRequestDto {
  @ApiPropertyOptional({
    type: [String],
    enum: IDENTIFY_FIELD_VALUES,
    description:
      "Optional list of metadata fields to apply. When omitted, all available provider fields are applied.",
    example: ["title", "year", "artwork"],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5)
  @IsIn(IDENTIFY_FIELD_VALUES, { each: true })
  fields?: IdentifyFieldValue[];
}
