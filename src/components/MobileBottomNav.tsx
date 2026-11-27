import React from 'react';
import { Disc, HardDrive, ListMusic, Music2, Pause, Play, SkipForward } from 'lucide-react';
import { LibraryView, Track, UiTheme } from '../types/music';
import { CoverArt } from './CoverArt';

interface MobileBottomNavProps {
  uiTheme?: UiTheme;
  activeView: LibraryView;
  onSelectView: (view: LibraryView) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  progressPercent: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onOpenNowPlaying: () => void;
}

const MOBILE_TABS: Array<{
  id: LibraryView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'songs', label: 'Songs', icon: Music2 },
  { id: 'albums', label: 'Albums', icon: Disc },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'offline', label: 'Offline', icon: HardDrive },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  uiTheme = 'groover',
  activeView,
  onSelectView,
  currentTrack,
  isPlaying,
  progressPercent,
  onTogglePlay,
  onNext,
  onOpenNowPlaying,
}) => {
  const isPivot = uiTheme === 'pivot';
  if (isPivot && !currentTrack) return null;

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t pb-safe ${
        isPivot
          ? 'bg-white/95 dark:bg-black/95 border-zinc-200 dark:border-white/[0.12]'
          : 'bg-white/95 dark:bg-[#0D0F14]/95 border-zinc-200 dark:border-white/[0.08]'
      }`}
    >
      {/* Compact Mini-Player */}
      {currentTrack && (
        <div className="relative border-b border-zinc-200/80 dark:border-white/[0.06]">
          {/* Hairline seek indicator */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-200 dark:bg-white/10">
            <div
              className="h-full bg-[var(--accent-primary)] transition-[width] duration-150 ease-linear"
              style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
            />
          </div>

          <div className="flex items-center justify-between h-[54px] px-3 gap-2">
            <button
              type="button"
              onClick={onOpenNowPlaying}
              className="flex items-center gap-3 min-w-0 flex-1 text-left py-1 focus-visible:outline-none"
            >
              <CoverArt
                src={currentTrack.coverArt}
                alt={currentTrack.album}
                accentColor={currentTrack.accentColor}
                className="w-9 h-9 rounded-lg"
                iconSize="w-4 h-4"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate leading-tight">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate leading-tight mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
            </button>

            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={onTogglePlay}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-zinc-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={onNext}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-transform"
                aria-label="Next track"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-Tab Thumb Bar (hidden in Metro Pivot mode since Pivot header handles navigation) */}
      {!isPivot && (
        <nav className="grid grid-cols-4 items-center h-[56px]" aria-label="Mobile navigation">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              activeView === tab.id || (tab.id === 'songs' && activeView === 'artists');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectView(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[48px] transition-colors ${
                  isActive ? 'text-[var(--accent-primary)]' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
