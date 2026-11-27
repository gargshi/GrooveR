import React from 'react';
import {
  Disc,
  FolderPlus,
  HardDrive,
  ListMusic,
  Mic2,
  Music2,
  Plus,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { resolvePlaylistTracks } from '../lib/smartPlaylists';
import { LibraryView, Playlist, Track, UiTheme } from '../types/music';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarNavProps {
  uiTheme?: UiTheme;
  activeView: LibraryView;
  onSelectView: (view: LibraryView) => void;
  tracks: Track[];
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onGenerateSmartPlaylist: () => void;
  onImportFiles: () => void;
  onImportFolder: () => void;
  onOpenEq: () => void;
  onOpenSettings: () => void;
  trackCount: number;
}

const NAV_ITEMS: Array<{ id: LibraryView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'songs', label: 'My Music', icon: Music2 },
  { id: 'albums', label: 'Albums', icon: Disc },
  { id: 'artists', label: 'Artists', icon: Mic2 },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'offline', label: 'Offline Vault', icon: HardDrive },
];

export const SidebarNav: React.FC<SidebarNavProps> = ({
  uiTheme = 'groover',
  activeView,
  onSelectView,
  tracks,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onGenerateSmartPlaylist,
  onImportFiles,
  onImportFolder,
  onOpenEq,
  onOpenSettings,
  trackCount,
}) => {
  return (
    <aside
      className={`hidden lg:flex flex-col w-64 shrink-0 border-r h-full select-none ${
        uiTheme === 'pivot'
          ? 'bg-white dark:bg-black border-zinc-200 dark:border-white/[0.1]'
          : 'bg-white dark:bg-[#0D0F14] border-zinc-200 dark:border-white/[0.07]'
      }`}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelectView('songs')}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded-lg"
        >
          <span className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap">
            GrooveR
          </span>
        </button>
        <span className="text-xs font-mono-nums text-zinc-500">
          {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
        </span>
      </div>

      {/* Primary Import Actions */}
      <div className="px-4 pb-4 space-y-2">
        <button
          type="button"
          onClick={onImportFiles}
          className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Music Files</span>
        </button>
        <button
          type="button"
          onClick={onImportFolder}
          className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <FolderPlus className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <span>Scan Music Folder</span>
        </button>
      </div>

      {/* Library Navigation */}
      <nav className="px-3 py-2 space-y-1" aria-label="Library sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id && !(item.id === 'playlists' && activePlaylistId);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--accent-tint)] text-zinc-900 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--accent-primary)]' : 'text-zinc-400 dark:text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Playlists Section */}
      <div className="mt-4 px-5 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 tracking-wide">Playlists</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onGenerateSmartPlaylist}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--accent-soft)] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
            aria-label="Generate smart playlist"
            title="Generate smart playlist"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onCreatePlaylist}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
            aria-label="New playlist"
            title="New playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {playlists.length === 0 ? (
          <p className="px-3 py-2 text-xs text-zinc-500">
            No custom playlists yet
          </p>
        ) : (
          playlists.map((pl) => {
            const selected = activeView === 'playlists' && activePlaylistId === pl.id;
            const liveCount = resolvePlaylistTracks(pl, tracks).length;
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => onSelectPlaylist(pl.id)}
                className={`w-full min-h-[40px] px-3 rounded-xl flex items-center justify-between text-left text-sm transition-colors ${
                  selected
                    ? 'bg-black/[0.07] dark:bg-white/[0.08] text-zinc-900 dark:text-white font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0 pr-2">
                  {pl.isSmart && (
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                  )}
                  <span className="truncate">{pl.name}</span>
                </span>
                <span className="text-xs font-mono-nums text-zinc-500 shrink-0">
                  {liveCount}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Utility */}
      <div className="p-4 border-t border-zinc-200 dark:border-white/[0.07] space-y-2">
        <button
          type="button"
          onClick={onOpenEq}
          className="w-full min-h-[42px] px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 text-xs font-medium flex items-center justify-between transition-colors whitespace-nowrap"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>5-Band Equalizer</span>
          </span>
          <span className="text-zinc-500">DSP</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full min-h-[42px] px-3 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 text-xs font-medium flex items-center justify-between transition-colors whitespace-nowrap"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>Font & Settings</span>
          </span>
        </button>
        <PWAInstallButton />
      </div>
    </aside>
  );
};
