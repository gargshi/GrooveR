import React from 'react';
import { ArrowDown, ArrowUp, Trash2, X } from 'lucide-react';
import { formatDuration } from '../lib/formatters';
import { Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface QueueDrawerProps {
  isOpen: boolean;
  queueTracks: Track[];
  currentQueueIndex: number;
  onPlayIndex: (idx: number) => void;
  onMoveItem: (fromIdx: number, toIdx: number) => void;
  onRemoveIndex: (idx: number) => void;
  onClearQueue: () => void;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  queueTracks,
  currentQueueIndex,
  onPlayIndex,
  onMoveItem,
  onRemoveIndex,
  onClearQueue,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0D0F14] border-l border-white/10 h-full flex flex-col shadow-2xl pt-safe">
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="font-display text-base font-bold text-white">Up Next Queue</h2>
            <p className="text-xs font-mono-nums text-zinc-400">
              {queueTracks.length} {queueTracks.length === 1 ? 'track' : 'tracks'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {queueTracks.length > 0 && (
              <button
                type="button"
                onClick={onClearQueue}
                className="min-h-[38px] px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] whitespace-nowrap"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05]"
              aria-label="Close queue"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {queueTracks.length === 0 ? (
            <div className="py-16 text-center px-4">
              <p className="text-sm font-medium text-zinc-300">Queue is empty</p>
              <p className="text-xs text-zinc-500 mt-1">
                Play a track or add songs to build your playback order.
              </p>
            </div>
          ) : (
            queueTracks.map((trk, idx) => {
              const isCurrent = idx === currentQueueIndex;
              return (
                <div
                  key={`${trk.id}-${idx}`}
                  className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${
                    isCurrent
                      ? 'bg-[var(--accent-tint)] border border-[var(--accent-border)]'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onPlayIndex(idx)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <CoverArt
                      src={trk.coverArt}
                      alt={trk.album}
                      accentColor={trk.accentColor}
                      className="w-10 h-10 rounded-lg"
                      iconSize="w-4 h-4"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-[var(--accent-soft)]' : 'text-white'}`}>
                        {trk.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        {trk.artist} <span aria-hidden="true">·</span>{' '}
                        <span className="font-mono-nums">{formatDuration(trk.duration)}</span>
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveItem(idx, idx - 1)}
                      className="min-h-[36px] min-w-[32px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-white disabled:opacity-25"
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === queueTracks.length - 1}
                      onClick={() => onMoveItem(idx, idx + 1)}
                      className="min-h-[36px] min-w-[32px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-white disabled:opacity-25"
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveIndex(idx)}
                      className="min-h-[36px] min-w-[32px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400"
                      aria-label="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
