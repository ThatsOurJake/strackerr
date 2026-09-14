import { BadRequestException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { CollectionService } from "../../modules/collection/collection.service";
import { ItemController } from "./item.controller";

const user: AuthenticatedUser = { userId: "user-7", username: "sam", isAdmin: false };

const createDetail = () => ({
  id: "item-1",
  type: MediaType.MOVIE,
  title: "Arrival",
  sortTitle: "arrival",
  isSkeleton: false,
  createdByUserId: null,
  parentId: null,
  seasonNumber: null,
  episodeNumber: null,
  description: "Great sci-fi",
  imageUrl: null,
  imageSourceUrl: null,
  year: 2016,
  duration: null,
  createdAt: new Date("2026-08-01T00:00:00Z"),
  updatedAt: new Date("2026-08-02T00:00:00Z"),
  externalAliases: [
    {
      id: "alias-1",
      mediaItemId: "item-1",
      providerNamespace: "tmdb",
      externalId: "157336",
      createdAt: new Date("2026-08-01T00:00:00Z"),
    },
  ],
  logEntries: [
    {
      id: "log-1",
      userId: "user-7",
      mediaItemId: "item-1",
      loggedAt: new Date("2026-09-01T12:00:00Z"),
      duration: 120,
      notes: null,
      platform: null,
      playerCount: null,
      won: null,
      source: "MANUAL",
      createdAt: new Date("2026-09-01T12:00:00Z"),
    },
  ],
  episodes: [],
});

describe("ItemController", () => {
  let findDetail: jest.Mock;
  let bulkEditItem: jest.Mock;
  let controller: ItemController;
  let response: { render: jest.Mock; status: jest.Mock; send: jest.Mock; redirect: jest.Mock };

  beforeEach(() => {
    findDetail = jest.fn().mockResolvedValue(createDetail());
    bulkEditItem = jest.fn().mockResolvedValue({ itemId: "item-1", stillAccessible: true });
    controller = new ItemController({ findDetail, bulkEditItem } as unknown as CollectionService);
    response = {
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      redirect: jest.fn(),
    };
  });

  it("renders a canonical item detail page", async () => {
    await controller.detail(
      "item-1",
      "Item changes saved",
      undefined,
      user,
      response as unknown as Response,
    );

    expect(findDetail).toHaveBeenCalledWith("user-7", "item-1");
    expect(response.render).toHaveBeenCalledWith(
      "collection/movie",
      expect.objectContaining({
        title: "Arrival",
        editUrl: "/items/item-1/edit",
        success: "Item changes saved",
      }),
    );
  });

  it("loads the edit screen with item data and cancel navigation", async () => {
    await controller.edit("item-1", user, response as unknown as Response);

    expect(response.render).toHaveBeenCalledWith(
      "items/edit",
      expect.objectContaining({
        cancelUrl: "/items/item-1",
        titleValue: "Arrival",
        hasHistoryRows: true,
      }),
    );
  });

  it("saves metadata, selected removals, and aliases in one bulk call", async () => {
    await controller.save(
      "item-1",
      user,
      {
        title: "Arrival (2016)",
        description: "Updated",
        removeLogEntryIds: ["log-1", "log-2"],
        aliasRowKey: ["alias-1", "new-0"],
        aliasId: ["alias-1", ""],
        aliasProviderNamespace: ["tmdb", "imdb"],
        aliasExternalId: ["157336", "tt2543164"],
        aliasRemove: ["new-0"],
      },
      response as unknown as Response,
    );

    expect(bulkEditItem).toHaveBeenCalledWith("user-7", "item-1", {
      title: "Arrival (2016)",
      description: "Updated",
      removeLogEntryIds: ["log-1", "log-2"],
      aliases: [
        {
          id: "alias-1",
          providerNamespace: "tmdb",
          externalId: "157336",
          remove: false,
        },
        {
          id: undefined,
          providerNamespace: "imdb",
          externalId: "tt2543164",
          remove: true,
        },
      ],
    });
    expect(response.redirect).toHaveBeenCalledWith(
      "/items/item-1?success=Item%20changes%20saved",
    );
  });

  it("re-renders edit view with preserved state after validation failure", async () => {
    bulkEditItem.mockRejectedValue(new BadRequestException("Title is required"));

    await controller.save(
      "item-1",
      user,
      {
        title: "",
        description: "",
        removeLogEntryIds: "log-1",
        aliasRowKey: ["alias-1"],
        aliasId: ["alias-1"],
        aliasProviderNamespace: ["tmdb"],
        aliasExternalId: ["157336"],
      },
      response as unknown as Response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.render).toHaveBeenCalledWith(
      "items/edit",
      expect.objectContaining({
        error: "Title is required",
        titleValue: "",
        selectedHistoryCount: 1,
      }),
    );
  });

  it("redirects to collection when save removes the user's last access to the item", async () => {
    bulkEditItem.mockResolvedValueOnce({ itemId: "item-1", stillAccessible: false });

    await controller.save(
      "item-1",
      user,
      {
        title: "Arrival",
        description: "",
      },
      response as unknown as Response,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      "/collection?success=Item%20changes%20saved",
    );
  });
});
