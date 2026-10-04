import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateBoardGameActivityDto,
  CreateMovieActivityDto,
  CreateTvEpisodeActivityDto,
} from "./activity.dto";

describe("typed log DTOs", () => {
  const validRequest = {
    mediaItemId: "media-1",
    loggedAt: "2026-08-25T20:00:00.000Z",
    duration: 116,
  };

  it("accepts a movie without a timestamp", async () => {
    await expect(validate(plainToInstance(CreateMovieActivityDto, { mediaItemId: "media-1" }))).resolves.toHaveLength(0);
  });

  it("rejects future dates and excessive duration", async () => {
    const dto = plainToInstance(CreateMovieActivityDto, {
      ...validRequest,
      loggedAt: "2999-01-01T00:00:00.000Z",
      duration: 1441,
    });
    const errors = await validate(dto);

    expect(errors.map(({ property }) => property).sort()).toEqual([
      "duration",
      "loggedAt",
    ]);
  });

  it("requires mediaItemId, season, and episode for TV episodes", async () => {
    const dto = plainToInstance(CreateTvEpisodeActivityDto, {});
    const errors = await validate(dto);

    expect(errors.map(({ property }) => property).sort()).toEqual([
      "episode",
      "mediaItemId",
      "season",
    ]);
  });

  it("accepts season 0 for TV specials", async () => {
    const dto = plainToInstance(CreateTvEpisodeActivityDto, {
      mediaItemId: "media-1",
      season: 0,
      episode: 1,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("uses players as the board-game-specific field", async () => {
    const dto = plainToInstance(CreateBoardGameActivityDto, {
      mediaItemId: "media-12",
      players: 3,
      won: true,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
