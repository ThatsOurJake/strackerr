import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

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

export class BaseCreateActivityDto {
  @ApiProperty({
    example: "cm123",
    description: "Existing media item identifier returned by /api/v1/media endpoints",
  })
  @IsString()
  @IsNotEmpty()
  mediaItemId!: string;

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
}

export class CreateMovieActivityDto extends BaseCreateActivityDto { }

export class CreateTvEpisodeActivityDto extends BaseCreateActivityDto {
  @ApiProperty({ example: 0, description: "Season number (0 allows specials)", minimum: 0 })
  @IsInt()
  @Min(0)
  season!: number;

  @ApiProperty({ example: 3, description: "Episode number", minimum: 1 })
  @IsInt()
  @Min(1)
  episode!: number;
}

export class CreateGameActivityDto extends BaseCreateActivityDto {
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

export class CreateBoardGameActivityDto extends BaseCreateActivityDto {
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

export class CreateMusicActivityDto extends BaseCreateActivityDto { }

export class GetActivityQueryDto {
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
