import { MediaType } from "@prisma/client";
import { LogDayGroup, LogEntryWithMedia } from "../modules/activity/log.service";

const TYPE_DETAILS: Record<MediaType, { label: string; icon: string; accent: string; path: string }> = {
  MOVIE: { label: "Movie", icon: "film", accent: "movie", path: "movie" },
  TV_SHOW: { label: "TV show", icon: "tv-2", accent: "tv", path: "tv" },
  TV_EPISODE: { label: "TV episode", icon: "tv-2", accent: "tv", path: "tv" },
  GAME: { label: "Game", icon: "gamepad-2", accent: "game", path: "game" },
  BOARD_GAME: { label: "Board game", icon: "dice-5", accent: "boardgame", path: "board-game" },
  MUSIC_TRACK: { label: "Music", icon: "music", accent: "music", path: "music" },
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

const entrySubtitle = (entry: LogEntryWithMedia): string | null => {
  if (entry.mediaItem.type === MediaType.TV_EPISODE) {
    const season = String(entry.mediaItem.seasonNumber ?? 0).padStart(2, "0");
    const episode = String(entry.mediaItem.episodeNumber ?? 0).padStart(2, "0");
    return `S${season}E${episode} - ${entry.mediaItem.title}`;
  }
  if (entry.mediaItem.type === MediaType.GAME) {
    return entry.platform;
  }
  return null;
};

export const toEntryViewModel = (entry: LogEntryWithMedia) => {
  const details = TYPE_DETAILS[entry.mediaItem.type];
  const title = entry.mediaItem.type === MediaType.TV_EPISODE
    ? entry.mediaItem.parent?.title ?? entry.mediaItem.title
    : entry.mediaItem.title;
  return {
    id: entry.mediaItem.id,
    title,
    subtitle: entrySubtitle(entry),
    imageUrl: entry.mediaItem.imageUrl,
    duration: formatDuration(entry.duration ?? 0),
    playerCount: entry.playerCount,
    wonLabel: entry.won === null ? null : entry.won ? "Won" : "Lost",
    platform: entry.platform,
    ...details,
    detailUrl: `/collection/${details.path}/${entry.mediaItem.id}`,
  };
};

export const toDayViewModels = (groups: LogDayGroup[]) => groups.map((group) => {
  const totalMinutes = [
    ...group.entries.map((entry) => entry.duration ?? 0),
    group.musicGroup?.totalDuration ?? 0,
  ].reduce((total, duration) => total + duration, 0);
  return {
    date: group.date,
    heading: new Date(`${group.date}T12:00:00`).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    totalDuration: formatDuration(totalMinutes),
    entries: group.entries.map(toEntryViewModel),
    musicGroup: group.musicGroup ? {
      trackCount: group.musicGroup.trackCount,
      totalDuration: formatDuration(group.musicGroup.totalDuration),
    } : null,
  };
});

export const mediaTypeDetails = (type: MediaType) => TYPE_DETAILS[type];