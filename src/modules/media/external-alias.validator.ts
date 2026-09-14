import { BadRequestException } from "@nestjs/common";

const PROVIDER_NAMESPACE_PATTERN = /^[a-z0-9](?:[a-z0-9._:-]{0,62}[a-z0-9])?$/;

const hasControlCharacters = (value: string): boolean => {
  for (const character of value) {
    const charCode = character.charCodeAt(0);
    if (charCode <= 31 || charCode === 127) {
      return true;
    }
  }

  return false;
};

export interface NormalizedExternalAlias {
  providerNamespace: string;
  externalId: string;
}

export const normalizeExternalAlias = (
  providerNamespace: string,
  externalId: string,
): NormalizedExternalAlias => {
  const normalizedProvider = providerNamespace.trim().toLowerCase();
  const normalizedExternalId = externalId.trim();

  if (!normalizedProvider || !PROVIDER_NAMESPACE_PATTERN.test(normalizedProvider)) {
    throw new BadRequestException("Provider namespace is invalid");
  }

  if (!normalizedExternalId) {
    throw new BadRequestException("External ID is required");
  }

  if (normalizedExternalId.length > 128) {
    throw new BadRequestException("External ID must be 128 characters or fewer");
  }

  if (hasControlCharacters(normalizedExternalId)) {
    throw new BadRequestException("External ID is invalid");
  }

  return {
    providerNamespace: normalizedProvider,
    externalId: normalizedExternalId,
  };
};
