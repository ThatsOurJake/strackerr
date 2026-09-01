import { LogSource, MediaType } from "@prisma/client";
import type { Response } from "express";
import type { LogService } from "../../modules/activity/log.service";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type { MediaService } from "../../modules/media/media.service";
import type { MetadataService } from "../../modules/metadata/metadata.service";
import { AddController } from "./add.controller";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

const user: AuthenticatedUser = { userId: "user-1", username: "tester", isAdmin: false };

describe("AddController", () => {
  let mediaService: {
    findById: jest.Mock;
    findOrCreateSkeleton: jest.Mock;
    findOrCreateEpisodeSkeleton: jest.Mock;
  };
  let createLog: jest.Mock;
  let controller: AddController;
  let response: { redirect: jest.Mock; render: jest.Mock; status: jest.Mock };

  beforeEach(() => {
    mediaService = {
      findById: jest.fn(),
      findOrCreateSkeleton: jest.fn(),
      findOrCreateEpisodeSkeleton: jest.fn(),
    };
    createLog = jest.fn();
    controller = new AddController(
      {} as MetadataService,
      mediaService as unknown as MediaService,
      { create: createLog } as unknown as LogService,
    );
    response = {
      redirect: jest.fn(),
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it("creates an episode child under a selected show and logs it", async () => {
    mediaService.findById.mockResolvedValue({
      id: "show-1",
      type: MediaType.TV_SHOW,
      title: "Severance",
      isSkeleton: false,
      createdByUserId: null,
    });
    mediaService.findOrCreateEpisodeSkeleton.mockResolvedValue({
      id: "episode-1",
      type: MediaType.TV_EPISODE,
      duration: 48,
    });

    await controller.submit(
      {
        type: MediaType.TV_EPISODE,
        mediaItemId: "show-1",
        title: "Severance",
        loggedAt: "2026-08-28",
        seasonNumber: "1",
        episodeNumber: "3",
        notes: "Great episode",
      },
      user,
      response as unknown as Response,
    );

    expect(mediaService.findOrCreateEpisodeSkeleton).toHaveBeenCalledWith(
      "show-1",
      "Severance",
      1,
      3,
      "user-1",
    );
    expect(createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaItemId: "episode-1",
        duration: 48,
        notes: "Great episode",
      }),
      "user-1",
      LogSource.MANUAL,
    );
    expect(response.redirect).toHaveBeenCalledWith("/history");
  });

  it("renders an inline error when a game has no duration", async () => {
    await controller.submit(
      {
        type: MediaType.GAME,
        title: "Hades",
        loggedAt: "2026-08-28",
        platform: "Steam",
      },
      user,
      response as unknown as Response,
    );

    expect(createLog).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.render).toHaveBeenCalledWith(
      "add",
      expect.objectContaining({
        entryForm: expect.objectContaining({ error: "Duration is required for games" }),
      }),
    );
  });
});