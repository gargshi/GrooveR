import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Edit3,
  Heart,
  ListMusic,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
} from 'lucide-react';
import { GrooveAudioEngine } from '../lib/audioEngine';
import { formatDuration } from '../lib/formatters';
import { RepeatMode, Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface NowPlayingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  queueTracks: Track[];
  currentQueueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  sleepRemainingMin: number | null;
  audioEngine: GrooveAudioEngine;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFavorite: (trackId: string) => void;
  onOpenEq: () => void;
  onEditTrack: (track: Track) => void;
  onCycleSleepTimer: () => void;
  onPlayQueueIndex: (index: number) => void;
}

export const NowPlayingSheet: React.FC<NowPlayingSheetProps> = ({
  isOpen,
  onClose,
  currentTrack,
  queueTracks,
  currentQueueIndex,
  isPlaying,
  currentTime,
  duration,
  shuffle,
  repeat,
  sleepRemainingMin,
  audioEngine,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onToggleFavorite,
  onOpenEq,
  onEditTrack,
  onCycleSleepTimer,
  onPlayQueueIndex,
}) => {
  const [panelTab, setPanelTab] = useState<'art' | 'queue'>('art');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let rafId = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const bins = audioEngine.getFrequencyBins(28);
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          const styles = getComputedStyle(document.documentElement);
          const peakColor = styles.getPropertyValue('--accent-soft').trim() || '#64AEFF';
          const dimColor = styles.getPropertyValue('--accent-dim').trim() || 'rgba(46, 139, 255, 0.55)';

          const barWidth = (w - (bins.length - 1) * 4) / bins.length;
          bins.forEach((val, idx) => {
            const norm = isPlaying ? Math.max(0.08, val) : 0.08;
            const barH = Math.max(3, norm * (h - 4));
            const x = idx * (barWidth + 4);
            const y = h - barH;
            ctx.fillStyle = val > 0.55 ? peakColor : dimColor;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barH, 2);
            ctx.fill();
          });
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, isPlaying, audioEngine]);

  if (!isOpen || !currentTrack) return null;

  const safeDuration = duration > 0 ? duration : currentTrack.duration || 0;
  const progress = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0;
  const accent = currentTrack.accentColor || '#2E8BFF';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F4F6FA] dark:bg-[#090A0D] flex flex-col overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 18%, ${accent}26, transparent 62%)`,
      }}
    >
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 sm:px-8 h-16 pt-safe shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Collapse Now Playing"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.05] dark:bg-white/[0.05] border border-zinc-200 dark:border-white/[0.07]">
          <button
            type="button"
            onClick={() => setPanelTab('art')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              panelTab === 'art' ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Now Playing
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('queue')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              panelTab === 'queue' ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Up Next ({queueTracks.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => onEditTrack(currentTrack)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Edit track metadata"
          title="Edit track info"
        >
          <Edit3 className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-10 pb-8 flex flex-col justify-between max-w-2xl w-full mx-auto">
        {panelTab === 'art' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-4 gap-6">
            <div className="w-full max-w-[320px] sm:max-w-[360px] aspect-square rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-white/10">
              <CoverArt
                src={currentTrack.coverArt}
                alt={currentTrack.album}
                accentColor={currentTrack.accentColor}
                className="w-full h-full rounded-3xl"
                iconSize="w-16 h-16"
              />
            </div>

            {/* Real-time Spectrum Visualizer */}
            <canvas
              ref={canvasRef}
              width={320}
              height={36}
              className="w-full max-w-[320px] h-9 opacity-90"
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="flex-1 py-4 overflow-y-auto space-y-1">
            {queueTracks.map((trk, idx) => {
              const isCurrent = idx === currentQueueIndex;
              return (
                <button
                  key={`${trk.id}-${idx}`}
                  type="button"
                  onClick={() => onPlayQueueIndex(idx)}
                  className={`w-full min-h-[56px] px-3 py-2 rounded-xl flex items-center gap-3 text-left transition-colors ${
                    isCurrent
                      ? 'bg-[var(--accent-tint)] border border-[var(--accent-border)]'
                      : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="w-6 text-xs font-mono-nums text-zinc-500 text-center shrink-0">
                    {idx + 1}
                  </span>
                  <CoverArt
                    src={trk.coverArt}
                    alt={trk.album}
                    accentColor={trk.accentColor}
                    className="w-10 h-10 rounded-lg"
                    iconSize="w-4 h-4"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-[var(--accent-soft)]' : 'text-zinc-900 dark:text-white'}`}>
                      {trk.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {trk.artist} <span aria-hidden="true">·</span> {trk.album}
                    </p>
                  </div>
                  <span className="text-xs font-mono-nums text-zinc-500 shrink-0">
                    {formatDuration(trk.duration)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Track Info + Controls Dock */}
        <div className="space-y-5 pt-2 pb-safe">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white truncate">
                {currentTrack.title}
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 truncate mt-1">
                {currentTrack.artist} <span aria-hidden="true">·</span> {currentTrack.album}
              </p>
              <p className="text-xs font-mono-nums text-zinc-500 mt-1">
                {currentTrack.format}
                {currentTrack.bitrateKbps ? ` · ${currentTrack.bitrateKbps} kbps` : ''}
                {currentTrack.sampleRate ? ` · ${(currentTrack.sampleRate / 1000).toFixed(1)} kHz` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(currentTrack.id)}
              className={`min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl transition-colors shrink-0 ${
                currentTrack.isFavorite
                  ? 'text-[var(--accent-primary)] bg-[var(--accent-tint)]'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-black/[0.04] dark:bg-white/[0.04]'
              }`}
              aria-label={currentTrack.isFavorite ? 'Remove favorite' : 'Favorite track'}
            >
              <Heart className={`w-5 h-5 ${currentTrack.isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Scrubbable Seekbar */}
          <div className="space-y-1.5">
            <div className="relative h-6 flex items-center">
              <div className="w-full h-1.5 rounded-full bg-zinc-300 dark:bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-primary)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={safeDuration || 100}
                step={0.1}
                value={Math.min(currentTime, safeDuration || 0)}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                aria-label="Seek position"
                className="groover-range absolute inset-0 w-full opacity-0 hover:opacity-100 focus:opacity-100"
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono-nums text-zinc-500 dark:text-zinc-400">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(safeDuration)}</span>
            </div>
          </div>

          {/* Primary Transport Controls */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleShuffle}
              className={`min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl transition-colors ${
                shuffle ? 'text-[var(--accent-primary)] bg-[var(--accent-tint)]' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
              aria-label="Shuffle"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onPrev}
              className="min-h-[52px] min-w-[52px] flex items-center justify-center rounded-2xl text-zinc-900 dark:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] active:scale-95 transition-transform"
              aria-label="Previous track"
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              className="w-16 h-16 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] flex items-center justify-center shadow-lg active:scale-95 transition-all"
              style={{ boxShadow: '0 10px 24px -4px var(--accent-glow)' }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              className="min-h-[52px] min-w-[52px] flex items-center justify-center rounded-2xl text-zinc-900 dark:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] active:scale-95 transition-transform"
              aria-label="Next track"
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </button>

            <button
              type="button"
              onClick={onCycleRepeat}
              className={`min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl transition-colors ${
                repeat !== 'off' ? 'text-[var(--accent-primary)] bg-[var(--accent-tint)]' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
              aria-label="Repeat"
            >
              {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>

          {/* Secondary Utility Row */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-white/[0.07]">
            <button
              type="button"
              onClick={onOpenEq}
              className="min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Equalizer</span>
            </button>

            <button
              type="button"
              onClick={onCycleSleepTimer}
              className={`min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-xs font-medium transition-colors whitespace-nowrap ${
                sleepRemainingMin !== null
                  ? 'text-[var(--accent-primary)] bg-[var(--accent-tint)]'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>{sleepRemainingMin !== null ? `Sleep in ${sleepRemainingMin}m` : 'Sleep Timer'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPanelTab(panelTab === 'queue' ? 'art' : 'queue')}
              className="min-h-[44px] px-3 rounded-xl flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors whitespace-nowrap"
            >
              <ListMusic className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span>{panelTab === 'queue' ? 'Artwork' : 'Queue'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
