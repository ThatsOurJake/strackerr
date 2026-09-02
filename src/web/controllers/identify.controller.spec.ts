import { ForbiddenException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { CollectionService } from "../../modules/collection/collection.service";
import type { IdentificationService } from "../../modules/media/identification.service";
import type { MediaService } from "../../modules/media/media.service";
import type { MetadataService } from "../../modules/metadata/metadata.service";
import { IdentifyController } from "./identify.controller";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

const user: AuthenticatedUser = { userId: "user-1", username: "tester", isAdmin: false };

describe("IdentifyController", () => {
  let findByIdWithExternalIds: jest.Mock;
  let findDetail: jest.Mock;
  let identify: jest.Mock;
  let controller: IdentifyController;
  let response: { render: jest.Mock; redirect: jest.Mock; status: jest.Mock; send: jest.Mock };

  beforeEach(() => {
    findByIdWithExternalIds = jest.fn();
    findDetail = jest.fn().mockResolvedValue({ id: "movie-1" });
    identify = jest.fn();
    controller = new IdentifyController(
      { findDetail } as unknown as CollectionService,
      { findByIdWithExternalIds } as unknown as MediaService,
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
    findByIdWithExternalIds.mockResolvedValue({
      id: "movie-1",
      type: MediaType.MOVIE,
      isSkeleton: true,
      createdByUserId: "user-2",
      externalIds: [],
    });

    await expect(
      controller.panel("movie", "movie-1", user, response as unknown as Response),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(response.render).not.toHaveBeenCalled();
  });

  it("identifies an owned skeleton and redirects to its detail page", async () => {
    findByIdWithExternalIds.mockResolvedValue({
      id: "movie-1",
      type: MediaType.MOVIE,
      isSkeleton: true,
      createdByUserId: "user-1",
      externalIds: [],
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
    expect(findDetail).not.toHaveBeenCalled();
  });

  it("allows reidentify for an accessible identified item", async () => {
    findByIdWithExternalIds.mockResolvedValue({
      id: "movie-1",
      type: MediaType.MOVIE,
      isSkeleton: false,
      createdByUserId: null,
      externalIds: [{ provider: "tmdb", externalId: "movie:1" }],
    });

    await controller.panel("movie", "movie-1", user, response as unknown as Response);

    expect(findDetail).toHaveBeenCalledWith("user-1", "movie-1");
    expect(response.render).toHaveBeenCalledWith(
      "partials/identify-panel",
      expect.objectContaining({ actionLabel: "Reidentify" }),
    );
  });
});
