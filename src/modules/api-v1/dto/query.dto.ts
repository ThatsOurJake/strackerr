import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MediaType } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { STATS_PERIODS, type StatsPeriodSlug } from "../../stats/stats.service";

const PERIOD_SLUGS = STATS_PERIODS.map(({ slug }) => slug);

export class MediaSearchQueryDto {
  @ApiProperty({ example: "Sever", description: "Case-insensitive title or alias search", minLength: 2 })
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  q!: string;

  @ApiPropertyOptional({ enum: MediaType, example: MediaType.TV_SHOW, description: "Optional media type filter" })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;
}

export class StatsQueryDto {
  @ApiPropertyOptional({ enum: PERIOD_SLUGS, example: "this-year", description: "Predefined reporting period; cannot be combined with year" })
  @IsOptional()
  @IsIn(PERIOD_SLUGS)
  period?: StatsPeriodSlug;

  @ApiPropertyOptional({ example: 2026, description: "Exact reporting year; cannot be combined with period", minimum: 1970, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(9999)
  year?: number;
}
