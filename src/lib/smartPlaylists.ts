import { Playlist, SmartPlaylistRules, Track } from '../types/music';
import { isLosslessFormat } from './formatters';

export const DEFAULT_SMART_RULES: SmartPlaylistRules = {
  genres: [],
  addedWithin: '30d',
  minPlayCount: 0,
  favoritesOnly: false,
  losslessOnly: false,
  sortBy: 'addedAt-desc',
  limit: 25,
};

export interface SmartPlaylistPreset {
  id: string;
  label: string;
  suggestedName: string;
  rules: SmartPlaylistRules;
}

export const SMART_PLAYLIST_PRESETS: SmartPlaylistPreset[] = [
  {
    id: 'recent',
    label: 'Recently Added',
    suggestedName: 'Recently Added',
    rules: {
      genres: [],
      addedWithin: '30d',
      minPlayCount: 0,
      favoritesOnly: false,
      losslessOnly: false,
      sortBy: 'addedAt-desc',
      limit: 25,
    },
  },
  {
    id: 'most-played',
    label: 'Most Played',
    suggestedName: 'Most Played',
    rules: {
      genres: [],
      addedWithin: 'any',
      minPlayCount: 1,
      favoritesOnly: false,
      losslessOnly: false,
      sortBy: 'playCount-desc',
      limit: 25,
    },
  },
  {
    id: 'favorites',
    label: 'Favorites',
    suggestedName: 'Liked Rotation',
    rules: {
      genres: [],
      addedWithin: 'any',
      minPlayCount: 0,
      favoritesOnly: true,
      losslessOnly: false,
      sortBy: 'playCount-desc',
      limit: null,
    },
  },
  {
    id: 'lossless',
    label: 'Lossless Hi-Fi',
    suggestedName: 'Lossless Vault',
    rules: {
      genres: [],
      addedWithin: 'any',
      minPlayCount: 0,
      favoritesOnly: false,
      losslessOnly: true,
      sortBy: 'addedAt-desc',
      limit: null,
    },
  },
  {
    id: 'genre',
    label: 'Genre Mix',
    suggestedName: 'Genre Mix',
    rules: {
      genres: [],
      addedWithin: 'any',
      minPlayCount: 0,
      favoritesOnly: false,
      losslessOnly: false,
      sortBy: 'playCount-desc',
      limit: 50,
    },
  },
];

export function extractTrackGenres(raw?: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/[,;/|]+/)
    .map((g) => g.trim())
    .filter(Boolean);
}

export function extractLibraryGenres(tracks: Track[]): Array<{ genre: string; count: number }> {
  const counts = new Map<string, { label: string; count: number }>();
  for (const trk of tracks) {
    const seenOnTrack = new Set<string>();
    for (const g of extractTrackGenres(trk.genre)) {
      const key = g.toLowerCase();
      if (seenOnTrack.has(key)) continue;
      seenOnTrack.add(key);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label: g, count: 1 });
      }
    }
  }
  return Array.from(counts.values())
    .map((entry) => ({ genre: entry.label, count: entry.count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}

export function evaluateSmartPlaylist(
  tracks: Track[],
  rules: SmartPlaylistRules,
  now = Date.now()
): Track[] {
  const genreSet = new Set(rules.genres.map((g) => g.trim().toLowerCase()).filter(Boolean));
  const windowDays =
    rules.addedWithin === '7d'
      ? 7
      : rules.addedWithin === '30d'
      ? 30
      : rules.addedWithin === '90d'
      ? 90
      : null;
  const minAddedAt = windowDays !== null ? now - windowDays * 86_400_000 : null;

  const matched = tracks.filter((trk) => {
    if (rules.favoritesOnly && !trk.isFavorite) return false;
    if (rules.losslessOnly && !isLosslessFormat(trk.format)) return false;
    if (rules.minPlayCount > 0 && (trk.playCount || 0) < rules.minPlayCount) return false;
    if (minAddedAt !== null && (trk.addedAt || 0) < minAddedAt) return false;
    if (genreSet.size > 0) {
      const trkGenres = extractTrackGenres(trk.genre).map((g) => g.toLowerCase());
      const rawLower = (trk.genre || '').trim().toLowerCase();
      const hasMatch =
        genreSet.has(rawLower) || trkGenres.some((g) => genreSet.has(g));
      if (!hasMatch) return false;
    }
    return true;
  });

  const sorted = [...matched].sort((a, b) => {
    if (rules.sortBy === 'playCount-desc') {
      return (
        (b.playCount || 0) - (a.playCount || 0) ||
        (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0) ||
        (b.addedAt || 0) - (a.addedAt || 0)
      );
    }
    if (rules.sortBy === 'lastPlayedAt-desc') {
      return (
        (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0) ||
        (b.playCount || 0) - (a.playCount || 0)
      );
    }
    if (rules.sortBy === 'title-asc') {
      return a.title.localeCompare(b.title);
    }
    if (rules.sortBy === 'duration-desc') {
      return (b.duration || 0) - (a.duration || 0);
    }
    return (b.addedAt || 0) - (a.addedAt || 0);
  });

  if (rules.limit !== null && rules.limit > 0) {
    return sorted.slice(0, rules.limit);
  }
  return sorted;
}

export function resolvePlaylistTracks(playlist: Playlist, allTracks: Track[]): Track[] {
  if (playlist.isSmart && playlist.smartRules) {
    return evaluateSmartPlaylist(allTracks, playlist.smartRules);
  }
  const byId = new Map<string, Track>();
  for (const t of allTracks) byId.set(t.id, t);
  return playlist.trackIds
    .map((id) => byId.get(id))
    .filter((t): t is Track => Boolean(t));
}

export function describeSmartRules(rules: SmartPlaylistRules): string {
  const parts: string[] = [];
  if (rules.genres.length > 0) {
    parts.push(
      rules.genres.length === 1
        ? `Genre: ${rules.genres[0]}`
        : `Genres: ${rules.genres.slice(0, 2).join(', ')}${rules.genres.length > 2 ? ` +${rules.genres.length - 2}` : ''}`
    );
  }
  if (rules.addedWithin === '7d') parts.push('Last 7 days');
  else if (rules.addedWithin === '30d') parts.push('Last 30 days');
  else if (rules.addedWithin === '90d') parts.push('Last 90 days');

  if (rules.minPlayCount > 0) parts.push(`${rules.minPlayCount}+ plays`);
  if (rules.favoritesOnly) parts.push('Favorites');
  if (rules.losslessOnly) parts.push('Lossless');

  const sortLabel =
    rules.sortBy === 'playCount-desc'
      ? 'Most played'
      : rules.sortBy === 'lastPlayedAt-desc'
      ? 'Recently played'
      : rules.sortBy === 'title-asc'
      ? 'A–Z'
      : rules.sortBy === 'duration-desc'
      ? 'Longest first'
      : 'Newest first';
  parts.push(sortLabel);

  if (rules.limit !== null) parts.push(`Top ${rules.limit}`);
  return parts.join(' · ');
}
