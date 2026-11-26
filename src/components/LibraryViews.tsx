import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FolderPlus,
  Gauge,
  HardDrive,
  Heart,
  Layers,
  List,
  ListMusic,
  Maximize2,
  Mic2,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shuffle,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { FONT_PRESETS, UI_SCALE_PRESETS } from '../lib/fonts';
import { formatBytes, formatDuration, isLosslessFormat } from '../lib/formatters';
import {
  AlbumSummary,
  ArtistSummary,
  FontOption,
  LibraryView,
  Playlist,
  SongFilter,
  SongsDisplayMode,
  SortDirection,
  SortField,
  StorageEstimateInfo,
  Track,
  UiScaleOption,
} from '../types/music';
import { CoverArt } from './CoverArt';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';
import { SongDeckView } from './SongDeckView';
import { TrackRow } from './TrackRow';

interface LibraryViewsProps {
  activeView: LibraryView;
  tracks: Track[];
  playlists: Playlist[];
  activePlaylistId: string | null;
  currentTrackId: string | null;
  isPlaying: boolean;
  storageStats: StorageEstimateInfo;
  isImporting: boolean;
  importProgressText: string | null;
  onSelectView: (view: LibraryView) => void;
  onSelectPlaylist: (id: string | null) => void;
  onImportFiles: () => void;
  onImportFolder: () => void;
  onPlayTrackList: (list: Track[], startIndex: number) => void;
  onShuffleTrackList: (list: Track[]) => void;
  onPlayNext: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveFromPlaylist: (playlistId: string, trackId: string) => void;
  onCreatePlaylist: () => void;
  onRenamePlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onEditTrack: (track: Track) => void;
  onDeleteTrack: (trackId: string) => void;
  onExportManifest: () => void;
  onClearLibrary: () => Promise<void>;
  onOpenEq: () => void;
  onOpenSettings: () => void;
  fontFamily: FontOption;
  onSelectFont: (font: FontOption) => void;
  uiScale: UiScaleOption;
  onSelectUiScale: (scale: UiScaleOption) => void;
  lockscreenWidget: boolean;
  onToggleLockscreenWidget: (enabled: boolean) => void;
  songsDisplayMode: SongsDisplayMode;
  onSelectSongsDisplayMode: (mode: SongsDisplayMode) => void;
  playbackRate: number;
  activeTrackBitrateKbps?: number;
  onChangePlaybackRate: (rate: number) => void;
  onTogglePlay: () => void;
}

