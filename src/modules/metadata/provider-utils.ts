export const stripExternalIdPrefix = (externalId: string): string => {
  const separatorIndex = externalId.indexOf(":");
  return separatorIndex === -1
    ? externalId
    : externalId.slice(separatorIndex + 1);
};

export const stripHtml = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.replace(/<[^>]*>/g, "").trim() || undefined;
};

export const wait = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};
