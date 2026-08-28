import { type INestApplication } from "@nestjs/common";
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { LogService } from "../activity/log.service";
import { MediaService } from "../media/media.service";
import { ApiV1LogController } from "./api-v1-log.controller";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

describe("API v1 OpenAPI responses", () => {
  let app: INestApplication | undefined;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ApiV1LogController],
      providers: [
        { provide: MediaService, useValue: {} },
        { provide: LogService, useValue: {} },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ApiThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("STrackerr API").setVersion("1.0").build(),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ["movie", "CreatedMovieLogResponseDto"],
    ["tv-episode", "CreatedTvEpisodeLogResponseDto"],
    ["game", "CreatedGameLogResponseDto"],
    ["board-game", "CreatedBoardGameLogResponseDto"],
    ["music", "CreatedMusicLogResponseDto"],
  ])("documents /log/%s with %s", (route, schemaName) => {
    const response =
      document.paths[`/api/v1/log/${route}`]?.post?.responses?.["201"];
    if (!response || "$ref" in response) {
      throw new Error(`Missing inline 201 response for ${route}`);
    }
    const responseSchema = response.content?.["application/json"]?.schema;

    expect(responseSchema).toEqual({
      $ref: `#/components/schemas/${schemaName}`,
    });
  });

  it("only includes TV episode fields in the TV creation schema", () => {
    const schema = document.components?.schemas?.CreatedTvEpisodeLogResponseDto;
    if (!schema || "$ref" in schema) {
      throw new Error("Missing inline TV episode response schema");
    }
    const properties = Object.keys(schema.properties ?? {});

    expect(properties.sort()).toEqual([
      "duration",
      "episode",
      "id",
      "loggedAt",
      "season",
      "status",
      "title",
      "type",
    ]);
    expect(properties).not.toEqual(
      expect.arrayContaining(["platform", "players", "won"]),
    );
  });
});
