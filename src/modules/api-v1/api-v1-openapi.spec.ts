import { Controller, Get, type INestApplication, Module } from "@nestjs/common";
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { ActivityService } from "../activity/activity.service";
import { IdentificationService } from "../media/identification.service";
import { MediaService } from "../media/media.service";
import { UsersService } from "../users/users.service";
import { ApiV1ActivityController } from "./api-v1-activity.controller";
import { ApiV1MediaController } from "./api-v1-media.controller";
import { ApiV1ProfileController } from "./api-v1-profile.controller";
import { ApiKeyGuard } from "./guards/api-key.guard";
import { ApiKeyNotFoundGuard } from "./guards/api-key-not-found.guard";
import { ApiThrottlerGuard } from "./guards/api-throttler.guard";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

@Controller("internal")
class InternalController {
  @Get()
  listInternalRoutes() {
    return { ok: true };
  }
}

@Module({
  controllers: [
    ApiV1ActivityController,
    ApiV1MediaController,
    ApiV1ProfileController,
  ],
  providers: [
    { provide: MediaService, useValue: {} },
    { provide: ActivityService, useValue: {} },
    { provide: IdentificationService, useValue: {} },
    { provide: UsersService, useValue: {} },
  ],
})
class ApiDocsPublicModule { }

@Module({
  imports: [ApiDocsPublicModule],
  controllers: [InternalController],
})
class ApiDocsRootModule { }

describe("API v1 OpenAPI responses", () => {
  let app: INestApplication | undefined;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ApiDocsRootModule],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ApiThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ApiKeyNotFoundGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("STrackerr API")
        .setVersion("1.0")
        .addApiKey(
          { type: "apiKey", in: "header", name: "X-API-Key" },
          "ApiKey",
        )
        .build(),
      { include: [ApiDocsPublicModule] },
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ["movie", "CreatedMovieActivityResponseDto"],
    ["tv-episode", "CreatedTvEpisodeActivityResponseDto"],
    ["game", "CreatedGameActivityResponseDto"],
    ["board-game", "CreatedBoardGameActivityResponseDto"],
    ["music", "CreatedMusicActivityResponseDto"],
  ])("documents /activity/%s with %s", (route, schemaName) => {
    const response =
      document.paths[`/api/v1/activity/${route}`]?.post?.responses?.["201"];
    if (!response || "$ref" in response) {
      throw new Error(`Missing inline 201 response for ${route}`);
    }
    const responseSchema = response.content?.["application/json"]?.schema;

    expect(responseSchema).toEqual({
      $ref: `#/components/schemas/${schemaName}`,
    });
  });

  it("only includes TV episode fields in the TV creation schema", () => {
    const wrapperSchema =
      document.components?.schemas?.CreatedTvEpisodeActivityResponseDto;
    if (!wrapperSchema || "$ref" in wrapperSchema) {
      throw new Error("Missing inline TV episode wrapper response schema");
    }

    expect(wrapperSchema.properties?.data).toEqual({
      allOf: [{ $ref: "#/components/schemas/CreatedTvEpisodeActivityDto" }],
      description: "Created activity entry",
    });

    const schema = document.components?.schemas?.CreatedTvEpisodeActivityDto;
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

  it("documents only /api/ paths and excludes internal routes", () => {
    const documentedPaths = Object.keys(document.paths);

    expect(documentedPaths).toEqual(
      expect.arrayContaining([
        "/api/v1/activity/movie",
        "/api/v1/media/search",
        "/api/v1/profile",
      ]),
    );
    expect(documentedPaths.length).toBeGreaterThan(0);
    for (const path of documentedPaths) {
      expect(path.startsWith("/api/")).toBe(true);
    }
    expect(document.paths["/internal"]).toBeUndefined();
    expect(document.components?.securitySchemes?.ApiKey).toBeDefined();
  });

  it("does not emit JSON object-style parameters", () => {
    for (const pathItem of Object.values(document.paths)) {
      for (const operation of Object.values(pathItem ?? {})) {
        if (
          !operation ||
          typeof operation !== "object" ||
          !("parameters" in operation)
        ) {
          continue;
        }

        for (const parameter of operation.parameters ?? []) {
          if (!parameter || "$ref" in parameter) {
            continue;
          }

          expect(parameter.content).toBeUndefined();
          expect(parameter.schema?.type).not.toBe("object");
          expect(parameter.schema?.type).not.toBe("array");
        }
      }
    }
  });
});
