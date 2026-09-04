import { Injectable } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import {
  LogEntryWithMedia,
  LogService,
} from "../activity/log.service";

export const STATS_PERIODS = [
  { slug: "this-week", label: "This week" },
  { slug: "last-week", label: "Last week" },
  { slug: "last-30-days", label: "Last 30 days" },
  { slug: "last-3-months", label: "Last 3 months" },
  { slug: "last-6-months", label: "Last 6 months" },
  { slug: "this-year", label: "This year" },
  { slug: "last-year", label: "Last year" },
  { slug: "all-time", label: "All time" },
] as const;

export type StatsPeriodSlug = (typeof STATS_PERIODS)[number]["slug"];

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ActivityChartData {
  labels: string[];
  values: number[];
  series: ActivityChartSeries[];
}

export interface ActivityChartSeries {
  key: "movie" | "tv" | "game" | "boardgame" | "music";
  label: string;
  color: string;
  values: number[];
}

export interface TopItem {
  mediaItem: LogEntryWithMedia["mediaItem"];
  totalMinutes: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly logService: LogService) { }

  isValidPeriod(period: string): period is StatsPeriodSlug {
    return STATS_PERIODS.some(({ slug }) => slug === period);
  }

  resolveDateRange(slug: StatsPeriodSlug, now = new Date()): DateRange | null {
    const todayEnd = StatsService.endOfDay(now);
    const todayStart = StatsService.startOfDay(now);

    if (slug === "all-time") {
      return null;
    }

    if (slug === "this-week") {
      return { from: StatsService.startOfWeek(todayStart), to: todayEnd };
    }

    if (slug === "last-week") {
      const thisWeek = StatsService.startOfWeek(todayStart);
      const from = new Date(thisWeek);
      from.setDate(from.getDate() - 7);
      const to = new Date(thisWeek);
      to.setMilliseconds(-1);
      return { from, to };
    }

    if (slug === "this-year") {
      return { from: new Date(now.getFullYear(), 0, 1), to: todayEnd };
    }

    if (slug === "last-year") {
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear(), 0, 1, 0, 0, 0, -1),
      };
    }

    const from = new Date(todayStart);
    if (slug === "last-30-days") {
      from.setDate(from.getDate() - 29);
    } else {
      from.setMonth(from.getMonth() - (slug === "last-3-months" ? 3 : 6));
    }

    return { from, to: todayEnd };
  }

  async totalTimeByType(
    userId: string,
    range: DateRange | null,
  ): Promise<Partial<Record<MediaType, number>>> {
    const entries = await this.findEntries(userId, range);
    return entries.reduce<Partial<Record<MediaType, number>>>((totals, entry) => {
      const type = entry.mediaItem.type;
      totals[type] = (totals[type] ?? 0) + (entry.duration ?? 0);
      return totals;
    }, {});
  }

  async activityChart(
    userId: string,
    slug: StatsPeriodSlug,
    range: DateRange | null,
  ): Promise<ActivityChartData> {
    const entries = await this.findEntries(userId, range);
    return this.buildChart(entries, slug, range);
  }

  async topItems(
    userId: string,
    range: DateRange | null,
    limit = 10,
  ): Promise<TopItem[]> {
    const entries = await this.findEntries(userId, range);
    const items = new Map<string, TopItem>();

    for (const entry of entries) {
      const item = items.get(entry.mediaItemId) ?? {
        mediaItem: entry.mediaItem,
        totalMinutes: 0,
      };
      item.totalMinutes += entry.duration ?? 0;
      items.set(entry.mediaItemId, item);
    }

    return [...items.values()]
      .sort((left, right) => right.totalMinutes - left.totalMinutes)
      .slice(0, limit);
  }

  private findEntries(
    userId: string,
    range: DateRange | null,
  ): Promise<LogEntryWithMedia[]> {
    return this.logService.findByUser(userId, {
      dateFrom: range?.from,
      dateTo: range?.to,
    });
  }

  private buildChart(
    entries: LogEntryWithMedia[],
    slug: StatsPeriodSlug,
    range: DateRange | null,
  ): ActivityChartData {
    if (slug === "all-time") {
      const years = entries.map((entry) => entry.loggedAt.getFullYear());
      const currentYear = new Date().getFullYear();
      const firstYear = years.length > 0 ? Math.min(...years) : currentYear;
      const labels = Array.from(
        { length: currentYear - firstYear + 1 },
        (_, index) => String(firstYear + index),
      );
      return this.sumByLabels(entries, labels, (date) => String(date.getFullYear()));
    }

    if (slug === "this-year" || slug === "last-year") {
      const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return this.sumByLabels(entries, labels, (date) => labels[date.getMonth()]);
    }

    if (slug === "this-week" || slug === "last-week") {
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return this.sumByLabels(entries, labels, (date) => labels[(date.getDay() + 6) % 7]);
    }

    if (slug === "last-30-days") {
      const labels = StatsService.dateLabels(range?.from, range?.to);
      return this.sumByLabels(entries, labels, StatsService.shortDateKey);
    }

    const labels = StatsService.weekLabels(range?.from, range?.to);
    return this.sumByLabels(entries, labels, (date) => StatsService.weekKey(date));
  }

  private sumByLabels(
    entries: LogEntryWithMedia[],
    labels: string[],
    labelForDate: (date: Date) => string,
  ): ActivityChartData {
    const totals = new Map(labels.map((label) => [label, 0]));
    const labelIndexByLabel = new Map(labels.map((label, index) => [label, index]));
    const seriesByKey = new Map(
      CHART_SERIES.map((item) => [
        item.key,
        {
          key: item.key,
          label: item.label,
          color: item.color,
          values: labels.map(() => 0),
        },
      ]),
    );

    for (const entry of entries) {
      const label = labelForDate(entry.loggedAt);
      if (totals.has(label)) {
        const minutes = entry.duration ?? 0;
        totals.set(label, (totals.get(label) ?? 0) + minutes);

        const seriesKey = StatsService.chartSeriesKey(entry.mediaItem.type);
        const series = seriesByKey.get(seriesKey);
        const labelIndex = labelIndexByLabel.get(label) ?? -1;
        if (series && labelIndex >= 0) {
          series.values[labelIndex] += minutes;
        }
      }
    }

    return {
      labels,
      values: labels.map((label) => totals.get(label) ?? 0),
      series: [...seriesByKey.values()].filter((item) =>
        item.values.some((value) => value > 0),
      ),
    };
  }

  private static chartSeriesKey(
    type: MediaType,
  ): ActivityChartSeries["key"] {
    if (type === MediaType.MOVIE) {
      return "movie";
    }
    if (type === MediaType.TV_SHOW || type === MediaType.TV_EPISODE) {
      return "tv";
    }
    if (type === MediaType.GAME) {
      return "game";
    }
    if (type === MediaType.BOARD_GAME) {
      return "boardgame";
    }
    return "music";
  }

  private static startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private static endOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private static startOfWeek(date: Date): Date {
    const start = new Date(date);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
  }

  private static shortDateKey(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  private static dateLabels(from?: Date, to?: Date): string[] {
    if (!from || !to) {
      return [];
    }
    const labels: string[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      labels.push(StatsService.shortDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return labels;
  }

  private static weekKey(date: Date): string {
    const weekStart = StatsService.startOfWeek(StatsService.startOfDay(date));
    return StatsService.shortDateKey(weekStart);
  }

  private static weekLabels(from?: Date, to?: Date): string[] {
    if (!from || !to) {
      return [];
    }
    const labels: string[] = [];
    const cursor = StatsService.startOfWeek(from);
    while (cursor <= to) {
      labels.push(StatsService.shortDateKey(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return labels;
  }
}

const CHART_SERIES: Array<
  Pick<ActivityChartSeries, "key" | "label" | "color">
> = [
    { key: "movie", label: "Movie", color: "#F59E0B" },
    { key: "tv", label: "TV", color: "#3B82F6" },
    { key: "game", label: "Game", color: "#22C55E" },
    { key: "boardgame", label: "Board game", color: "#F97316" },
    { key: "music", label: "Music", color: "#EC4899" },
  ];
