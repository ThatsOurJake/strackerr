import { MediaType } from "@prisma/client";
import {
  CollectionFilters,
  CollectionMediaType,
  CollectionPage,
  MediaDetail,
} from "../modules/collection/collection.service";
import { formatDuration, mediaTypeDetails } from "./activity-view-model";

const TYPE_FILTERS: Array<{ type?: CollectionMediaType; label: string; slug?: string }> = [
  { label: "All" },
  { type: MediaType.MOVIE, label: "Movies", slug: "movie" },
  { type: MediaType.TV_SHOW, label: "TV shows", slug: "tv" },
  { type: MediaType.GAME, label: "Games", slug: "game" },
  { type: MediaType.BOARD_GAME, label: "Board games", slug: "board-game" },
  { type: MediaType.MUSIC_TRACK, label: "Music", slug: "music" },
];

export const typeFromSlug = (slug?: string): CollectionMediaType | undefined =>
  TYPE_FILTERS.find((filter) => filter.slug === slug)?.type;

const queryUrl = (
  base: string,
  filters: CollectionFilters,
  overrides: Partial<CollectionFilters> = {},
): string => {
  const values = { ...filters, ...overrides };
  const parameters = new URLSearchParams();
  const typeFilter = TYPE_FILTERS.find((filter) => filter.type === values.type);
  if (typeFilter?.slug) {
    parameters.set("type", typeFilter.slug);
  }
  if (values.unidentified) {
    parameters.set("filter", "unidentified");
  }
  if (values.letter) {
    parameters.set("letter", values.letter);
  }
  if (values.page && values.page > 1) {
    parameters.set("page", String(values.page));
  }
  const query = parameters.toString();
  return query ? `${base}?${query}` : base;
};

export const toCollectionViewModel = (page: CollectionPage, filters: CollectionFilters) => ({
  typeFilters: TYPE_FILTERS.map((filter) => {
    const nextFilters = { ...filters, type: filter.type, page: 1 };
    return {
      ...filter,
      active: filter.type === filters.type,
      url: queryUrl("/collection", nextFilters),
      partialUrl: queryUrl("/collection/partial", nextFilters),
    };
  }),
  unidentified: {
    active: filters.unidentified,
    url: queryUrl("/collection", filters, { unidentified: !filters.unidentified, page: 1 }),
    partialUrl: queryUrl("/collection/partial", filters, { unidentified: !filters.unidentified, page: 1 }),
  },
  letters: ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letter) => ({
    label: letter,
    active: filters.letter === letter,
    enabled: page.availableLetters.has(letter),
    url: queryUrl("/collection", filters, { letter, page: 1 }),
    partialUrl: queryUrl("/collection/partial", filters, { letter, page: 1 }),
  })),
  clearLetterUrl: queryUrl("/collection", filters, { letter: undefined, page: 1 }),
  clearLetterPartialUrl: queryUrl("/collection/partial", filters, { letter: undefined, page: 1 }),
  items: page.items.map((item) => {
    const details = mediaTypeDetails(item.type);
    return {
      ...item,
      ...details,
      detailUrl: `/items/${item.id}`,
      identifyUrl: item.isSkeleton
        ? `/collection/${details.path}/${item.id}/identify`
        : null,
    };
  }),
  hasItems: page.items.length > 0,
  totalItems: page.totalItems,
  page: page.page,
  totalPages: page.totalPages,
  previous: page.page > 1 ? {
    url: queryUrl("/collection", filters, { page: page.page - 1 }),
    partialUrl: queryUrl("/collection/partial", filters, { page: page.page - 1 }),
  } : null,
  next: page.page < page.totalPages ? {
    url: queryUrl("/collection", filters, { page: page.page + 1 }),
    partialUrl: queryUrl("/collection/partial", filters, { page: page.page + 1 }),
  } : null,
});

