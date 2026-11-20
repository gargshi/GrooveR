import React from 'react';
import {
  Heart,
  ListMusic,
  Maximize2,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDuration } from '../lib/formatters';
import { RepeatMode, Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  sleepRemainingMin: number | null;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenNowPlaying: () => void;
  onOpenQueue: () => void;
  onOpenEq: () => void;
  onCycleSleepTimer: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  shuffle,
  repeat,
  sleepRemainingMin,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleFavorite,
  onOpenNowPlaying,
  onOpenQueue,
  onOpenEq,
  onCycleSleepTimer,
}) => {
  const safeDuration = duration > 0 ? duration : currentTrack?.duration || 0;
  const progress = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0;

  return (
    <footer className="hidden lg:grid grid-cols-[minmax(220px,1fr)_minmax(340px,1.4fr)_minmax(220px,1fr)] items-center h-20 px-5 bg-[#0D0F14]/95 backdrop-blur-xl border-t border-white/[0.08] shrink-0 z-30">
      {/* Left: Track summary */}
      <div className="flex items-center gap-3 min-w-0">
        {currentTrack ? (
          <>
            <button
              type="button"
              onClick={onOpenNowPlaying}
              className="group relative rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E8BFF]"
              aria-label="Open Now Playing"
            >
              <CoverArt
                src={currentTrack.coverArt}
                alt={currentTrack.album}
                accentColor={currentTrack.accentColor}
                className="w-12 h-12 rounded-xl"
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={onOpenNowPlaying}
                className="block text-left text-sm font-semibold text-white hover:text-[#64AEFF] transition-colors truncate max-w-full"
              >
                {currentTrack.title}
              </button>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {currentTrack.artist} <span aria-hidden="true">·</span> {currentTrack.format}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(currentTrack.id)}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg transition-colors shrink-0 ${
                currentTrack.isFavorite
                  ? 'text-[#2E8BFF] hover:bg-[#2E8BFF]/10'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
              }`}
              aria-label={currentTrack.isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart className={`w-4 h-4 ${currentTrack.isFavorite ? 'fill-current' : ''}`} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
            <div>
              <p className="text-sm font-medium text-zinc-400">Ready to play</p>
              <p className="text-xs text-zinc-500">Select any offline track</p>
            </div>
          </div>
        )}
      </div>

      {/* Center: Transport & Seekbar */}
      <div className="flex flex-col items-center justify-center gap-1.5 px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleShuffle}
            className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors ${
              shuffle ? 'text-[#2E8BFF] bg-[#2E8BFF]/10' : 'text-zinc-400 hover:text-white'
            }`}
            aria-label="Toggle shuffle"
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={!currentTrack}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-200 hover:text-white disabled:opacity-35 transition-colors"
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!currentTrack}
            className="w-10 h-10 rounded-full bg-white text-[#090A0D] hover:scale-105 active:scale-95 disabled:opacity-35 flex items-center justify-center transition-transform shadow-sm"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!currentTrack}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-200 hover:text-white disabled:opacity-35 transition-colors"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors ${
              repeat !== 'off' ? 'text-[#2E8BFF] bg-[#2E8BFF]/10' : 'text-zinc-400 hover:text-white'
            }`}
            aria-label={`Repeat mode: ${repeat}`}
            title={`Repeat: ${repeat}`}
          >
            {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        <div className="w-full max-w-lg flex items-center gap-2.5">
          <span className="text-[11px] font-mono-nums text-zinc-400 w-10 text-right shrink-0">
            {formatDuration(currentTime)}
          </span>
          <div className="relative flex-1 h-4 flex items-center">
            <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-[#2E8BFF]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={safeDuration || 100}
              step={0.1}
              value={Math.min(currentTime, safeDuration || 0)}
              disabled={!currentTrack}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              aria-label="Playback seek"
              className="groover-range absolute inset-0 w-full opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
            />
          </div>
          <span className="text-[11px] font-mono-nums text-zinc-400 w-10 shrink-0">
            {formatDuration(safeDuration)}
          </span>
        </div>
      </div>

      {/* Right: Tools & Volume */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onCycleSleepTimer}
          className={`min-h-[38px] px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            sleepRemainingMin !== null
              ? 'text-[#2E8BFF] bg-[#2E8BFF]/15'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
          }`}
          title="Sleep timer"
          aria-label="Sleep timer"
        >
          <Moon className="w-4 h-4 shrink-0" />
          {sleepRemainingMin !== null && (
            <span className="font-mono-nums">{sleepRemainingMin}m</span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenEq}
          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Equalizer"
          aria-label="Open equalizer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenQueue}
          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Up Next Queue"
          aria-label="Open queue"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 ml-1">
          <button
            type="button"
            onClick={onToggleMute}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <div className="relative w-20 h-4 flex items-center">
            <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-zinc-200"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label="Volume"
              className="groover-range absolute inset-0 w-full opacity-0 hover:opacity-100 focus:opacity-100"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNowPlaying}
          disabled={!currentTrack}
          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-30 transition-colors"
          title="Expand Now Playing"
          aria-label="Expand Now Playing"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
