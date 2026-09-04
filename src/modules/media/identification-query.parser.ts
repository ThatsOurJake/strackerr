import type { MetadataProviderName } from "../metadata/metadata-provider.interface";

const SUPPORTED_FIELDS = ["artist", "title", "year"] as const;

type StructuredFieldName = (typeof SUPPORTED_FIELDS)[number];

export interface StructuredIdentificationFields {
  artist?: string;
  title?: string;
  year?: string;
}

export interface IdentificationProviderLookup {
  identifier: string;
}

export interface ParsedIdentificationQuery {
  raw: string;
  freeTextTerms: string[];
  fields: StructuredIdentificationFields;
  providerLookup?: IdentificationProviderLookup;
}

export interface IdentificationQueryParseError {
  message: string;
}

export interface IdentificationQueryParseResult {
  ok: boolean;
  value?: ParsedIdentificationQuery;
  error?: IdentificationQueryParseError;
}

interface ParseValueResult {
  value: string;
  nextIndex: number;
}

const isSupportedField = (token: string): token is StructuredFieldName => {
  return SUPPORTED_FIELDS.includes(token as StructuredFieldName);
};

const readQuotedValue = (input: string, startIndex: number): ParseValueResult | null => {
  if (input[startIndex] !== '"') {
    return null;
  }

  let escaped = false;
  let value = "";
  for (let index = startIndex + 1; index < input.length; index += 1) {
    const char = input[index];
    if (escaped) {
      value += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      return {
        value: value.trim(),
        nextIndex: index + 1,
      };
    }

    value += char;
  }

  return null;
};

const readToken = (input: string, startIndex: number): ParseValueResult => {
  let index = startIndex;
  while (index < input.length && !/\s/.test(input[index])) {
    index += 1;
  }

  return {
    value: input.slice(startIndex, index).trim(),
    nextIndex: index,
  };
};

const parseProviderLookup = (idValue: string): IdentificationProviderLookup | null => {
  const trimmedValue = idValue.trim();
  if (!trimmedValue) {
    return null;
  }

  return {
    identifier: trimmedValue,
  };
};

const parseFieldTerm = (
  input: string,
  index: number,
): { field: StructuredFieldName; value: string; nextIndex: number } | null => {
  const fieldMatch = input.slice(index).match(/^(artist|title|year):/i);
  if (!fieldMatch) {
    return null;
  }

  const fieldName = fieldMatch[1].toLowerCase();
  if (!isSupportedField(fieldName)) {
    return null;
  }

  const valueStart = index + fieldMatch[0].length;
  const quotedValue = readQuotedValue(input, valueStart);
  if (!quotedValue) {
    throw new Error(`Field ${fieldName} must use quotes, for example ${fieldName}:"value".`);
  }

  if (!quotedValue.value) {
    throw new Error(`Field ${fieldName} cannot be empty.`);
  }

  return {
    field: fieldName,
    value: quotedValue.value,
    nextIndex: quotedValue.nextIndex,
  };
};

export const parseIdentificationQuery = (
  rawQuery: string,
): IdentificationQueryParseResult => {
  const raw = rawQuery.trim();
  const result: ParsedIdentificationQuery = {
    raw,
    freeTextTerms: [],
    fields: {},
  };

  if (!raw) {
    return { ok: true, value: result };
  }

  let index = 0;
  try {
    while (index < raw.length) {
      while (index < raw.length && /\s/.test(raw[index])) {
        index += 1;
      }

      if (index >= raw.length) {
        break;
      }

      const field = parseFieldTerm(raw, index);
      if (field) {
        if (result.fields[field.field]) {
          return {
            ok: false,
            error: { message: `Field ${field.field} can only be provided once.` },
          };
        }
        result.fields[field.field] = field.value;
        index = field.nextIndex;
        continue;
      }

      if (raw.slice(index).toLowerCase().startsWith("id:")) {
        const idStart = index + 3;
        const quotedId = readQuotedValue(raw, idStart);
        const idValue = quotedId
          ? quotedId.value
          : readToken(raw, idStart).value;

        if (!idValue) {
          return {
            ok: false,
            error: { message: "Identifier lookup is missing a value. Use id:<identifier>." },
          };
        }

        const providerLookup = parseProviderLookup(idValue);
        if (!providerLookup) {
          return {
            ok: false,
            error: {
              message: "Identifier lookups must use id:<identifier>.",
            },
          };
        }

        result.providerLookup = providerLookup;
        index = quotedId ? quotedId.nextIndex : readToken(raw, idStart).nextIndex;
        continue;
      }

      if (raw[index] === '"') {
        const quotedTerm = readQuotedValue(raw, index);
        if (!quotedTerm) {
          return {
            ok: false,
            error: { message: "Unclosed quote found in query. Close the quote and try again." },
          };
        }
        if (quotedTerm.value) {
          result.freeTextTerms.push(quotedTerm.value);
        }
        index = quotedTerm.nextIndex;
        continue;
      }

      const token = readToken(raw, index);
      if (token.value) {
        result.freeTextTerms.push(token.value);
      }
      index = token.nextIndex;
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : "Invalid query syntax.",
      },
    };
  }

  const hasFields = Object.values(result.fields).some((value) => Boolean(value));
  const hasFreeText = result.freeTextTerms.length > 0;

  if (hasFields && hasFreeText) {
    return {
      ok: false,
      error: {
        message: "Use either structured fields (artist/title/year) or free-text search, not both.",
      },
    };
  }

  if (result.providerLookup && (hasFields || hasFreeText)) {
    return {
      ok: false,
      error: {
        message: "Use id:<identifier> on its own without additional field or free-text terms.",
      },
    };
  }

  return { ok: true, value: result };
};

export const buildProviderSearchQuery = (
  parsedQuery: ParsedIdentificationQuery,
  providerName: MetadataProviderName,
): string => {
  const artist = parsedQuery.fields.artist;
  const title = parsedQuery.fields.title;
  const year = parsedQuery.fields.year;
  const freeText = parsedQuery.freeTextTerms.join(" ").trim();

  if (providerName === "musicbrainz") {
    const parts: string[] = [];
    if (artist) {
      parts.push(`artist:"${artist}"`);
    }
    if (title) {
      parts.push(`title:"${title}"`);
    }
    if (year) {
      parts.push(`year:"${year}"`);
    }
    if (freeText) {
      parts.push(freeText);
    }
    return parts.join(" ").trim();
  }

  return [artist, title, year, freeText].filter((value) => Boolean(value)).join(" ").trim();
};
