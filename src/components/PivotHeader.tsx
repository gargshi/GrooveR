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
  onToggleSearch: () => void;
  onSearchChange: (q: string) => void;
  onSelectView: (view: LibraryView) => void;
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
  onToggleSearch,
  onSearchChange,
  onSelectView,
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

  // Sync activeIdx -> slotIndex with shortest-path seamless wrap
  useEffect(() => {
    const prevIdx = prevActiveIdxRef.current;
    if (prevIdx === activeIdx) return;
    prevActiveIdxRef.current = activeIdx;

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
  }, [activeIdx]);

  // Silently re-center slotIndex into the middle cycle [5..9] after wrap animation completes
  useEffect(() => {
    if (slotIndex >= TOTAL_TABS && slotIndex < TOTAL_TABS * 2) return;
    const timer = window.setTimeout(() => {
      setSkipTransition(true);
      setSlotIndex(TOTAL_TABS + (((slotIndex % TOTAL_TABS) + TOTAL_TABS) % TOTAL_TABS));
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setSkipTransition(false));
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [slotIndex]);

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

  return (
    <header className="space-y-2 pt-1 select-none">
      {/* Top Bar: MUSIC title + utility actions */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold tracking-[0.18em] uppercase text-white">
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
              searchOpen || searchQuery ? 'text-[var(--accent-primary)]' : 'text-zinc-300 hover:text-white'
            }`}
            aria-label={searchOpen ? 'Close search' : 'Search library'}
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onOpenEq}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center text-zinc-300 hover:text-white transition-colors lg:hidden"
            aria-label="Open equalizer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[var(--accent-primary)]" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onImportFiles}
            className="min-h-[42px] min-w-[42px] flex items-center justify-center text-white hover:text-[var(--accent-primary)] transition-colors"
            aria-label="Add music files"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Panoramic Lowercase Pivot Header Strip */}
      <div className="relative overflow-hidden py-1 -mx-1 px-1">
        <div
          ref={trackRef}
          style={{
            transform: `translate3d(${currentTranslateX}px, 0, 0)`,
            transition:
              isSwiping || skipTransition
                ? 'none'
                : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="flex items-baseline gap-6 sm:gap-8 w-max will-change-transform"
        >
          {TRIPLED_TABS.map((tab, idx) => {
            const isSlotActive = idx === slotIndex;
            const isIncoming = isSwiping && t > 0 && idx === incomingSlot;
            let opacity = 0.36;
            if (isSlotActive) {
              opacity = isSwiping ? 1 - 0.64 * t : 1;
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
                  if (idx === slotIndex) return;
                  setSkipTransition(false);
                  setSlotIndex(idx);
                  prevActiveIdxRef.current = idx % TOTAL_TABS;
                  onSelectView(tab.id);
                }}
                style={{
                  opacity,
                  transition: isSwiping ? 'none' : 'opacity 220ms ease',
                }}
                className={`text-[2.45rem] sm:text-5xl font-light lowercase tracking-tight leading-none whitespace-nowrap shrink-0 focus-visible:outline-none ${
                  isSlotActive ? 'text-white' : 'text-zinc-200 hover:text-white'
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
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search albums, songs, artists..."
              autoFocus={searchOpen}
              className="w-full min-h-[42px] pl-10 pr-4 bg-black border-2 border-white/25 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
        </div>
      )}
    </header>
  );
};
