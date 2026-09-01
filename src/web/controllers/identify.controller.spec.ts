import { ForbiddenException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { IdentificationService } from "../../modules/media/identification.service";
import type { MediaService } from "../../modules/media/media.service";
import type { MetadataService } from "../../modules/metadata/metadata.service";
import { IdentifyController } from "./identify.controller";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

const user: AuthenticatedUser = { userId: "user-1", username: "tester", isAdmin: false };

describe("IdentifyController", () => {
  let findById: jest.Mock;
  let identify: jest.Mock;
  let controller: IdentifyController;
  let response: { render: jest.Mock; redirect: jest.Mock; status: jest.Mock; send: jest.Mock };

  beforeEach(() => {
    findById = jest.fn();
    identify = jest.fn();
    controller = new IdentifyController(
      { findById } as unknown as MediaService,
      {
        getProviderForUser: jest.fn().mockResolvedValue({
          provider: { name: "tmdb" },
          apiKey: "key",
        }),
      } as unknown as MetadataService,
      { identify } as unknown as IdentificationService,
    );
    response = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it("rejects identify actions for a skeleton owned by another user", async () => {
    findById.mockResolvedValue({
      id: "movie-1",
      type: MediaType.MOVIE,
      isSkeleton: true,
      createdByUserId: "user-2",
    });

    await expect(
      controller.panel("movie", "movie-1", user, response as unknown as Response),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(response.render).not.toHaveBeenCalled();
  });

  it("identifies an owned skeleton and redirects to its detail page", async () => {
    findById.mockResolvedValue({
      id: "movie-1",
      type: MediaType.MOVIE,
      isSkeleton: true,
      createdByUserId: "user-1",
    });

    await controller.identify(
      "movie",
      "movie-1",
      { provider: "tmdb", externalId: "123" },
      user,
      response as unknown as Response,
    );

    expect(identify).toHaveBeenCalledWith("movie-1", "tmdb", "123", "user-1");
    expect(response.redirect).toHaveBeenCalledWith("/collection/movie/movie-1");
  });
});