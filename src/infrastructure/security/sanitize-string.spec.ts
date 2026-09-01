import { stripHtmlTags } from "./sanitize-string";

describe("stripHtmlTags", () => {
  it("removes tags and surrounding whitespace", () => {
    expect(stripHtmlTags("  <b>Hades</b> <script>alert(1)</script>  ")).toBe(
      "Hades alert(1)",
    );
  });
});
