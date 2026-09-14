import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  registerDecorator,
  ValidateIf,
  ValidateNested,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";
import { ExternalAliasDto } from "./media-alias.dto";

export const MEDIA_PROVIDERS = [
  "tmdb",
  "igdb",
  "anilist",
  "bgg",
  "musicbrainz",
] as const;

const IsNotFuture =
  (validationOptions?: ValidationOptions) =>
    (target: object, propertyName: string): void => {
      registerDecorator({
        name: "isNotFuture",
        target: target.constructor,
        propertyName,
        options: validationOptions,
        validator: {
          validate: (value: unknown) =>
            typeof value === "string" && new Date(value).getTime() <= Date.now(),
          defaultMessage: (arguments_: ValidationArguments) =>
            `${arguments_.property} must not be in the future`,
        },
      });
    };

export class BaseCreateLogDto {
  @ApiPropertyOptional({
    example: "2026-08-25T20:30:00.000Z",
    description: "ISO 8601 activity time; defaults to the current time",
  })
  @IsOptional()
  @IsDateString()
  @IsNotFuture()
  loggedAt?: string;

  @ApiPropertyOptional({
    example: 116,
    description: "Duration in minutes",
    minimum: 1,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  duration?: number;

  @ApiPropertyOptional({
    enum: MEDIA_PROVIDERS,
    example: "tmdb",
    description: "Optional external provider used to identify the media",
  })
  @ValidateIf((dto: BaseCreateLogDto) => dto.providerId !== undefined)
  @IsIn(MEDIA_PROVIDERS)
  provider?: string;

  @ApiPropertyOptional({
    example: "329865",
    description: "Optional provider item identifier",
    maxLength: 100,
  })
  @ValidateIf((dto: BaseCreateLogDto) => dto.provider !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  providerId?: string;

  @ApiPropertyOptional({
    type: [ExternalAliasDto],
    description:
      "Optional additional external aliases attached to the media item",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExternalAliasDto)
  externalAliases?: ExternalAliasDto[];
}

export class TitledCreateLogDto extends BaseCreateLogDto {
  @ApiProperty({
    example: "Arrival",
    description: "Media title",
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;
}

export class CreateMovieLogDto extends TitledCreateLogDto { }

export class CreateTvEpisodeLogDto extends BaseCreateLogDto {
  @ApiProperty({
    example: "Severance",
    description: "TV show title",
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  show!: string;

  @ApiProperty({ example: 1, description: "Season number", minimum: 1 })
  @IsInt()
  @Min(1)
  season!: number;

  @ApiProperty({ example: 3, description: "Episode number", minimum: 1 })
  @IsInt()
  @Min(1)
  episode!: number;
}

export class CreateGameLogDto extends TitledCreateLogDto {
  @ApiPropertyOptional({
    example: "PC",
    description: "Game platform",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  platform?: string;
}

export class CreateBoardGameLogDto extends TitledCreateLogDto {
  @ApiPropertyOptional({
    example: 4,
    description: "Number of players",
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  players?: number;

  @ApiPropertyOptional({
    example: true,
    description: "Whether the API-key owner won",
  })
  @IsOptional()
  @IsBoolean()
  won?: boolean;
}

export class CreateMusicLogDto extends TitledCreateLogDto { }

export class GetLogsQueryDto {
  @ApiPropertyOptional({
    enum: MediaType,
    example: MediaType.GAME,
    description: "Filter by media type",
  })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @ApiPropertyOptional({
    example: "2026-01-01",
    description: "Inclusive ISO 8601 range start",
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: "2026-12-31",
    description: "Inclusive ISO 8601 range end",
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    example: 1,
    description: "Page number",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    example: 50,
    description: "Entries per page",
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