const formatDate = (date: Date): string => date.toLocaleDateString("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const toMediaDetailViewModel = (item: MediaDetail) => {
  const details = mediaTypeDetails(item.type);
  const directDuration = item.logEntries.reduce((total, entry) => total + (entry.duration ?? 0), 0);
  const sessions = item.logEntries.map((entry) => ({
    ...entry,
    date: formatDate(entry.loggedAt),
    durationLabel: entry.duration === null ? null : formatDuration(entry.duration),
    outcome: entry.won === null ? null : entry.won ? "Won" : "Lost",
  }));
  const seasons = new Map<number, Array<MediaDetail["episodes"][number]>>();
  for (const episode of item.episodes) {
    const seasonNumber = episode.seasonNumber ?? 0;
    seasons.set(seasonNumber, [...(seasons.get(seasonNumber) ?? []), episode]);
  }
  const episodeDuration = item.episodes.reduce(
    (total, episode) => total + episode.logEntries.reduce(
      (episodeTotal, entry) => episodeTotal + (entry.duration ?? 0),
      0,
    ),
    0,
  );

  return {
    ...item,
    ...details,
    title: item.title,
    itemUrl: `/items/${item.id}`,
    editUrl: `/items/${item.id}/edit`,
    identifyUrl: `/collection/${details.path}/${item.id}/identify`,
    identifyActionLabel: item.isSkeleton ? "Identify" : "Reidentify",
    artist: item.type === MediaType.MUSIC_TRACK ? item.description : null,
    description: item.type === MediaType.MUSIC_TRACK ? null : item.description,
    totalCount: item.logEntries.length,
    totalDuration: formatDuration(directDuration),
    sessions,
    hasSessions: sessions.length > 0,
    episodesWatched: item.episodes.filter((episode) => episode.logEntries.length > 0).length,
    episodeDuration: formatDuration(episodeDuration + directDuration),
    seasons: [...seasons.entries()].map(([seasonNumber, episodes]) => ({
      seasonNumber,
      episodes: episodes.map((episode) => {
        const totalMinutes = episode.logEntries.reduce(
          (total, entry) => total + (entry.duration ?? 0),
          0,
        );
        return {
          ...episode,
          watchCount: episode.logEntries.length,
          watched: episode.logEntries.length > 0,
          totalDuration: formatDuration(totalMinutes),
        };
      }),
    })),
  };
};

export const toItemEditViewModel = (
  item: MediaDetail,
  values?: {
    title?: string;
    description?: string;
    removeLogEntryIds?: string[];
    aliases?: Array<{ rowKey: string; id?: string; providerNamespace: string; externalId: string; remove: boolean }>;
  },
) => {
  const details = mediaTypeDetails(item.type);
  const canonicalIdentity = item.externalIds?.[0] ?? null;
  const historyRows = [
    ...item.logEntries.map((entry) => ({
      id: entry.id,
      date: formatDate(entry.loggedAt),
      durationLabel: entry.duration === null ? "No duration" : formatDuration(entry.duration),
      sourceLabel: item.title,
      loggedAt: entry.loggedAt,
    })),
    ...item.episodes.flatMap((episode) =>
      episode.logEntries.map((entry) => ({
        id: entry.id,
        date: formatDate(entry.loggedAt),
        durationLabel: entry.duration === null ? "No duration" : formatDuration(entry.duration),
        sourceLabel: `S${episode.seasonNumber ?? 0}E${episode.episodeNumber ?? 0} - ${episode.title}`,
        loggedAt: entry.loggedAt,
      })),
    ),
  ].sort((left, right) => right.loggedAt.getTime() - left.loggedAt.getTime());

  const selectedRemovals = new Set(values?.removeLogEntryIds ?? []);
  const aliases = values?.aliases ?? item.externalAliases.map((alias) => ({
    rowKey: alias.id,
    id: alias.id,
    providerNamespace: alias.providerNamespace,
    externalId: alias.externalId,
    remove: false,
  }));

  return {
    ...item,
    ...details,
    itemUrl: `/items/${item.id}`,
    saveUrl: `/items/${item.id}/edit`,
    cancelUrl: `/items/${item.id}`,
    itemId: item.id,
    hasCanonicalIdentity: Boolean(canonicalIdentity),
    canonicalIdentityProvider: canonicalIdentity?.provider ?? null,
    canonicalIdentityExternalId: canonicalIdentity?.externalId ?? null,
    titleValue: values?.title ?? item.title,
    descriptionValue: values?.description ?? item.description ?? "",
    historyRows: historyRows.map((row) => ({
      ...row,
      selected: selectedRemovals.has(row.id),
    })),
    hasHistoryRows: historyRows.length > 0,
    aliases,
    hasAliases: aliases.length > 0,
    selectedHistoryCount: [...selectedRemovals].length,
    selectedAliasRemovalCount: aliases.filter((alias) => alias.remove).length,
  };
};
