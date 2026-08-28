import { MediaType } from "@prisma/client";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { CollectionService } from "../../modules/collection/collection.service";
import { CollectionController } from "./collection.controller";

const user: AuthenticatedUser = { userId: "user-2", username: "tester", isAdmin: false };

describe("CollectionController", () => {
  let findCollection: jest.Mock;
  let findDetail: jest.Mock;
  let controller: CollectionController;
  let response: { render: jest.Mock; status: jest.Mock; send: jest.Mock };

  beforeEach(() => {
    findCollection = jest.fn().mockResolvedValue({
      items: [],
      availableLetters: new Set(),
      page: 1,
      totalPages: 1,
      totalItems: 0,
    });
    findDetail = jest.fn();
    controller = new CollectionController({ findCollection, findDetail } as unknown as CollectionService);
    response = {
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it("parses additive filters and scopes the collection to the current user", async () => {
    await controller.collection(
      "tv",
      "unidentified",
      "o",
      "2",
      user,
      response as unknown as Response,
    );

    expect(findCollection).toHaveBeenCalledWith("user-2", {
      type: MediaType.TV_SHOW,
      unidentified: true,
      letter: "O",
      page: 2,
    });
    expect(response.render).toHaveBeenCalledWith(
      "collection",
      expect.objectContaining({ title: "Collection", hasItems: false }),
    );
  });

  it("renders only the collection partial for HTMX requests", async () => {
    await controller.partial(undefined, undefined, undefined, undefined, user, response as unknown as Response);

    expect(response.render).toHaveBeenCalledWith(
      "partials/collection-grid",
      expect.objectContaining({ layout: false }),
    );
  });

  it("loads detail data using the current user", async () => {
    findDetail.mockResolvedValue({
      id: "movie-1",
      type: MediaType.MOVIE,
      title: "Arrival",
      description: null,
      imageUrl: null,
      logEntries: [],
      episodes: [],
    });

    await controller.detail("movie-1", user, response as unknown as Response);

    expect(findDetail).toHaveBeenCalledWith("user-2", "movie-1");
    expect(response.render).toHaveBeenCalledWith(
      "collection/movie",
      expect.objectContaining({ title: "Arrival", totalCount: 0 }),
    );
  });
});
