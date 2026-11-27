import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, Search, Settings, SlidersHorizontal, X } from 'lucide-react';
import { LibraryView } from '../types/music';
import { OfflineIndicator } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';

export const PIVOT_TABS: Array<{ id: LibraryView; label: string }> = [
  { id: 'albums', label: 'albums' },
  { id: 'songs', label: 'songs' },
  { id: 'playlists', label: 'playlists' },
  { id: 'artists', label: 'artists' },
  { id: 'offline', label: 'vault' },
];

interface PivotHeaderProps {
  activeView: LibraryView;
  swipeOffsetX: number;
  isSwiping: boolean;
  containerWidth: number;
  searchOpen: boolean;
  searchQuery: string;
  isInDrilldown?: boolean;
  skipHeaderSlide?: boolean;
  swipeDurationMs?: number;
  onToggleSearch: () => void;
  onSearchChange: (q: string) => void;
  onSelectView: (view: LibraryView) => void;
  onResetDrilldown?: () => void;
  onOpenEq: () => void;
  onOpenSettings: () => void;
  onImportFiles: () => void;
}

const TOTAL_TABS = PIVOT_TABS.length;
const TRIPLED_TABS = [...PIVOT_TABS, ...PIVOT_TABS, ...PIVOT_TABS];

export const PivotHeader: React.FC<PivotHeaderProps> = ({
  activeView,
  swipeOffsetX,
  isSwiping,
  containerWidth,
  searchOpen,
  searchQuery,
  isInDrilldown = false,
  skipHeaderSlide = false,
  swipeDurationMs = 460,
  onToggleSearch,
  onSearchChange,
  onSelectView,
  onResetDrilldown,
  onOpenEq,
  onOpenSettings,
  onImportFiles,
}) => {
  const activeIdx = Math.max(
    0,
    PIVOT_TABS.findIndex((t) => t.id === activeView)
  );

  const [slotIndex, setSlotIndex] = useState(TOTAL_TABS + activeIdx);
  const [skipTransition, setSkipTransition] = useState(false);
  const [offsets, setOffsets] = useState<number[]>([]);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const prevActiveIdxRef = useRef(activeIdx);
  const wheelCooldownRef = useRef(0);

  // Measure horizontal pixel offsets of every button in the tripled panoramic strip
  const measureOffsets = () => {
    const nextOffsets = TRIPLED_TABS.map((_, i) => buttonRefs.current[i]?.offsetLeft ?? 0);
    setOffsets(nextOffsets);
  };

  useLayoutEffect(() => {
    measureOffsets();
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !trackRef.current) return;
    const ro = new ResizeObserver(() => measureOffsets());
    ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, []);

  // Re-measure after fonts settle
  useEffect(() => {
    const t = window.setTimeout(measureOffsets, 120);
    return () => window.clearTimeout(t);
  }, []);

  // Sync activeIdx -> slotIndex synchronously before paint with shortest-path seamless wrap
  useLayoutEffect(() => {
    const prevIdx = prevActiveIdxRef.current;
    if (prevIdx === activeIdx) return;
    prevActiveIdxRef.current = activeIdx;

    if (skipHeaderSlide) {
      setSkipTransition(true);
      setSlotIndex((curr) => {
        const currMod = ((curr % TOTAL_TABS) + TOTAL_TABS) % TOTAL_TABS;
        if (currMod === activeIdx) return curr;
        const forwardDist = (activeIdx - currMod + TOTAL_TABS) % TOTAL_TABS;
        const backwardDist = (currMod - activeIdx + TOTAL_TABS) % TOTAL_TABS;
        return forwardDist <= backwardDist ? curr + forwardDist : curr - backwardDist;
      });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setSkipTransition(false));
      });
      return;
    }

    setSkipTransition(false);
    setSlotIndex((curr) => {
      const currMod = ((curr % TOTAL_TABS) + TOTAL_TABS) % TOTAL_TABS;
      if (currMod === activeIdx) return curr;
      const forwardDist = (activeIdx - currMod + TOTAL_TABS) % TOTAL_TABS;
      const backwardDist = (currMod - activeIdx + TOTAL_TABS) % TOTAL_TABS;
      if (forwardDist <= backwardDist) {
        return curr + forwardDist;
      }
      return curr - backwardDist;
    });
  }, [activeIdx, skipHeaderSlide]);

  // Silently re-center slotIndex into the middle cycle [5..9] after wrap animation completes
  useEffect(() => {
    if (slotIndex >= TOTAL_TABS && slotIndex < TOTAL_TABS * 2) return;
    const timer = window.setTimeout(() => {
      setSkipTransition(true);
      setSlotIndex(TOTAL_TABS + (((slotIndex % TOTAL_TABS) + TOTAL_TABS) % TOTAL_TABS));
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setSkipTransition(false));
      });
    }, swipeDurationMs + 25);
    return () => window.clearTimeout(timer);
  }, [slotIndex, swipeDurationMs]);

  const progress = Math.max(-1, Math.min(1, -swipeOffsetX / Math.max(240, containerWidth)));
  const incomingSlot =
    progress > 0
      ? Math.min(TRIPLED_TABS.length - 1, slotIndex + 1)
      : progress < 0
      ? Math.max(0, slotIndex - 1)
      : slotIndex;

  const fromX = offsets[slotIndex] ?? 0;
  const toX = offsets[incomingSlot] ?? fromX;
  const t = Math.abs(progress);
  const currentTranslateX = -(fromX + (toX - fromX) * t);

  const handleHeaderWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const dominantX = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (Math.abs(dominantX) < 18) return;
    const now = performance.now();
    if (now - wheelCooldownRef.current < 260) return;
    wheelCooldownRef.current = now;
    const step = dominantX > 0 ? 1 : -1;
    const nextIdx = (activeIdx + step + TOTAL_TABS) % TOTAL_TABS;
    onResetDrilldown?.();
    onSelectView(PIVOT_TABS[nextIdx].id);
  };

  const disableHeaderMotion = isSwiping || skipTransition || skipHeaderSlide;
  const opacityDurationMs = Math.round(swipeDurationMs * 0.78);

  return (
    <header className="sticky top-0 z-30 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-4 sm:pt-5 pb-2 bg-white/95 dark:bg-black/95 backdrop-blur-md space-y-2 select-none">
      {/* Top Bar: MUSIC title + utility actions */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold tracking-[0.18em] uppercase text-zinc-900 dark:text-white">
          MUSIC
        </span>

        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center mr-1">
            <OfflineIndicator />
          </div>
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={onToggleSearch}
            className={`min-h-[42px] min-w-[42px] flex items-center justify-center transition-colors ${
              searchOpen || searchQuery
                ? 'text-[var(--accent-primary)]'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
            }`}
            aria-label={searchOpen ? 'Close search' : 'Search library'}
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onOpenEq}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors lg:hidden"
            aria-label="Open equalizer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[var(--accent-primary)]" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onImportFiles}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center text-zinc-900 dark:text-white hover:text-[var(--accent-primary)] transition-colors"
            aria-label="Add music files"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Panoramic Lowercase Pivot Header Strip */}
      <div
        onWheel={handleHeaderWheel}
        className="relative overflow-hidden py-1 -mx-1 px-1 touch-pan-y cursor-grab active:cursor-grabbing"
      >
        <div
          ref={trackRef}
          style={{
            transform: `translate3d(${currentTranslateX}px, 0, 0)`,
            transition: disableHeaderMotion
              ? 'none'
              : `transform ${swipeDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
          className="flex items-baseline gap-6 sm:gap-8 w-max will-change-transform"
        >
          {TRIPLED_TABS.map((tab, idx) => {
            const isSlotActive = idx === slotIndex;
            const isIncoming = (isSwiping || t > 0) && t > 0 && idx === incomingSlot;
            let opacity = 0.36;
            if (isSlotActive) {
              opacity = t > 0 ? 1 - 0.64 * t : 1;
            } else if (isIncoming) {
              opacity = 0.36 + 0.64 * t;
            }

            return (
              <button
                key={`${tab.id}-${idx}`}
                ref={(el) => {
                  buttonRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => {
                  if (idx === slotIndex) {
                    if (isInDrilldown) {
                      onResetDrilldown?.();
                    }
                    return;
                  }
                  setSkipTransition(false);
                  setSlotIndex(idx);
                  prevActiveIdxRef.current = idx % TOTAL_TABS;
                  onResetDrilldown?.();
                  onSelectView(tab.id);
                }}
                style={{
                  opacity,
                  transition: disableHeaderMotion ? 'none' : `opacity ${opacityDurationMs}ms ease`,
                }}
                className={`text-[2.45rem] sm:text-5xl font-light lowercase tracking-tight leading-none whitespace-nowrap shrink-0 focus-visible:outline-none ${
                  isSlotActive
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible Metro Search Input */}
      {(searchOpen || searchQuery.length > 0) && (
        <div className="pt-1 pb-1">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search albums, songs, artists..."
              autoFocus={searchOpen}
              className="w-full min-h-[42px] pl-10 pr-4 bg-white dark:bg-black border-2 border-zinc-300 dark:border-white/25 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
        </div>
      )}
    </header>
  );
};
