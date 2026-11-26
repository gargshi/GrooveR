import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Gauge,
  Layers,
  List,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Type,
  X,
} from 'lucide-react';
import { FONT_PRESETS, UI_SCALE_PRESETS } from '../lib/fonts';
import { FontOption, SongsDisplayMode, UiScaleOption } from '../types/music';

interface SettingsModalProps {
  isOpen: boolean;
  fontFamily: FontOption;
  uiScale: UiScaleOption;
  lockscreenWidget: boolean;
  songsDisplayMode: SongsDisplayMode;
  playbackRate: number;
  activeTrackBitrateKbps?: number;
  onSelectFont: (font: FontOption) => void;
  onSelectUiScale: (scale: UiScaleOption) => void;
  onToggleLockscreenWidget: (enabled: boolean) => void;
  onSelectSongsDisplayMode: (mode: SongsDisplayMode) => void;
  onChangePlaybackRate: (rate: number) => void;
  onOpenEq: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  fontFamily,
  uiScale,
  lockscreenWidget,
  songsDisplayMode,
  playbackRate,
  activeTrackBitrateKbps,
  onSelectFont,
  onSelectUiScale,
  onToggleLockscreenWidget,
  onSelectSongsDisplayMode,
  onChangePlaybackRate,
  onOpenEq,
  onClose,
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const dragStartRef = useRef<{ y: number; time: number } | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
      setIsClosing(false);
    }
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen]);

  const dismissAnimated = useCallback(() => {
    if (isClosing) return;
    setIsDragging(false);
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, 180);
  }, [isClosing, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissAnimated();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, dismissAnimated]);

  if (!isOpen) return null;

  const handleHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if unsupported
    }
    dragStartRef.current = { y: e.clientY, time: Date.now() };
    setIsDragging(true);
  };

  const handleHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !isDragging) return;
    const dy = e.clientY - dragStartRef.current.y;
    setDragY(dy > 0 ? dy : dy * 0.15);
  };

  const handleHandlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    const dt = Math.max(1, Date.now() - dragStartRef.current.time);
    const dy = e.clientY - dragStartRef.current.y;
    const velocityY = dy / dt;

    dragStartRef.current = null;
    setIsDragging(false);

    if (dy > 85 || (velocityY > 0.45 && dy > 20)) {
      dismissAnimated();
    } else {
      setDragY(0);
    }
  };

  const baseBps = Math.max(32_000, (activeTrackBitrateKbps || 320) * 1000);
  const minBps = Math.round(baseBps * 0.5);
  const maxBps = Math.round(baseBps * 2.0);
  const stepBps = Math.max(1000, Math.round(baseBps * 0.01));
  const currentBps = Math.round(baseBps * playbackRate);

  const backdropOpacity = isClosing
    ? 0
    : Math.max(0.15, 0.75 * (1 - Math.max(0, dragY) / 380));

  const sheetTransform = isClosing
    ? 'translate3d(0, 100%, 0)'
    : `translate3d(0, ${Math.max(-12, dragY)}px, 0)`;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) dismissAnimated();
      }}
      style={{
        backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
        transition: isDragging ? 'none' : 'background-color 180ms ease',
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="App Settings"
    >
      <div
        style={{
          transform: sheetTransform,
          opacity: isClosing ? 0 : 1,
          transition: isDragging
            ? 'none'
            : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease',
        }}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#12151C] border border-white/10 px-5 sm:px-6 pb-5 sm:pb-6 pt-0 shadow-2xl space-y-5 max-h-[88vh] overflow-y-auto pb-safe"
      >
        {/* Slide-to-dismiss top white handle bar + header drag zone */}
        <div
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerEnd}
          onPointerCancel={handleHandlePointerEnd}
          className="sticky top-0 z-10 bg-[#12151C] -mx-5 sm:-mx-6 px-5 sm:px-6 pt-3 pb-2 touch-none select-none cursor-grab active:cursor-grabbing border-b border-white/[0.06]"
        >
          <div
            className="w-12 h-1.5 bg-white/85 rounded-full mx-auto mb-3 shadow-sm"
            aria-label="Slide down to close settings"
          />

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Settings</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Library Layout, Typography, Scale & Lockscreen
              </p>
            </div>
            <button
              type="button"
              onClick={dismissAnimated}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06]"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Songs Display Layout Setting */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Layers className="w-4 h-4 text-[#2E8BFF]" />
            <span>Songs Screen Display</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelectSongsDisplayMode('list')}
              className={`min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 border transition-colors text-left ${
                songsDisplayMode === 'list'
                  ? 'bg-[#2E8BFF]/15 border-[#2E8BFF]/40 text-white'
                  : 'bg-[#0D0F14] border-white/[0.06] text-zinc-300 hover:border-white/15'
              }`}
            >
              <List className="w-4 h-4 text-[#2E8BFF] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold">Song List</p>
                <p className="text-[11px] text-zinc-400 truncate">Compact rows</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onSelectSongsDisplayMode('deck')}
              className={`min-h-[48px] px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 border transition-colors text-left ${
                songsDisplayMode === 'deck'
                  ? 'bg-[#2E8BFF]/15 border-[#2E8BFF]/40 text-white'
                  : 'bg-[#0D0F14] border-white/[0.06] text-zinc-300 hover:border-white/15'
              }`}
            >
              <Layers className="w-4 h-4 text-[#2E8BFF] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold">Deck of Cards</p>
                <p className="text-[11px] text-zinc-400 truncate">Swipeable stack</p>
              </div>
            </button>
          </div>
        </div>

        {/* Global Song Speed (bits/sec) Setting Slider */}
        <div className="p-3.5 rounded-xl bg-[#0D0F14] border border-white/[0.07] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Gauge className="w-4 h-4 text-[#2E8BFF]" />
              <span>Global Song Speed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-nums text-[#64AEFF]">
                {currentBps.toLocaleString()} bps · {playbackRate.toFixed(2)}×
              </span>
              {Math.abs(playbackRate - 1) > 0.005 && (
                <button
                  type="button"
                  onClick={() => onChangePlaybackRate(1)}
                  className="min-h-[28px] px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[11px] font-medium text-zinc-200 inline-flex items-center gap-1 transition-colors"
                  aria-label="Reset song speed to 1.00x"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <input
            type="range"
            min={minBps}
            max={maxBps}
            step={stepBps}
            value={currentBps}
            onChange={(e) => onChangePlaybackRate(Number(e.target.value) / baseBps)}
            aria-label="Global song speed in bits per second"
            className="groover-range w-full h-1.5 rounded-full bg-white/15 accent-[#2E8BFF]"
          />

          <div className="flex items-center justify-between text-[11px] font-mono-nums text-zinc-500">
            <span>{minBps.toLocaleString()} bps (0.50×)</span>
            <span>{baseBps.toLocaleString()} bps (1.00×)</span>
            <span>{maxBps.toLocaleString()} bps (2.00×)</span>
          </div>
        </div>

        {/* UI Scaling Setting */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Maximize2 className="w-4 h-4 text-[#2E8BFF]" />
              <span>UI Scaling</span>
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
                  className={`min-h-[48px] px-2 py-2 rounded-xl flex flex-col items-center justify-center border transition-colors ${
                    selected
                      ? 'bg-[#2E8BFF]/15 border-[#2E8BFF]/40 text-white'
                      : 'bg-[#0D0F14] border-white/[0.06] text-zinc-300 hover:border-white/15'
                  }`}
                >
                  <span className="text-xs font-semibold font-mono-nums">{preset.percentLabel}</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lockscreen Player Widget Toggle */}
        <div className="p-3.5 rounded-xl bg-[#0D0F14] border border-white/[0.07] flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Smartphone className="w-4 h-4 text-[#2E8BFF] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Lockscreen Player Widget</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Standard OS MediaSession playback controls on lockscreen & earbuds
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

        {/* Font Setting */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
            <Type className="w-4 h-4 text-[#2E8BFF]" />
            <span>App Font</span>
          </div>

          <div className="space-y-1.5">
            {FONT_PRESETS.map((preset) => {
              const selected = fontFamily === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectFont(preset.id)}
                  className={`w-full min-h-[54px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left border transition-colors ${
                    selected
                      ? 'bg-[#2E8BFF]/15 border-[#2E8BFF]/40 text-white'
                      : 'bg-[#0D0F14] border-white/[0.06] text-zinc-200 hover:border-white/15'
                  }`}
                >
                  <div
                    className="min-w-0 flex-1"
                    style={{
                      fontFamily: preset.cssStack,
                      letterSpacing: preset.letterSpacing,
                    }}
                  >
                    <p className="text-sm font-semibold truncate">{preset.label}</p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">{preset.description}</p>
                  </div>
                  {selected && <Check className="w-4 h-4 text-[#2E8BFF] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio DSP Shortcut */}
        <div className="pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              dismissAnimated();
              onOpenEq();
            }}
            className="w-full min-h-[46px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-sm font-medium text-white flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4 text-[#2E8BFF]" />
              <span>5-Band Equalizer</span>
            </span>
            <span className="text-xs text-zinc-400">Open DSP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
