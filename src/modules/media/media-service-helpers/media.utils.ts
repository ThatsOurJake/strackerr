export const normaliseMediaAlias = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const computeMediaSortTitle = (title: string): string => {
  const withoutArticle = title.trim().replace(/^(the|a|an)\s+/i, "");
  return /^[^\p{Script=Latin}]|^\d/u.test(withoutArticle)
    ? `#${withoutArticle.toLowerCase()}`
    : withoutArticle.toLowerCase();
};

export const normalizeTagInputs = (
  tags: string[],
  stripHtml: (value: string) => string,
): Array<{ normalizedKey: string; label: string }> => {
  const unique = new Map<string, { normalizedKey: string; label: string }>();

  for (const rawTag of tags) {
    const stripped = stripHtml(rawTag).trim().replace(/\s+/g, " ");
    if (!stripped) {
      continue;
    }

    const normalizedKey = stripped.toLowerCase();
    if (!unique.has(normalizedKey)) {
      unique.set(normalizedKey, {
        normalizedKey,
        label: stripped,
      });
    }
  }

  return [...unique.values()];
};
