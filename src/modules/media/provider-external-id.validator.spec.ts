import { MediaType } from "@prisma/client";
import {
  isProviderExternalIdValid,
  normalizeProviderExternalId,
} from "./provider-external-id.validator";

describe("provider-external-id.validator", () => {
  it("normalizes tmdb numeric ids using media type", () => {
    expect(normalizeProviderExternalId("tmdb", "123", MediaType.MOVIE)).toBe(
      "movie:123",
    );
    expect(normalizeProviderExternalId("tmdb", "456", MediaType.TV_SHOW)).toBe(
      "tv:456",
    );
  });

  it("normalizes anilist igdb and bgg ids", () => {
    expect(normalizeProviderExternalId("anilist", "16498", MediaType.TV_SHOW)).toBe(
      "anilist:16498",
    );
    expect(normalizeProviderExternalId("igdb", "100", MediaType.GAME)).toBe(
      "igdb:100",
    );
    expect(normalizeProviderExternalId("bgg", "13", MediaType.BOARD_GAME)).toBe(
      "bgg:13",
    );
  });

  it("normalizes raw musicbrainz UUID ids", () => {
    expect(
      normalizeProviderExternalId(
        "musicbrainz",
        "7F00F0F4-4F5F-4DBD-ABF1-B190535CE6D5",
        MediaType.MUSIC_TRACK,
      ),
    ).toBe("musicbrainz:7f00f0f4-4f5f-4dbd-abf1-b190535ce6d5");
  });

  it("keeps already-prefixed values valid", () => {
    const id = normalizeProviderExternalId("anilist", "anilist:77", MediaType.TV_SHOW);
    expect(id).toBe("anilist:77");
    expect(isProviderExternalIdValid("anilist", id)).toBe(true);
  });
});
