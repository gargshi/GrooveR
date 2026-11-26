import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { resizeImageFileToDataUrl } from '../lib/metadataParser';
import { Track, TrackMetadataUpdate } from '../types/music';
import { CoverArt } from './CoverArt';

interface TrackEditorModalProps {
  track: Track | null;
  onSave: (trackId: string, update: TrackMetadataUpdate) => Promise<void>;
  onClose: () => void;
}

export const TrackEditorModal: React.FC<TrackEditorModalProps> = ({
  track,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [albumArtist, setAlbumArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [trackNumber, setTrackNumber] = useState('0');
  const [coverArt, setCoverArt] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const artInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (track) {
      setTitle(track.title);
      setArtist(track.artist);
      setAlbum(track.album);
      setAlbumArtist(track.albumArtist || track.artist);
      setGenre(track.genre || '');
      setYear(track.year || '');
      setTrackNumber(String(track.trackNumber || 0));
      setCoverArt(track.coverArt);
    }
  }, [track]);

  if (!track) return null;

  const handleArtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImageFileToDataUrl(file, 600);
    setCoverArt(resized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(track.id, {
        title: title.trim() || track.title,
        artist: artist.trim() || 'Unknown Artist',
        album: album.trim() || 'Local Collection',
        albumArtist: albumArtist.trim() || artist.trim() || 'Unknown Artist',
        genre: genre.trim() || 'Local Audio',
        year: year.trim(),
        trackNumber: parseInt(trackNumber, 10) || 0,
        coverArt,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Track Metadata"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#12151C] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto pb-safe"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Edit Track Info</h2>
            <p className="text-xs text-zinc-400 truncate max-w-[260px]">{track.fileName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            aria-label="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cover Art Picker */}
        <div className="flex items-center gap-4">
          <CoverArt
            src={coverArt}
            alt={album}
            accentColor={track.accentColor}
            className="w-20 h-20 rounded-xl"
            iconSize="w-7 h-7"
          />
          <div className="space-y-2">
            <input
              ref={artInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleArtUpload(e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => artInputRef.current?.click()}
              className="min-h-[40px] px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <ImagePlus className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Change Album Art</span>
            </button>
            {coverArt && (
              <button
                type="button"
                onClick={() => setCoverArt(undefined)}
                className="block text-xs text-zinc-400 hover:text-zinc-200"
              >
                Remove artwork
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="sm:col-span-2 block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Artist</span>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Album</span>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Album Artist</span>
            <input
              type="text"
              value={albumArtist}
              onChange={(e) => setAlbumArtist(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Genre</span>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Year</span>
            <input
              type="text"
              maxLength={4}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white font-mono-nums focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Track Number</span>
            <input
              type="number"
              min={0}
              max={999}
              value={trackNumber}
              onChange={(e) => setTrackNumber(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white font-mono-nums focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-sm font-medium text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-[44px] px-5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