export const LibraryViews: React.FC<LibraryViewsProps> = ({
  activeView,
  tracks,
  playlists,
  activePlaylistId,
  currentTrackId,
  isPlaying,
  storageStats,
  isImporting,
  importProgressText,
  onSelectView,
  onSelectPlaylist,
  onImportFiles,
  onImportFolder,
  onPlayTrackList,
  onShuffleTrackList,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onEditTrack,
  onDeleteTrack,
  onExportManifest,
  onClearLibrary,
  onOpenEq,
  onOpenSettings,
  fontFamily,
  onSelectFont,
  uiScale,
  onSelectUiScale,
  lockscreenWidget,
  onToggleLockscreenWidget,
  songsDisplayMode,
  onSelectSongsDisplayMode,
  playbackRate,
  activeTrackBitrateKbps,
  onChangePlaybackRate,
  onTogglePlay,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [songFilter, setSongFilter] = useState<SongFilter>('all');
  const [sortField, setSortField] = useState<SortField>('addedAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedAlbumKey, setSelectedAlbumKey] = useState<string | null>(null);
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(null);
  const [selectedSmartMix, setSelectedSmartMix] = useState<'recent' | 'most-played' | 'favorites' | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredSongs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = tracks.filter((t) => {
      if (songFilter === 'favorites' && !t.isFavorite) return false;
      if (songFilter === 'lossless' && !isLosslessFormat(t.format)) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'artist') cmp = a.artist.localeCompare(b.artist);
      else if (sortField === 'album') cmp = a.album.localeCompare(b.album);
      else if (sortField === 'duration') cmp = a.duration - b.duration;
      else if (sortField === 'playCount') cmp = a.playCount - b.playCount;
      else cmp = a.addedAt - b.addedAt;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [tracks, searchQuery, songFilter, sortField, sortDir]);

  const albums = useMemo<AlbumSummary[]>(() => {
    const map = new Map<string, AlbumSummary>();
    const q = searchQuery.trim().toLowerCase();
    for (const trk of tracks) {
      const key = `${trk.album}__${trk.albumArtist || trk.artist}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          album: trk.album,
          albumArtist: trk.albumArtist || trk.artist,
          year: trk.year,
          coverArt: trk.coverArt,
          tracks: [trk],
          totalDuration: trk.duration,
          totalSize: trk.fileSize,
        });
      } else {
        existing.tracks.push(trk);
        existing.totalDuration += trk.duration;
        existing.totalSize += trk.fileSize;
        if (!existing.coverArt && trk.coverArt) existing.coverArt = trk.coverArt;
      }
    }
    const list = Array.from(map.values()).map((a) => ({
      ...a,
      tracks: [...a.tracks].sort((x, y) => (x.trackNumber || 999) - (y.trackNumber || 999)),
    }));
    return list
      .filter((a) => !q || a.album.toLowerCase().includes(q) || a.albumArtist.toLowerCase().includes(q))
      .sort((a, b) => a.album.localeCompare(b.album));
  }, [tracks, searchQuery]);

  const artists = useMemo<ArtistSummary[]>(() => {
    const map = new Map<string, { name: string; tracks: Track[]; albums: Set<string>; coverArt?: string; totalDuration: number }>();
    const q = searchQuery.trim().toLowerCase();
    for (const trk of tracks) {
      const name = trk.artist || 'Unknown Artist';
      const existing = map.get(name);
      if (!existing) {
        map.set(name, {
          name,
          tracks: [trk],
          albums: new Set([trk.album]),
          coverArt: trk.coverArt,
          totalDuration: trk.duration,
        });
      } else {
        existing.tracks.push(trk);
        existing.albums.add(trk.album);
        existing.totalDuration += trk.duration;
        if (!existing.coverArt && trk.coverArt) existing.coverArt = trk.coverArt;
      }
    }
    return Array.from(map.values())
      .map((a) => ({
        name: a.name,
        tracks: a.tracks,
        albumCount: a.albums.size,
        coverArt: a.coverArt,
        totalDuration: a.totalDuration,
      }))
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks, searchQuery]);

  const formatBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; bytes: number }>();
    for (const t of tracks) {
      const cur = map.get(t.format) ?? { count: 0, bytes: 0 };
      cur.count += 1;
      cur.bytes += t.fileSize;
      map.set(t.format, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].bytes - a[1].bytes);
  }, [tracks]);

  const activeAlbum = albums.find((a) => a.key === selectedAlbumKey) ?? null;
  const activeArtist = artists.find((a) => a.name === selectedArtistName) ?? null;
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) ?? null;

  const smartMixTracks = useMemo(() => {
    if (selectedSmartMix === 'favorites') {
      return tracks.filter((t) => t.isFavorite);
    }
    if (selectedSmartMix === 'most-played') {
      return [...tracks].sort((a, b) => b.playCount - a.playCount).slice(0, 25);
    }
    if (selectedSmartMix === 'recent') {
      return [...tracks].sort((a, b) => b.addedAt - a.addedAt).slice(0, 25);
    }
    return [];
  }, [selectedSmartMix, tracks]);

  // Empty Library Onboarding Hero
  if (tracks.length === 0 && activeView !== 'offline') {
    return (
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 lg:hidden">
          <span className="font-display text-xl font-bold text-white">GrooveR</span>
          <div className="flex items-center gap-1.5">
            <OfflineIndicator />
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={onOpenSettings}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-200 hover:text-white"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <section className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#111318]">
          <div className="relative h-56 sm:h-72 w-full overflow-hidden">
            <img
              src="/src/assets/images/empty_library_backdrop_1795158173389.jpg"
              alt="High-fidelity dark studio turntable and planar headphones"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-[#111318]/65 to-transparent" />
          </div>

          <div className="px-6 sm:px-10 pb-8 -mt-12 relative z-10 space-y-5">
            <div className="space-y-2 max-w-2xl">
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight text-balance">
                Your offline OnePlus 15R music vault
              </h1>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                Import local MP3, FLAC, M4A, WAV, or OGG tracks directly onto your device. Artwork, ID3 tags, 5-band EQ, and playlists work 100% offline.
              </p>
            </div>

            {isImporting && importProgressText && (
              <p className="text-xs font-mono-nums text-[#64AEFF]">{importProgressText}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onImportFiles}
                disabled={isImporting}
                className="min-h-[48px] px-5 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>Import Music Files</span>
              </button>

              <button
                type="button"
                onClick={onImportFolder}
                disabled={isImporting}
                className="min-h-[48px] px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-100 text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <FolderPlus className="w-4 h-4 shrink-0 text-zinc-300" />
                <span>Scan Music Folder</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-7xl mx-auto space-y-6">
      {/* Mobile Compact Header */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <span className="font-display text-xl font-bold text-white">GrooveR</span>
        <div className="flex items-center gap-1.5">
          <OfflineIndicator />
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={onOpenEq}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-200 hover:text-white"
            aria-label="Open equalizer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#2E8BFF]" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.05] text-zinc-200 hover:text-white"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onImportFiles}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#2E8BFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Desktop Top Context Strip */}
      <div className="hidden lg:flex items-center justify-between gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, albums, artists, or genres"
            className="w-full min-h-[42px] pl-10 pr-4 rounded-xl bg-[#111318] border border-white/[0.08] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#2E8BFF]"
          />
        </div>
        <div className="flex items-center gap-3">
          {isImporting && importProgressText && (
            <span className="text-xs font-mono-nums text-[#64AEFF]">{importProgressText}</span>
          )}
          <OfflineIndicator />
        </div>
      </div>

      {/* Mobile Search Bar */}
      {activeView !== 'offline' && (
        <div className="relative lg:hidden">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offline library"
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[#111318] border border-white/[0.08] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#2E8BFF]"
          />
        </div>
      )}

      {/* SONGS VIEW */}
      {activeView === 'songs' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                My Music
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-mono-nums">
                {filteredSongs.length} {filteredSongs.length === 1 ? 'song' : 'songs'} ·{' '}
                {formatDuration(filteredSongs.reduce((s, t) => s + t.duration, 0))} total
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={filteredSongs.length === 0}
                onClick={() => onPlayTrackList(filteredSongs, 0)}
                className="min-h-[44px] px-4 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play All</span>
              </button>
              <button
                type="button"
                disabled={filteredSongs.length === 0}
                onClick={() => onShuffleTrackList(filteredSongs)}
                className="min-h-[44px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 text-zinc-100 text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>
            </div>
          </div>

          {/* Filter & Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111318] border border-white/[0.07]">
              {(
                [
                  { id: 'all', label: 'All Songs' },
                  { id: 'favorites', label: 'Favorites' },
                  { id: 'lossless', label: 'Lossless' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSongFilter(tab.id)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    songFilter === tab.id
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex items-center gap-1 p-1 rounded-xl bg-[#111318] border border-white/[0.07]"
                role="group"
                aria-label="Songs display layout"
              >
                <button
                  type="button"
                  onClick={() => onSelectSongsDisplayMode('list')}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    songsDisplayMode === 'list'
                      ? 'bg-[#2E8BFF] text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  aria-pressed={songsDisplayMode === 'list'}
                  aria-label="List view"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSongsDisplayMode('deck')}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    songsDisplayMode === 'deck'
                      ? 'bg-[#2E8BFF] text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  aria-pressed={songsDisplayMode === 'deck'}
                  aria-label="Deck of cards view"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Deck</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onSelectView('artists')}
                className="lg:hidden min-h-[38px] px-3 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs font-medium text-zinc-300 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Mic2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Artists</span>
              </button>

              <select
                aria-label="Sort songs by"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="min-h-[38px] px-3 rounded-xl bg-[#111318] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-[#2E8BFF]"
              >
                <option value="addedAt">Date Added</option>
                <option value="title">Title</option>
                <option value="artist">Artist</option>
                <option value="album">Album</option>
                <option value="duration">Duration</option>
                <option value="playCount">Most Played</option>
              </select>

              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="min-h-[38px] px-3 rounded-xl bg-[#111318] border border-white/[0.08] text-xs font-mono-nums text-zinc-300 hover:text-white whitespace-nowrap"
                aria-label="Toggle sort direction"
              >
                {sortDir === 'asc' ? 'A–Z' : 'Z–A'}
              </button>
            </div>
          </div>

          {/* Track List or Deck of Cards */}
          {filteredSongs.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-[#111318] border border-white/[0.06]">
              <p className="text-sm font-medium text-zinc-300">No matching tracks</p>
              <p className="text-xs text-zinc-500 mt-1">
                Try clearing your search or switching filters.
              </p>
            </div>
          ) : songsDisplayMode === 'deck' ? (
            <SongDeckView
              tracks={filteredSongs}
              currentTrackId={currentTrackId}
              isPlaying={isPlaying}
              playlists={playlists}
              onPlayTrack={(idx) => onPlayTrackList(filteredSongs, idx)}
              onTogglePlay={onTogglePlay}
              onPlayNext={onPlayNext}
              onAddToQueue={onAddToQueue}
              onToggleFavorite={onToggleFavorite}
              onAddToPlaylist={onAddToPlaylist}
              onEditTrack={onEditTrack}
              onDeleteTrack={onDeleteTrack}
            />
          ) : (
            <div className="divide-y divide-white/[0.04] rounded-2xl bg-[#111318]/60 border border-white/[0.06] p-1.5">
              {filteredSongs.map((trk, idx) => (
                <TrackRow
                  key={trk.id}
                  track={trk}
                  index={idx}
                  isActive={trk.id === currentTrackId}
                  isPlaying={isPlaying}
                  playlists={playlists}
                  onPlay={() => onPlayTrackList(filteredSongs, idx)}
                  onPlayNext={() => onPlayNext(trk)}
                  onAddToQueue={() => onAddToQueue(trk)}
                  onToggleFavorite={() => onToggleFavorite(trk.id)}
                  onAddToPlaylist={(plId) => onAddToPlaylist(plId, trk.id)}
                  onEdit={() => onEditTrack(trk)}
                  onDelete={() => onDeleteTrack(trk.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ALBUMS VIEW */}
      {activeView === 'albums' && (
        <section className="space-y-5">
          {activeAlbum ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setSelectedAlbumKey(null)}
                className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Albums</span>
              </button>

              <div className="flex flex-col sm:flex-row sm:items-end gap-5 p-5 rounded-3xl bg-[#111318] border border-white/[0.07]">
                <CoverArt
                  src={activeAlbum.coverArt}
                  alt={activeAlbum.album}
                  className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl shadow-xl"
                  iconSize="w-12 h-12"
                />
                <div className="space-y-3 min-w-0 flex-1">
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-white truncate">
                      {activeAlbum.album}
                    </h1>
                    <p className="text-sm text-zinc-300 mt-1">
                      {activeAlbum.albumArtist}
                      {activeAlbum.year ? ` · ${activeAlbum.year}` : ''}
                      {' · '}
                      <span className="font-mono-nums">
                        {activeAlbum.tracks.length} tracks · {formatDuration(activeAlbum.totalDuration)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onPlayTrackList(activeAlbum.tracks, 0)}
                      className="min-h-[44px] px-5 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] text-white text-xs font-semibold inline-flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play Album</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onShuffleTrackList(activeAlbum.tracks)}
                      className="min-h-[44px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-100 text-xs font-medium inline-flex items-center gap-2"
                    >
                      <Shuffle className="w-4 h-4" />
                      <span>Shuffle</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/[0.04] rounded-2xl bg-[#111318]/60 border border-white/[0.06] p-1.5">
                {activeAlbum.tracks.map((trk, idx) => (
                  <TrackRow
                    key={trk.id}
                    track={trk}
                    index={idx}
                    isActive={trk.id === currentTrackId}
                    isPlaying={isPlaying}
                    playlists={playlists}
                    onPlay={() => onPlayTrackList(activeAlbum.tracks, idx)}
                    onPlayNext={() => onPlayNext(trk)}
                    onAddToQueue={() => onAddToQueue(trk)}
                    onToggleFavorite={() => onToggleFavorite(trk.id)}
                    onAddToPlaylist={(plId) => onAddToPlaylist(plId, trk.id)}
                    onEdit={() => onEditTrack(trk)}
                    onDelete={() => onDeleteTrack(trk.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Albums
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-mono-nums">
                  {albums.length} {albums.length === 1 ? 'album' : 'albums'} stored offline
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {albums.map((alb) => (
                  <button
                    key={alb.key}
                    type="button"
                    onClick={() => setSelectedAlbumKey(alb.key)}
                    className="group text-left rounded-2xl p-3 bg-[#111318] border border-white/[0.06] hover:border-white/15 hover:bg-[#161922] transition-colors"
                  >
                    <CoverArt
                      src={alb.coverArt}
                      alt={alb.album}
                      className="w-full aspect-square rounded-xl mb-3"
                      iconSize="w-10 h-10"
                    />
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#64AEFF] transition-colors">
                      {alb.album}
                    </p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{alb.albumArtist}</p>
                    <p className="text-[11px] font-mono-nums text-zinc-500 mt-1">
                      {alb.tracks.length} {alb.tracks.length === 1 ? 'track' : 'tracks'}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ARTISTS VIEW */}
      {activeView === 'artists' && (
        <section className="space-y-5">
          {activeArtist ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setSelectedArtistName(null)}
                className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Artists</span>
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#111318] border border-white/[0.07]">
                <div className="flex items-center gap-4">
                  <CoverArt
                    src={activeArtist.coverArt}
                    alt={activeArtist.name}
                    className="w-20 h-20 rounded-full"
                    iconSize="w-8 h-8"
                  />
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                      {activeArtist.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-mono-nums">
                      {activeArtist.albumCount} {activeArtist.albumCount === 1 ? 'album' : 'albums'} ·{' '}
                      {activeArtist.tracks.length} tracks · {formatDuration(activeArtist.totalDuration)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPlayTrackList(activeArtist.tracks, 0)}
                    className="min-h-[44px] px-5 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] text-white text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play All</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-white/[0.04] rounded-2xl bg-[#111318]/60 border border-white/[0.06] p-1.5">
                {activeArtist.tracks.map((trk, idx) => (
                  <TrackRow
                    key={trk.id}
                    track={trk}
                    index={idx}
                    isActive={trk.id === currentTrackId}
                    isPlaying={isPlaying}
                    playlists={playlists}
                    onPlay={() => onPlayTrackList(activeArtist.tracks, idx)}
                    onPlayNext={() => onPlayNext(trk)}
                    onAddToQueue={() => onAddToQueue(trk)}
                    onToggleFavorite={() => onToggleFavorite(trk.id)}
                    onAddToPlaylist={(plId) => onAddToPlaylist(plId, trk.id)}
                    onEdit={() => onEditTrack(trk)}
                    onDelete={() => onDeleteTrack(trk.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Artists
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-mono-nums">
                  {artists.length} {artists.length === 1 ? 'artist' : 'artists'} in library
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {artists.map((art) => (
                  <button
                    key={art.name}
                    type="button"
                    onClick={() => setSelectedArtistName(art.name)}
                    className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#111318] border border-white/[0.06] hover:border-white/15 hover:bg-[#161922] text-left transition-colors"
                  >
                    <CoverArt
                      src={art.coverArt}
                      alt={art.name}
                      className="w-14 h-14 rounded-full"
                      iconSize="w-6 h-6"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{art.name}</p>
                      <p className="text-xs text-zinc-400 font-mono-nums mt-0.5">
                        {art.tracks.length} tracks · {art.albumCount}{' '}
                        {art.albumCount === 1 ? 'album' : 'albums'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* PLAYLISTS VIEW */}
      {activeView === 'playlists' && (
        <section className="space-y-6">
          {activePlaylist ? (
            (() => {
              const plTracks = activePlaylist.trackIds
                .map((id) => tracks.find((t) => t.id === id))
                .filter((t): t is Track => Boolean(t));
              return (
                <div className="space-y-5">
                  <button
                    type="button"
                    onClick={() => onSelectPlaylist(null)}
                    className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>All Playlists</span>
                  </button>

                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-5 rounded-3xl bg-[#111318] border border-white/[0.07]">
                    <div>
                      <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                        {activePlaylist.name}
                      </h1>
                      {activePlaylist.description && (
                        <p className="text-sm text-zinc-300 mt-1">{activePlaylist.description}</p>
                      )}
                      <p className="text-xs text-zinc-400 mt-1.5 font-mono-nums">
                        {plTracks.length} {plTracks.length === 1 ? 'track' : 'tracks'} ·{' '}
                        {formatDuration(plTracks.reduce((s, t) => s + t.duration, 0))}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={plTracks.length === 0}
                        onClick={() => onPlayTrackList(plTracks, 0)}
                        className="min-h-[44px] px-4 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Play</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRenamePlaylist(activePlaylist)}
                        className="min-h-[44px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePlaylist(activePlaylist.id);
                          onSelectPlaylist(null);
                        }}
                        className="min-h-[44px] px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {plTracks.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-[#111318] border border-white/[0.06]">
                      <p className="text-sm font-medium text-zinc-300">Playlist is empty</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Open the menu on any song in My Music to add it here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.04] rounded-2xl bg-[#111318]/60 border border-white/[0.06] p-1.5">
                      {plTracks.map((trk, idx) => (
                        <TrackRow
                          key={`${trk.id}-${idx}`}
                          track={trk}
                          index={idx}
                          isActive={trk.id === currentTrackId}
                          isPlaying={isPlaying}
                          playlists={playlists}
                          onPlay={() => onPlayTrackList(plTracks, idx)}
                          onPlayNext={() => onPlayNext(trk)}
                          onAddToQueue={() => onAddToQueue(trk)}
                          onToggleFavorite={() => onToggleFavorite(trk.id)}
                          onAddToPlaylist={(plId) => onAddToPlaylist(plId, trk.id)}
                          onEdit={() => onEditTrack(trk)}
                          onDelete={() => onDeleteTrack(trk.id)}
                          removeFromPlaylistLabel="Remove from Playlist"
                          onRemoveFromPlaylist={() =>
                            onRemoveFromPlaylist(activePlaylist.id, trk.id)
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : selectedSmartMix ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setSelectedSmartMix(null)}
                className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Playlists</span>
              </button>

              <div className="flex items-center justify-between gap-4 p-5 rounded-3xl bg-[#111318] border border-white/[0.07]">
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    {selectedSmartMix === 'favorites'
                      ? 'Favorites Mix'
                      : selectedSmartMix === 'most-played'
                      ? 'Most Played'
                      : 'Recently Added'}
                  </h1>
                  <p className="text-xs text-zinc-400 mt-1 font-mono-nums">
                    {smartMixTracks.length} tracks
                  </p>
                </div>
                <button
                  type="button"
                  disabled={smartMixTracks.length === 0}
                  onClick={() => onPlayTrackList(smartMixTracks, 0)}
                  className="min-h-[44px] px-5 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Mix</span>
                </button>
              </div>

              <div className="divide-y divide-white/[0.04] rounded-2xl bg-[#111318]/60 border border-white/[0.06] p-1.5">
                {smartMixTracks.map((trk, idx) => (
                  <TrackRow
                    key={trk.id}
                    track={trk}
                    index={idx}
                    isActive={trk.id === currentTrackId}
                    isPlaying={isPlaying}
                    playlists={playlists}
                    onPlay={() => onPlayTrackList(smartMixTracks, idx)}
                    onPlayNext={() => onPlayNext(trk)}
                    onAddToQueue={() => onAddToQueue(trk)}
                    onToggleFavorite={() => onToggleFavorite(trk.id)}
                    onAddToPlaylist={(plId) => onAddToPlaylist(plId, trk.id)}
                    onEdit={() => onEditTrack(trk)}
                    onDelete={() => onDeleteTrack(trk.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Playlists
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    Smart offline mixes and custom collections
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCreatePlaylist}
                  className="min-h-[44px] px-4 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Playlist</span>
                </button>
              </div>

              {/* Smart Mixes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSmartMix('favorites')}
                  className="p-4 rounded-2xl bg-[#111318] border border-white/[0.07] hover:border-white/20 text-left transition-colors space-y-2"
                >
                  <Heart className="w-5 h-5 text-[#2E8BFF]" />
                  <div>
                    <p className="text-sm font-semibold text-white">Favorites Mix</p>
                    <p className="text-xs text-zinc-400 font-mono-nums mt-0.5">
                      {tracks.filter((t) => t.isFavorite).length} tracks
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSmartMix('recent')}
                  className="p-4 rounded-2xl bg-[#111318] border border-white/[0.07] hover:border-white/20 text-left transition-colors space-y-2"
                >
                  <ListMusic className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Recently Added</p>
                    <p className="text-xs text-zinc-400 font-mono-nums mt-0.5">
                      Latest {Math.min(25, tracks.length)} imports
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSmartMix('most-played')}
                  className="p-4 rounded-2xl bg-[#111318] border border-white/[0.07] hover:border-white/20 text-left transition-colors space-y-2"
                >
                  <Play className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Most Played</p>
                    <p className="text-xs text-zinc-400 font-mono-nums mt-0.5">
                      Top rotation offline
                    </p>
                  </div>
                </button>
              </div>

              {/* Custom Playlists */}
              <div className="space-y-3">
                <h2 className="font-display text-base font-semibold text-zinc-200">
                  Your Playlists
                </h2>
                {playlists.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#111318] border border-white/[0.06] text-center">
                    <p className="text-sm text-zinc-300">No custom playlists created yet</p>
                    <button
                      type="button"
                      onClick={onCreatePlaylist}
                      className="mt-3 min-h-[40px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white"
                    >
                      Create your first playlist
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {playlists.map((pl) => {
                      const firstTrack = tracks.find((t) => t.id === pl.trackIds[0]);
                      return (
                        <button
                          key={pl.id}
                          type="button"
                          onClick={() => onSelectPlaylist(pl.id)}
                          className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#111318] border border-white/[0.06] hover:border-white/20 text-left transition-colors"
                        >
                          <CoverArt
                            src={firstTrack?.coverArt}
                            alt={pl.name}
                            className="w-14 h-14 rounded-xl"
                            iconSize="w-6 h-6"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">{pl.name}</p>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {pl.description || 'Offline playlist'}
                            </p>
                            <p className="text-[11px] font-mono-nums text-zinc-500 mt-1">
                              {pl.trackIds.length} {pl.trackIds.length === 1 ? 'track' : 'tracks'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* OFFLINE VAULT VIEW */}
      {activeView === 'offline' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Offline Vault
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Manage local device storage, audio formats, and offline library backups
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onImportFiles}
                disabled={isImporting}
                className="min-h-[44px] px-4 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>Import Files</span>
              </button>
              <button
                type="button"
                onClick={onImportFolder}
                disabled={isImporting}
                className="min-h-[44px] px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-100 text-xs font-medium inline-flex items-center gap-2 whitespace-nowrap"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Scan Folder</span>
              </button>
            </div>
          </div>

          {/* Storage Quota Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-5 rounded-2xl bg-[#111318] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-5 h-5 text-[#2E8BFF]" />
                  <span className="text-sm font-semibold text-white">Device IndexedDB Vault</span>
                </div>
                <span className="text-xs font-mono-nums text-zinc-400">
                  {formatBytes(storageStats.totalAudioBytes)} audio ·{' '}
                  {formatBytes(storageStats.quotaBytes)} available
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className="h-full bg-[#2E8BFF] rounded-full transition-[width] duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        storageStats.totalAudioBytes > 0 ? 2 : 0,
                        (storageStats.usageBytes / Math.max(1, storageStats.quotaBytes)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <p className="text-xs text-zinc-500">Offline Tracks</p>
                  <p className="text-lg font-bold font-mono-nums text-white mt-0.5">
                    {storageStats.trackCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Vault Size</p>
                  <p className="text-lg font-bold font-mono-nums text-white mt-0.5">
                    {formatBytes(storageStats.totalAudioBytes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Playlists</p>
                  <p className="text-lg font-bold font-mono-nums text-white mt-0.5">
                    {playlists.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111318] border border-white/[0.07] flex flex-col justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Library Backup</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Export track metadata and playlists as a local JSON manifest.
                </p>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onExportManifest}
                  disabled={tracks.length === 0}
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] disabled:opacity-40 text-xs font-medium text-zinc-100 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#2E8BFF]" />
                  <span>Export Library JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Font Setting */}
          <div className="p-5 rounded-2xl bg-[#111318] border border-white/[0.07] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Type className="w-4 h-4 text-[#2E8BFF]" />
                <div>
                  <h2 className="text-sm font-semibold text-white">Typography</h2>
                  <p className="text-xs text-zinc-400">
                    Choose your preferred app font (defaults to system font)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {FONT_PRESETS.map((preset) => {
                const selected = fontFamily === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectFont(preset.id)}
                    style={{
                      fontFamily: preset.cssStack,
                      letterSpacing: preset.letterSpacing,
                    }}
                    className={`min-h-[52px] px-3.5 py-2.5 rounded-xl text-left border transition-colors ${
                      selected
                        ? 'bg-[#2E8BFF]/15 border-[#2E8BFF]/40 text-white'
                        : 'bg-[#0D0F14] border-white/[0.06] text-zinc-300 hover:border-white/15'
                    }`}
                  >
                    <p className="text-sm font-semibold truncate">{preset.label}</p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* UI Scaling & Lockscreen Widget Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#111318] border border-white/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Maximize2 className="w-4 h-4 text-[#2E8BFF]" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">UI Scaling</h2>
                    <p className="text-xs text-zinc-400">Adjust overall interface size</p>
                  </div>
                </div>
                <span className="text-xs font-mono-nums text-[#64AEFF]">
                  {Math.round(uiScale * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {UI_SCALE_PRESETS.map((preset) => {
                  const selected = uiScale === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => onSelectUiScale(preset.value)}
                      className={`min-h-[48px] px-2 py-1.5 rounded-xl flex flex-col items-center justify-center border transition-colors ${
                        selected
                          ? 'bg-[#2E8BFF]/15 border-[#2E8BFF]/40 text-white'
                          : 'bg-[#0D0F14] border-white/[0.06] text-zinc-300 hover:border-white/15'
                      }`}
                    >
                      <span className="text-xs font-semibold font-mono-nums">
                        {preset.percentLabel}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#111318] border border-white/[0.07] flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Smartphone className="w-5 h-5 text-[#2E8BFF] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white">Lockscreen Player Widget</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Show artwork & transport controls on the OnePlus 15R lockscreen and notification shade via standard OS MediaSession.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={lockscreenWidget}
                onClick={() => onToggleLockscreenWidget(!lockscreenWidget)}
                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                  lockscreenWidget ? 'bg-[#2E8BFF]' : 'bg-white/15'
                }`}
                aria-label="Toggle lockscreen player widget"
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    lockscreenWidget ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Global Song Speed (bits/sec) Setting Slider */}
          {(() => {
            const baseBps = Math.max(32_000, (activeTrackBitrateKbps || 320) * 1000);
            const minBps = Math.round(baseBps * 0.5);
            const maxBps = Math.round(baseBps * 2.0);
            const stepBps = Math.max(1000, Math.round(baseBps * 0.01));
            const currentBps = Math.round(baseBps * playbackRate);

            return (
              <div className="p-5 rounded-2xl bg-[#111318] border border-white/[0.07] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Gauge className="w-4 h-4 text-[#2E8BFF]" />
                    <div>
                      <h2 className="text-sm font-semibold text-white">Global Song Speed (bits/sec)</h2>
                      <p className="text-xs text-zinc-400">
                        Adjust playback speed across all songs ({activeTrackBitrateKbps ? 'calibrated to active track' : '320,000 bps reference'})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-nums text-[#64AEFF]">
                      {currentBps.toLocaleString()} bps · {playbackRate.toFixed(2)}×
                    </span>
                    {Math.abs(playbackRate - 1) > 0.005 && (
                      <button
                        type="button"
                        onClick={() => onChangePlaybackRate(1)}
                        className="min-h-[32px] px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-zinc-200 inline-flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative h-9 flex items-center">
                  <div className="absolute inset-x-0 h-2 rounded-full bg-white/20 overflow-hidden pointer-events-none">
                    <div
                      className="h-full bg-[#2E8BFF] rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((playbackRate - 0.5) / 1.5) * 100))}%`,
                      }}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-white/50 rounded-full pointer-events-none"
                    style={{ left: '33.3333%' }}
                    aria-hidden="true"
                  />
                  <input
                    type="range"
                    min={minBps}
                    max={maxBps}
                    step={stepBps}
                    value={currentBps}
                    onChange={(e) => onChangePlaybackRate(Number(e.target.value) / baseBps)}
                    aria-label="Global song speed in bits per second"
                    className="groover-range relative z-10 w-full h-9"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono-nums text-zinc-400">
                  <span>{minBps.toLocaleString()} bps (0.50×)</span>
                  <span>{baseBps.toLocaleString()} bps (1.00×)</span>
                  <span>{maxBps.toLocaleString()} bps (2.00×)</span>
                </div>
              </div>
            );
          })()}

          {/* Audio Formats Breakdown */}
          {formatBreakdown.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#111318] border border-white/[0.07] space-y-3">
              <h2 className="text-sm font-semibold text-white">Stored Audio Formats</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {formatBreakdown.map(([fmt, info]) => (
                  <div
                    key={fmt}
                    className="p-3.5 rounded-xl bg-[#0D0F14] border border-white/[0.06]"
                  >
                    <p className="text-xs font-mono-nums font-semibold text-[#64AEFF]">{fmt}</p>
                    <p className="text-base font-bold font-mono-nums text-white mt-1">
                      {info.count} {info.count === 1 ? 'file' : 'files'}
                    </p>
                    <p className="text-xs font-mono-nums text-zinc-500 mt-0.5">
                      {formatBytes(info.bytes)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger Zone: Clear Vault */}
          {tracks.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#111318] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Reset Offline Vault</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Removes cached audio blobs and playlists from browser storage on this device.
                </p>
              </div>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="min-h-[42px] px-4 rounded-xl bg-white/[0.06] text-xs font-medium text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmClear(false);
                      void onClearLibrary();
                    }}
                    className="min-h-[42px] px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Clear</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="min-h-[42px] px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-300 whitespace-nowrap"
                >
                  Clear All Offline Tracks
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
