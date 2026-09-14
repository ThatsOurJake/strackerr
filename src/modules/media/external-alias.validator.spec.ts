import { BadRequestException } from "@nestjs/common";
import { normalizeExternalAlias } from "./external-alias.validator";

describe("external-alias.validator", () => {
  it("normalizes provider and external id", () => {
    expect(normalizeExternalAlias("  Steam ", "  12345  ")).toEqual({
      providerNamespace: "steam",
      externalId: "12345",
    });
  });

  it("rejects invalid provider namespaces", () => {
    expect(() => normalizeExternalAlias("steam!!", "123")).toThrow(BadRequestException);
  });

  it("rejects external ids longer than 128 chars", () => {
    expect(() => normalizeExternalAlias("steam", "x".repeat(129))).toThrow(BadRequestException);
  });
});
