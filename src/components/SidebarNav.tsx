import React from 'react';
import {
  Disc,
  FolderPlus,
  HardDrive,
  ListMusic,
  Mic2,
  Music2,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { LibraryView, Playlist } from '../types/music';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarNavProps {
  activeView: LibraryView;
  onSelectView: (view: LibraryView) => void;
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onImportFiles: () => void;
  onImportFolder: () => void;
  onOpenEq: () => void;
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
  activeView,
  onSelectView,
  playlists,
  activePlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onImportFiles,
  onImportFolder,
  onOpenEq,
  trackCount,
}) => {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-[#0D0F14] border-r border-white/[0.07] h-full select-none">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelectView('songs')}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E8BFF] rounded-lg"
        >
          <span className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap">
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
          className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Music Files</span>
        </button>
        <button
          type="button"
          onClick={onImportFolder}
          className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <FolderPlus className="w-4 h-4 shrink-0 text-zinc-400" />
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
                  ? 'bg-[#2E8BFF]/15 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2E8BFF]' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Playlists Section */}
      <div className="mt-4 px-5 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 tracking-wide">Playlists</span>
        <button
          type="button"
          onClick={onCreatePlaylist}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="New playlist"
          title="New playlist"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {playlists.length === 0 ? (
          <p className="px-3 py-2 text-xs text-zinc-500">
            No custom playlists yet
          </p>
        ) : (
          playlists.map((pl) => {
            const selected = activeView === 'playlists' && activePlaylistId === pl.id;
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => onSelectPlaylist(pl.id)}
                className={`w-full min-h-[40px] px-3 rounded-xl flex items-center justify-between text-left text-sm transition-colors ${
                  selected
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate pr-2">{pl.name}</span>
                <span className="text-xs font-mono-nums text-zinc-500 shrink-0">
                  {pl.trackIds.length}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Utility */}
      <div className="p-4 border-t border-white/[0.07] space-y-2">
        <button
          type="button"
          onClick={onOpenEq}
          className="w-full min-h-[42px] px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium flex items-center justify-between transition-colors whitespace-nowrap"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#2E8BFF]" />
            <span>5-Band Equalizer</span>
          </span>
          <span className="text-zinc-500">DSP</span>
        </button>
        <PWAInstallButton />
      </div>
    </aside>
  );
};
