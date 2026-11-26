import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Heart,
  ListPlus,
  MoreVertical,
  Pause,
  Play,
  PlusCircle,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { formatDuration } from '../lib/formatters';
import { Playlist, Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface SongDeckViewProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  playlists: Playlist[];
  onPlayTrack: (index: number) => void;
  onTogglePlay: () => void;
  onPlayNext: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onEditTrack: (track: Track) => void;
  onDeleteTrack: (trackId: string) => void;
}

export const SongDeckView: React.FC<SongDeckViewProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  playlists,
  onPlayTrack,
  onTogglePlay,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  onAddToPlaylist,
  onEditTrack,
  onDeleteTrack,
}) => {
  const [deckIndex, setDeckIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; time: number; lockedAxis: 'x' | 'y' | null } | null>(
    null
  );

  // Clamp deckIndex if tracks list shrinks (e.g. search/filter)
  const safeIndex = tracks.length > 0 ? Math.min(deckIndex, tracks.length - 1) : 0;

  useEffect(() => {
    if (deckIndex !== safeIndex) {
      setDeckIndex(safeIndex);
    }
  }, [deckIndex, safeIndex]);

  useEffect(() => {
    setMenuOpen(false);
  }, [safeIndex]);

  if (tracks.length === 0) {
    return null;
  }

  const goToIndex = (nextIdx: number, direction?: 'left' | 'right') => {
    if (tracks.length === 0) return;
    const wrapped = ((nextIdx % tracks.length) + tracks.length) % tracks.length;
    if (direction) {
      setSwipeDir(direction);
      setTimeout(() => setSwipeDir(null), 190);
    }
    setDeckIndex(wrapped);
  };

  const handleNextCard = () => goToIndex(safeIndex + 1, 'left');
  const handlePrevCard = () => goToIndex(safeIndex - 1, 'right');

  const handleRandomCard = () => {
    if (tracks.length <= 1) return;
    let rand = safeIndex;
    while (rand === safeIndex) {
      rand = Math.floor(Math.random() * tracks.length);
    }
    goToIndex(rand, 'left');
  };

  const activePlayingIndex = currentTrackId
    ? tracks.findIndex((t) => t.id === currentTrackId)
    : -1;

  const frontTrack = tracks[safeIndex];
  const isFrontActive = frontTrack.id === currentTrackId;

  // Up to 3 visible cards in stack: front (0), middle (1), back (2)
  const visibleDepth = Math.min(3, tracks.length);
  const stackIndices = Array.from({ length: visibleDepth }, (_, offset) =>
    (safeIndex + offset) % tracks.length
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      lockedAxis: null,
    };
    setIsDragging(false);
    setDragX(0);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (!start.lockedAxis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      start.lockedAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (start.lockedAxis === 'x') {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore if unavailable
        }
        setIsDragging(true);
      } else {
        dragStartRef.current = null;
        return;
      }
    }

    if (start.lockedAxis === 'x') {
      setDragX(dx);
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start || start.lockedAxis !== 'x') {
      setIsDragging(false);
      setDragX(0);
      return;
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    const dt = Math.max(1, Date.now() - start.time);
    const vx = dragX / dt;

    setIsDragging(false);

    if (dragX < -70 || vx < -0.45) {
      setDragX(0);
      handleNextCard();
    } else if (dragX > 70 || vx > 0.45) {
      setDragX(0);
      handlePrevCard();
    } else {
      setDragX(0);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Interactive Card Deck Stage */}
      <div className="lg:col-span-7 flex flex-col items-center space-y-5 py-2">
        <div
          data-no-pivot-swipe="true"
          className="relative w-full max-w-[380px] sm:max-w-[420px] pt-2 pb-4 px-2"
        >
          {/* Layered Card Stack */}
          <div className="relative w-full aspect-[4/5] sm:aspect-[10/11] touch-pan-y select-none">
            {[...stackIndices].reverse().map((trackIdx, revPos) => {
              const stackPos = stackIndices.length - 1 - revPos; // 0 = front, 1 = 2nd, 2 = 3rd
              const trk = tracks[trackIdx];
              const isFront = stackPos === 0;

              const baseTranslateY = stackPos * 12;
              const baseScale = 1 - stackPos * 0.045;
              const baseRotate = stackPos === 1 ? 2.2 : stackPos === 2 ? -2.4 : 0;
              const baseOpacity = stackPos === 0 ? 1 : stackPos === 1 ? 0.72 : 0.44;

              const dynamicX = isFront ? dragX : 0;
              const dynamicRotate = isFront ? dragX * 0.035 : baseRotate;
              const swipeOffset =
                isFront && swipeDir
                  ? swipeDir === 'left'
                    ? -18
                    : 18
                  : 0;

              return (
                <div
                  key={`${trk.id}-${stackPos}`}
                  onPointerDown={isFront ? handlePointerDown : undefined}
                  onPointerMove={isFront ? handlePointerMove : undefined}
                  onPointerUp={isFront ? finishDrag : undefined}
                  onPointerCancel={isFront ? finishDrag : undefined}
                  style={{
                    zIndex: 30 - stackPos * 10,
                    transform: `translate3d(${dynamicX + swipeOffset}px, ${baseTranslateY}px, 0) scale(${baseScale}) rotate(${dynamicRotate}deg)`,
                    opacity: baseOpacity,
                    transition: isDragging
                      ? 'none'
                      : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
                  }}
                  className={`absolute inset-0 rounded-3xl overflow-hidden bg-[#13161F] border ${
                    isFront && isFrontActive
                      ? 'border-[#2E8BFF]/45 shadow-[0_24px_54px_rgba(0,0,0,0.65)]'
                      : 'border-white/10 shadow-[0_20px_44px_rgba(0,0,0,0.55)]'
                  } flex flex-col ${isFront ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                >
                  {/* Artwork Half */}
                  <div className="relative flex-1 min-h-0 overflow-hidden bg-[#0D0F14]">
                    <CoverArt
                      src={trk.coverArt}
                      alt={trk.album}
                      accentColor={trk.accentColor}
                      className="w-full h-full rounded-none"
                      iconSize="w-16 h-16"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13161F] via-[#13161F]/25 to-transparent" />

                    {/* Top Card Index Counter (plain unboxed text with subtle scrim) */}
                    {isFront && (
                      <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between text-xs font-mono-nums text-white/90 drop-shadow">
                        <span>
                          {safeIndex + 1} / {tracks.length}
                        </span>
                        <span>{trk.format}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Details & Direct Play Controls */}
                  <div className="px-5 pt-2 pb-5 space-y-4 bg-[#13161F]">
                    <div className="min-w-0 space-y-1">
                      <h2
                        className={`font-display text-lg sm:text-xl font-bold truncate ${
                          isFront && isFrontActive ? 'text-[#64AEFF]' : 'text-white'
                        }`}
                      >
                        {trk.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-300 truncate">
                        {trk.artist} <span aria-hidden="true">·</span> {trk.album}
                      </p>
                      <p className="text-xs font-mono-nums text-zinc-500">
                        {formatDuration(trk.duration)}
                        {trk.bitrateKbps ? ` · ${trk.bitrateKbps} kbps` : ''}
                        {trk.year ? ` · ${trk.year}` : ''}
                      </p>
                    </div>

                    {isFront && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(trk.id)}
                          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors ${
                            trk.isFavorite
                              ? 'bg-[#2E8BFF]/15 border-[#2E8BFF]/35 text-[#2E8BFF]'
                              : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white'
                          }`}
                          aria-label={trk.isFavorite ? 'Remove favorite' : 'Add favorite'}
                        >
                          <Heart className={`w-4 h-4 ${trk.isFavorite ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => (isFrontActive ? onTogglePlay() : onPlayTrack(safeIndex))}
                          className="flex-1 min-h-[46px] px-5 rounded-xl bg-[#2E8BFF] hover:bg-[#1E7AE8] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                        >
                          {isFrontActive && isPlaying ? (
                            <>
                              <Pause className="w-4 h-4 fill-current" />
                              <span>Playing</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-current" />
                              <span>Play Song</span>
                            </>
                          )}
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setMenuOpen((prev) => !prev)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white"
                            aria-label={`Actions for ${trk.title}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {menuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setMenuOpen(false)}
                                aria-hidden="true"
                              />
                              <div className="absolute right-0 bottom-12 z-50 w-52 rounded-xl bg-[#161922] border border-white/10 shadow-2xl p-1.5 space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpen(false);
                                    onPlayNext(trk);
                                  }}
                                  className="w-full min-h-[40px] px-3 rounded-lg text-left text-xs font-medium text-zinc-200 hover:bg-white/[0.07] flex items-center gap-2.5"
                                >
                                  <ListPlus className="w-4 h-4 text-zinc-400" />
                                  <span>Play Next</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpen(false);
                                    onAddToQueue(trk);
                                  }}
                                  className="w-full min-h-[40px] px-3 rounded-lg text-left text-xs font-medium text-zinc-200 hover:bg-white/[0.07] flex items-center gap-2.5"
                                >
                                  <PlusCircle className="w-4 h-4 text-zinc-400" />
                                  <span>Add to Queue</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpen(false);
                                    onEditTrack(trk);
                                  }}
                                  className="w-full min-h-[40px] px-3 rounded-lg text-left text-xs font-medium text-zinc-200 hover:bg-white/[0.07] flex items-center gap-2.5"
                                >
                                  <Edit3 className="w-4 h-4 text-zinc-400" />
                                  <span>Edit Track Info</span>
                                </button>

                                {playlists.length > 0 && (
                                  <div className="pt-1 mt-1 border-t border-white/[0.08]">
                                    <p className="px-3 py-1 text-[11px] font-medium text-zinc-500">
                                      Add to Playlist
                                    </p>
                                    {playlists.map((pl) => (
                                      <button
                                        key={pl.id}
                                        type="button"
                                        onClick={() => {
                                          setMenuOpen(false);
                                          onAddToPlaylist(pl.id, trk.id);
                                        }}
                                        className="w-full min-h-[36px] px-3 rounded-lg text-left text-xs text-zinc-300 hover:bg-white/[0.07] truncate"
                                      >
                                        {pl.name}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpen(false);
                                    onDeleteTrack(trk.id);
                                  }}
                                  className="w-full min-h-[40px] px-3 rounded-lg text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 border-t border-white/[0.08] mt-1 pt-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete from Vault</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deck Navigation Strip */}
        <div className="w-full max-w-[380px] sm:max-w-[420px] flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={handlePrevCard}
            disabled={tracks.length <= 1}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#111318] border border-white/[0.08] hover:border-white/20 disabled:opacity-40 text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            aria-label="Previous song card"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev Card</span>
          </button>

          <button
            type="button"
            onClick={handleRandomCard}
            disabled={tracks.length <= 1}
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[#111318] border border-white/[0.08] hover:border-white/20 disabled:opacity-40 text-zinc-300 hover:text-white inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap"
            aria-label="Deal random card"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#2E8BFF]" />
            <span>Draw</span>
          </button>

          <button
            type="button"
            onClick={handleNextCard}
            disabled={tracks.length <= 1}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#111318] border border-white/[0.08] hover:border-white/20 disabled:opacity-40 text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            aria-label="Next song card"
          >
            <span>Next Card</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 text-center">
          Swipe card left or right to browse your deck
        </p>
      </div>

      {/* Deck Stack Quick-Jump Column / Strip */}
      <div className="lg:col-span-5 rounded-2xl bg-[#111318]/80 border border-white/[0.07] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Deck Stack</h3>
            <p className="text-xs text-zinc-400 font-mono-nums">
              Card {safeIndex + 1} of {tracks.length}
            </p>
          </div>
          {activePlayingIndex >= 0 && activePlayingIndex !== safeIndex && (
            <button
              type="button"
              onClick={() => goToIndex(activePlayingIndex)}
              className="min-h-[36px] px-3 rounded-xl bg-[#2E8BFF]/15 border border-[#2E8BFF]/35 text-xs font-medium text-[#64AEFF] hover:bg-[#2E8BFF]/25 transition-colors whitespace-nowrap"
            >
              Jump to Playing
            </button>
          )}
        </div>

        <div
          data-no-pivot-swipe="true"
          className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[460px] pb-1 lg:pb-0 lg:pr-1"
        >
          {tracks.map((trk, idx) => {
            const isSelected = idx === safeIndex;
            const isCurrent = trk.id === currentTrackId;
            return (
              <button
                key={trk.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onPlayTrack(idx);
                  } else {
                    goToIndex(idx);
                  }
                }}
                className={`shrink-0 w-44 lg:w-full min-h-[56px] p-2.5 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                  isSelected
                    ? 'bg-[#2E8BFF]/14 border-[#2E8BFF]/40 text-white'
                    : 'bg-[#0D0F14] border-white/[0.06] text-zinc-300 hover:border-white/15'
                }`}
              >
                <CoverArt
                  src={trk.coverArt}
                  alt={trk.album}
                  accentColor={trk.accentColor}
                  className="w-10 h-10 rounded-lg"
                  iconSize="w-4 h-4"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-semibold truncate ${
                      isCurrent ? 'text-[#64AEFF]' : 'text-white'
                    }`}
                  >
                    {trk.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {trk.artist} · {formatDuration(trk.duration)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
