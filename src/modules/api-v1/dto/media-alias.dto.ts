import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

const PROVIDER_NAMESPACE_PATTERN = /^[a-z0-9](?:[a-z0-9._:-]{0,62}[a-z0-9])?$/;

export class ExternalAliasDto {
  @ApiProperty({
    example: "steam",
    description: "Alias provider namespace for lookup",
  })
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsString()
  @IsNotEmpty()
  @Matches(PROVIDER_NAMESPACE_PATTERN)
  provider!: string;

  @ApiProperty({
    example: "app:620",
    description: "Alias external ID (opaque, max 128 chars)",
    maxLength: 128,
  })
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
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

  @ApiProperty({ enum: MediaType, example: MediaType.TV_SHOW, description: "Media type" })
  type!: MediaType;

  @ApiPropertyOptional({ example: 2022, description: "Release year" })
  year?: number;

  @ApiPropertyOptional({ example: "https://example.com/poster.jpg", description: "Artwork URL" })
  imageUrl?: string;
}

export class ResolvedMediaResponseDto {
  @ApiProperty({ type: MediaItemDto, description: "Resolved canonical media item" })
  data!: MediaItemDto;
}

export class MediaExternalAliasesResponseDto {
  @ApiProperty({ type: [ExternalAliasDto], description: "External aliases on this media item" })
  data!: ExternalAliasDto[];
}
