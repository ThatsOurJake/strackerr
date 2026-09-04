import {
  buildProviderSearchQuery,
  parseIdentificationQuery,
} from "./identification-query.parser";

describe("identification-query.parser", () => {
  it("rejects mixed structured fields and free text terms", () => {
    const parsed = parseIdentificationQuery(
      'artist:"Queen" title:"Bohemian Rhapsody" year:"1975" live aid',
    );

    expect(parsed.ok).toBe(false);
    expect(parsed.error?.message).toContain("either structured fields");
  });

  it("parses provider id lookup tokens", () => {
    const parsed = parseIdentificationQuery(
      "id:7f00f0f4-4f5f-4dbd-abf1-b190535ce6d5",
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.value?.providerLookup).toEqual({
      identifier: "7f00f0f4-4f5f-4dbd-abf1-b190535ce6d5",
    });
  });

  it("rejects mixed id and additional terms", () => {
    const parsed = parseIdentificationQuery(
      'id:7f00f0f4-4f5f-4dbd-abf1-b190535ce6d5 title:"track"',
    );

    expect(parsed.ok).toBe(false);
    expect(parsed.error?.message).toContain("Use id:<identifier> on its own");
  });

  it("returns a helpful error for malformed field syntax", () => {
    const parsed = parseIdentificationQuery("artist:Queen");

    expect(parsed.ok).toBe(false);
    expect(parsed.error?.message).toContain("must use quotes");
  });

  it("builds MusicBrainz field queries from parsed data", () => {
    const parsed = parseIdentificationQuery(
      'artist:"Queen" title:"Bohemian Rhapsody" year:"1975"',
    );
    if (!parsed.ok || !parsed.value) {
      throw new Error("Expected parse success");
    }

    expect(buildProviderSearchQuery(parsed.value, "musicbrainz")).toBe(
      'artist:"Queen" title:"Bohemian Rhapsody" year:"1975"',
    );
  });
});
