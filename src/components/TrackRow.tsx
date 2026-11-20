import React, { useState } from 'react';
import {
  Edit3,
  Heart,
  ListPlus,
  MoreVertical,
  Play,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { formatDuration } from '../lib/formatters';
import { Playlist, Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface TrackRowProps {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  playlists: Playlist[];
  onPlay: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onToggleFavorite: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  removeFromPlaylistLabel?: string;
  onRemoveFromPlaylist?: () => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isActive,
  isPlaying,
  playlists,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  onAddToPlaylist,
  onEdit,
  onDelete,
  removeFromPlaylistLabel,
  onRemoveFromPlaylist,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-3 px-3 sm:px-4 min-h-[64px] py-2 rounded-xl transition-colors ${
        isActive
          ? 'bg-[#2E8BFF]/12'
          : 'hover:bg-white/[0.04]'
      }`}
    >
      {/* Index / Play button */}
      <button
        type="button"
        onClick={onPlay}
        className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-xs font-mono-nums text-zinc-500 hover:text-white shrink-0"
        aria-label={`Play ${track.title}`}
      >
        {isActive && isPlaying ? (
          <span className="text-[#2E8BFF] font-semibold">▶</span>
        ) : (
          <span className="group-hover:hidden">{index + 1}</span>
        )}
        {!(isActive && isPlaying) && (
          <Play className="hidden group-hover:block w-3.5 h-3.5 fill-current text-white" />
        )}
      </button>

      {/* Main clickable row area */}
      <button
        type="button"
        onClick={onPlay}
        className="flex items-center gap-3 min-w-0 flex-1 text-left py-1 focus-visible:outline-none"
      >
        <CoverArt
          src={track.coverArt}
          alt={track.album}
          accentColor={track.accentColor}
          className="w-11 h-11 rounded-xl"
          iconSize="w-4 h-4"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold truncate ${
              isActive ? 'text-[#64AEFF]' : 'text-white'
            }`}
          >
            {track.title}
          </p>
          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {track.artist} <span aria-hidden="true">·</span> {track.album}
          </p>
        </div>
      </button>

      {/* Desktop format & duration */}
      <div className="hidden md:flex items-center gap-3 text-xs font-mono-nums text-zinc-500 shrink-0">
        <span>{track.format}</span>
        <span className="w-12 text-right text-zinc-400">{formatDuration(track.duration)}</span>
      </div>

      {/* Mobile duration */}
      <span className="md:hidden text-xs font-mono-nums text-zinc-500 shrink-0">
        {formatDuration(track.duration)}
      </span>

      {/* Quick actions */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`min-h-[44px] min-w-[40px] flex items-center justify-center rounded-lg transition-colors ${
            track.isFavorite
              ? 'text-[#2E8BFF]'
              : 'text-zinc-500 hover:text-zinc-200 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100'
          }`}
          aria-label={track.isFavorite ? 'Remove favorite' : 'Add favorite'}
        >
          <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-current' : ''}`} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            aria-label={`Actions for ${track.title}`}
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
              <div className="absolute right-0 top-11 z-50 w-52 rounded-xl bg-[#161922] border border-white/10 shadow-2xl p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onPlayNext();
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
                    onAddToQueue();
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
                    onEdit();
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
                          onAddToPlaylist(pl.id);
                        }}
                        className="w-full min-h-[36px] px-3 rounded-lg text-left text-xs text-zinc-300 hover:bg-white/[0.07] truncate"
                      >
                        {pl.name}
                      </button>
                    ))}
                  </div>
                )}

                {onRemoveFromPlaylist && removeFromPlaylistLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRemoveFromPlaylist();
                    }}
                    className="w-full min-h-[40px] px-3 rounded-lg text-left text-xs font-medium text-amber-300 hover:bg-amber-500/10 flex items-center gap-2.5 border-t border-white/[0.08] mt-1 pt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{removeFromPlaylistLabel}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
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
    </div>
  );
};
