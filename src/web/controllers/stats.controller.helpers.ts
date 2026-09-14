import { MediaType } from "@prisma/client";
import type { NostalgiaTypeBreakdownSlice, WeeklyNostalgiaInsight } from "../../modules/stats/stats.service";
import { formatDuration, mediaTypeDetails } from "../activity-view-model";

export interface WeeklyNostalgiaCardTypeTotal {
  key: string;
  label: string;
  color: string;
  duration: string;
}

export interface WeeklyNostalgiaCardThrowbackItem {
  title: string;
  year: number;
  dateLabel: string;
  label: string;
  accent: string;
  icon: string;
  imageUrl: string | null;
  detailUrl: string;
  duration: string;
}

export interface WeeklyNostalgiaCardViewModel {
  hasData: boolean;
  title: string;
  subtitle: string | null;
  aggregateTotalDuration: string | null;
  aggregateEntryCount: number;
  typeTotals: WeeklyNostalgiaCardTypeTotal[];
  throwbackItem: WeeklyNostalgiaCardThrowbackItem | null;
}

export interface YearTypeBreakdownRow {
  label: string;
  color: string;
  duration: string;
  percentage: number;
}

export const buildWeeklyNostalgiaCard = (
  insight: WeeklyNostalgiaInsight | null,
): WeeklyNostalgiaCardViewModel => {
  if (!insight) {
    return {
      hasData: false,
      title: "This week in prior years",
      subtitle: null,
      aggregateTotalDuration: null,
      aggregateEntryCount: 0,
      typeTotals: [],
      throwbackItem: null,
    };
  }

  const throwbackItem = buildThrowbackItem(insight);
  return {
    hasData: true,
    title: "This week in prior years",
    subtitle: buildNostalgiaSubtitle(insight),
    aggregateTotalDuration: formatDuration(insight.aggregateTotalMinutes),
    aggregateEntryCount: insight.aggregateEntryCount,
    typeTotals: insight.typeBreakdown.map((slice) => ({
      key: slice.key,
      label: slice.label,
      color: slice.color,
      duration: formatDuration(slice.minutes),
    })),
    throwbackItem,
  };
};

export const buildYearTypeBreakdownRows = (
  slices: NostalgiaTypeBreakdownSlice[],
  totalMinutes: number,
): YearTypeBreakdownRow[] => {
  return slices.map((slice) => ({
    label: slice.label,
    color: slice.color,
    duration: formatDuration(slice.minutes),
    percentage: totalMinutes > 0 ? Number(((slice.minutes / totalMinutes) * 100).toFixed(1)) : 0,
  }));
};

const buildThrowbackItem = (
  insight: WeeklyNostalgiaInsight,
): WeeklyNostalgiaCardThrowbackItem | null => {
  const throwbackItem = insight.throwbackItem;
  if (!throwbackItem) {
    return null;
  }

  const itemType = throwbackItem.mediaItem.type;
  const details = mediaTypeDetails(itemType);
  const resolvedId = itemType === MediaType.TV_EPISODE
    ? (throwbackItem.mediaItem.parent?.id ?? throwbackItem.mediaItem.id)
    : throwbackItem.mediaItem.id;
  const resolvedTitle = itemType === MediaType.TV_EPISODE
    ? (throwbackItem.mediaItem.parent?.title ?? throwbackItem.mediaItem.title)
    : throwbackItem.mediaItem.title;
  const resolvedImageUrl = itemType === MediaType.TV_EPISODE
    ? (throwbackItem.mediaItem.parent?.imageUrl ?? null)
    : throwbackItem.mediaItem.imageUrl;

  return {
    title: resolvedTitle,
    year: throwbackItem.year,
    dateLabel: throwbackItem.loggedAt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    label: details.label,
    accent: details.accent,
    icon: details.icon,
    imageUrl: resolvedImageUrl,
    detailUrl: `/collection/${details.path}/${resolvedId}`,
    duration: formatDuration(throwbackItem.durationMinutes),
  };
};

const buildNostalgiaSubtitle = (insight: WeeklyNostalgiaInsight): string => {
  const templates = [
    `${insight.priorYearsCount} years contribute to this week's throwback totals.`,
    `${formatDuration(insight.aggregateTotalMinutes)} logged across matching prior-year windows.`,
    "Tap to open the timeline and compare each year.",
  ];
  return templates[seededIndex(`${insight.priorYearsCount}:${insight.aggregateEntryCount}:${insight.aggregateTotalMinutes}`, templates.length)];
};

const seededIndex = (seed: string, length: number): number => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) % length;
};
