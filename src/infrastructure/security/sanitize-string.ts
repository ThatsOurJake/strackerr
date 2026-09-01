export const stripHtmlTags = (value: string): string =>
  value.replace(/<[^>]*>/g, "").trim();
