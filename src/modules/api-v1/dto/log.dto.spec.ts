import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateBoardGameLogDto,
  CreateMovieLogDto,
  CreateTvEpisodeLogDto,
} from "./log.dto";

describe("typed log DTOs", () => {
  const validRequest = {
    title: "Arrival",
    loggedAt: "2026-08-25T20:00:00.000Z",
    duration: 116,
  };

  it("accepts a movie without a timestamp", async () => {
    await expect(validate(plainToInstance(CreateMovieLogDto, { title: "Arrival" }))).resolves.toHaveLength(0);
  });

  it("rejects future dates, excessive duration, and unknown providers", async () => {
    const dto = plainToInstance(CreateMovieLogDto, {
      ...validRequest,
      loggedAt: "2999-01-01T00:00:00.000Z",
      duration: 1441,
      provider: "unknown",
      externalId: "1",
    });
    const errors = await validate(dto);

    expect(errors.map(({ property }) => property).sort()).toEqual([
      "duration",
      "loggedAt",
      "provider",
    ]);
  });

  it("requires show, season, and episode for TV episodes", async () => {
    const dto = plainToInstance(CreateTvEpisodeLogDto, {});
    const errors = await validate(dto);

    expect(errors.map(({ property }) => property).sort()).toEqual([
      "episode",
      "season",
      "show",
    ]);
  });

  it("uses players as the board-game-specific field", async () => {
    const dto = plainToInstance(CreateBoardGameLogDto, {
      title: "Wingspan",
      players: 3,
      won: true,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
