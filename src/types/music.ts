export type LibraryView = 'songs' | 'albums' | 'artists' | 'playlists' | 'offline';

export type RepeatMode = 'off' | 'all' | 'one';

export type SortField = 'title' | 'artist' | 'album' | 'addedAt' | 'duration' | 'playCount';

export type SortDirection = 'asc' | 'desc';

export type SongFilter = 'all' | 'favorites' | 'lossless';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  genre: string;
  year: string;
  trackNumber: number;
  duration: number;
  fileName: string;
  fileSize: number;
  format: string;
  mimeType: string;
  sampleRate?: number;
  bitrateKbps?: number;
  coverArt?: string;
  accentColor?: string;
  isFavorite: boolean;
  playCount: number;
  addedAt: number;
  lastPlayedAt?: number;
  isSample?: boolean;
}

export interface TrackMetadataUpdate {
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  genre: string;
  year: string;
  trackNumber: number;
  coverArt?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface EqBands {
  hz60: number;
  hz230: number;
  hz910: number;
  khz3_6: number;
  khz14: number;
}

export interface EqSettings {
  enabled: boolean;
  presetName: string;
  preamp: number;
  bands: EqBands;
}

export type FontOption =
  | 'system'
  | 'arial'
  | 'apple-music'
  | 'jakarta'
  | 'manrope'
  | 'serif'
  | 'mono';

export type UiScaleOption = 0.85 | 0.92 | 1 | 1.1 | 1.2;

export type SongsDisplayMode = 'list' | 'deck';

export interface PersistedSettings {
  id: string;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  fontFamily: FontOption;
  uiScale: UiScaleOption;
  lockscreenWidget: boolean;
  songsDisplayMode: SongsDisplayMode;
  eq: EqSettings;
  lastTrackId?: string;
}

export interface StorageEstimateInfo {
  usageBytes: number;
  quotaBytes: number;
  trackCount: number;
  totalAudioBytes: number;
}

export interface AlbumSummary {
  key: string;
  album: string;
  albumArtist: string;
  year: string;
  coverArt?: string;
  tracks: Track[];
  totalDuration: number;
  totalSize: number;
}

export interface ArtistSummary {
  name: string;
  tracks: Track[];
  albumCount: number;
  coverArt?: string;
  totalDuration: number;
}
