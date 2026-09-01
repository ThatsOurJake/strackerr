import { MediaType } from "@prisma/client";
import type { MetadataService } from "../metadata/metadata.service";
import type { EpisodeSyncService } from "./episode-sync.service";
import { IdentificationService } from "./identification.service";
import type { MediaService } from "./media.service";

jest.mock("@paralleldrive/cuid2", () => ({ createId: jest.fn() }));

describe("IdentificationService", () => {
  it("preserves the alias, links metadata, and starts TV sync without awaiting it", async () => {
    const update = jest.fn().mockResolvedValue({
      id: "show-1",
      type: MediaType.TV_SHOW,
      title: "Severance",
      isSkeleton: false,
    });
    const addExternalId = jest.fn();
    const addAlias = jest.fn();
    const syncShow = jest.fn().mockReturnValue(new Promise<void>(() => undefined));
    const events = { emit: jest.fn() };
    const provider = {
      name: "tmdb",
      getById: jest.fn().mockResolvedValue({
        externalId: "95396",
        title: "Severance",
        type: MediaType.TV_SHOW,
        description: "A workplace mystery",
        imageUrl: "https://image/poster.jpg",
        year: 2022,
        duration: 50,
      }),
    };
    const service = new IdentificationService(
      {
        findById: jest.fn().mockResolvedValue({
          id: "show-1",
          type: MediaType.TV_SHOW,
          title: "Severence",
          isSkeleton: true,
        }),
        update,
        addExternalId,
        addAlias,
      } as unknown as MediaService,
      {
        getProviderForUser: jest.fn().mockResolvedValue({ provider, apiKey: "key" }),
      } as unknown as MetadataService,
      { syncShow } as unknown as EpisodeSyncService,
      events as never,
    );

    await expect(
      service.identify("show-1", "tmdb", "95396", "user-1"),
    ).resolves.toEqual(expect.objectContaining({ title: "Severance" }));

    expect(update).toHaveBeenCalledWith("show-1", expect.objectContaining({
      title: "Severance",
      imageUrl: null,
      imageSourceUrl: "https://image/poster.jpg",
      isSkeleton: false,
      createdByUserId: null,
    }));
    expect(addExternalId).toHaveBeenCalledWith("show-1", "tmdb", "95396");
    expect(addAlias).toHaveBeenCalledWith("show-1", "Severence");
    expect(events.emit).toHaveBeenCalledWith("media.image.cache", {
      mediaItemId: "show-1",
      sourceUrl: "https://image/poster.jpg",
    });
    expect(syncShow).toHaveBeenCalledWith("show-1", "tmdb", "95396", "key");
  });
});