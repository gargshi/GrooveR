import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  DEFAULT_SMART_RULES,
  describeSmartRules,
  evaluateSmartPlaylist,
  extractLibraryGenres,
  SMART_PLAYLIST_PRESETS,
} from '../lib/smartPlaylists';
import {
  Playlist,
  SmartPlaylistAddedWithin,
  SmartPlaylistRules,
  SmartPlaylistSort,
  Track,
} from '../types/music';

interface SmartPlaylistModalProps {
  isOpen: boolean;
  tracks: Track[];
  editingPlaylist?: Playlist | null;
  onSave: (
    name: string,
    description: string,
    rules: SmartPlaylistRules,
    existingId?: string
  ) => Promise<void>;
  onClose: () => void;
}

export const SmartPlaylistModal: React.FC<SmartPlaylistModalProps> = ({
  isOpen,
  tracks,
  editingPlaylist = null,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<SmartPlaylistRules>(DEFAULT_SMART_RULES);
  const [customGenre, setCustomGenre] = useState('');
  const [nameEditedManually, setNameEditedManually] = useState(false);
  const [saving, setSaving] = useState(false);

  const libraryGenres = useMemo(() => extractLibraryGenres(tracks), [tracks]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingPlaylist && editingPlaylist.smartRules) {
      setName(editingPlaylist.name);
      setDescription(editingPlaylist.description || '');
      setRules({
        ...DEFAULT_SMART_RULES,
        ...editingPlaylist.smartRules,
        genres: [...(editingPlaylist.smartRules.genres || [])],
      });
      setNameEditedManually(true);
    } else {
      const initial = SMART_PLAYLIST_PRESETS[0];
      setRules({ ...initial.rules, genres: [] });
      setName(initial.suggestedName);
      setDescription('');
      setNameEditedManually(false);
    }
    setCustomGenre('');
  }, [isOpen, editingPlaylist]);

  const matchingTracks = useMemo(
    () => evaluateSmartPlaylist(tracks, rules),
    [tracks, rules]
  );

  if (!isOpen) return null;

  const autoDescription = describeSmartRules(rules);

  const handleApplyPreset = (presetId: string) => {
    const preset = SMART_PLAYLIST_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    let nextRules: SmartPlaylistRules = {
      ...preset.rules,
      genres: [...preset.rules.genres],
    };
    let suggested = preset.suggestedName;

    if (presetId === 'genre' && libraryGenres.length > 0) {
      nextRules = { ...nextRules, genres: [libraryGenres[0].genre] };
      suggested = `${libraryGenres[0].genre} Mix`;
    }

    setRules(nextRules);
    if (!nameEditedManually) {
      setName(suggested);
    }
  };

  const toggleGenre = (genre: string) => {
    setRules((prev) => {
      const exists = prev.genres.some((g) => g.toLowerCase() === genre.toLowerCase());
      const nextGenres = exists
        ? prev.genres.filter((g) => g.toLowerCase() !== genre.toLowerCase())
        : [...prev.genres, genre];

      if (!nameEditedManually) {
        if (nextGenres.length === 1) {
          setName(`${nextGenres[0]} Mix`);
        } else if (nextGenres.length > 1) {
          setName(`${nextGenres[0]} & More`);
        }
      }

      return { ...prev, genres: nextGenres };
    });
  };

  const handleAddCustomGenre = () => {
    const trimmed = customGenre.trim();
    if (!trimmed) return;
    if (!rules.genres.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      toggleGenre(trimmed);
    }
    setCustomGenre('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Smart Playlist';
    const finalDesc = description.trim() || autoDescription;
    setSaving(true);
    try {
      await onSave(finalName, finalDesc, rules, editingPlaylist?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editingPlaylist ? 'Edit Smart Playlist' : 'Generate Smart Playlist'}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full sm:max-w-xl max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#12151C] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 pb-safe"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[var(--accent-tint)] border border-[var(--accent-border)] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                {editingPlaylist ? 'Edit Smart Playlist Rules' : 'Generate Smart Playlist'}
              </h2>
              <p className="text-xs text-zinc-400">
                Auto-updates whenever you import or play songs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Quick Templates
          </span>
          <div className="flex flex-wrap gap-2">
            {SMART_PLAYLIST_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                className="min-h-[36px] px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-zinc-200 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Playlist Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameEditedManually(true);
              }}
              placeholder="Recently Added"
              required
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Description (optional)</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={autoDescription}
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </label>
        </div>

        {/* Genres Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Genres {rules.genres.length > 0 ? `(${rules.genres.length} selected)` : '(All)'}
            </span>
            {rules.genres.length > 0 && (
              <button
                type="button"
                onClick={() => setRules((prev) => ({ ...prev, genres: [] }))}
                className="text-xs text-[var(--accent-soft)] hover:underline"
              >
                Clear genres
              </button>
            )}
          </div>

          {libraryGenres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {libraryGenres.map((item) => {
                const selected = rules.genres.some(
                  (g) => g.toLowerCase() === item.genre.toLowerCase()
                );
                return (
                  <button
                    key={item.genre}
                    type="button"
                    onClick={() => toggleGenre(item.genre)}
                    className={`min-h-[34px] px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                      selected
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--accent-contrast)]'
                        : 'bg-[#090A0D] border-white/10 text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    <span>{item.genre}</span>
                    <span className={`font-mono-nums text-[11px] ${selected ? 'opacity-80' : 'text-zinc-500'}`}>
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom / extra selected genres not in dropdown */}
          {rules.genres.some(
            (g) => !libraryGenres.some((lg) => lg.genre.toLowerCase() === g.toLowerCase())
          ) && (
            <div className="flex flex-wrap gap-1.5">
              {rules.genres
                .filter(
                  (g) => !libraryGenres.some((lg) => lg.genre.toLowerCase() === g.toLowerCase())
                )
                .map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className="min-h-[32px] px-2.5 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-contrast)] text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <span>{g}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomGenre();
                }
              }}
              placeholder="Add custom genre filter (e.g. Rock, Synthwave)"
              className="flex-1 min-h-[38px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--accent-primary)]"
            />
            <button
              type="button"
              onClick={handleAddCustomGenre}
              disabled={!customGenre.trim()}
              className="min-h-[38px] px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 text-xs font-medium text-zinc-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* Time Window & Play Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Added Within</span>
            <select
              value={rules.addedWithin}
              onChange={(e) =>
                setRules((prev) => ({
                  ...prev,
                  addedWithin: e.target.value as SmartPlaylistAddedWithin,
                }))
              }
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="any">Anytime</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Minimum Plays</span>
            <select
              value={String(rules.minPlayCount)}
              onChange={(e) =>
                setRules((prev) => ({
                  ...prev,
                  minPlayCount: Number(e.target.value) || 0,
                }))
              }
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="0">Any play count</option>
              <option value="1">1+ plays</option>
              <option value="3">3+ plays</option>
              <option value="5">5+ plays</option>
              <option value="10">10+ plays</option>
            </select>
          </label>
        </div>

        {/* Sort Order & Limit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Sort Order</span>
            <select
              value={rules.sortBy}
              onChange={(e) =>
                setRules((prev) => ({
                  ...prev,
                  sortBy: e.target.value as SmartPlaylistSort,
                }))
              }
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="addedAt-desc">Recently Added</option>
              <option value="playCount-desc">Most Played</option>
              <option value="lastPlayedAt-desc">Recently Played</option>
              <option value="title-asc">Title (A–Z)</option>
              <option value="duration-desc">Longest Duration</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">Max Songs</span>
            <select
              value={rules.limit === null ? 'all' : String(rules.limit)}
              onChange={(e) =>
                setRules((prev) => ({
                  ...prev,
                  limit: e.target.value === 'all' ? null : Number(e.target.value),
                }))
              }
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#090A0D] border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="15">Up to 15 songs</option>
              <option value="25">Up to 25 songs</option>
              <option value="50">Up to 50 songs</option>
              <option value="100">Up to 100 songs</option>
              <option value="all">All matching songs</option>
            </select>
          </label>
        </div>

        {/* Boolean Toggles */}
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() =>
              setRules((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))
            }
            aria-pressed={rules.favoritesOnly}
            className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-medium transition-colors ${
              rules.favoritesOnly
                ? 'bg-[var(--accent-tint)] border-[var(--accent-border)] text-white'
                : 'bg-[#090A0D] border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Favorites Only
          </button>

          <button
            type="button"
            onClick={() =>
              setRules((prev) => ({ ...prev, losslessOnly: !prev.losslessOnly }))
            }
            aria-pressed={rules.losslessOnly}
            className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-medium transition-colors ${
              rules.losslessOnly
                ? 'bg-[var(--accent-tint)] border-[var(--accent-border)] text-white'
                : 'bg-[#090A0D] border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Lossless Only (FLAC / WAV)
          </button>
        </div>

        {/* Live Match Preview */}
        <div className="p-3.5 rounded-xl bg-[#090A0D] border border-white/[0.08] space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-300">Live Match Preview</span>
            <span className="text-xs font-mono-nums font-semibold text-[var(--accent-soft)]">
              {matchingTracks.length} {matchingTracks.length === 1 ? 'song' : 'songs'}
            </span>
          </div>
          {matchingTracks.length > 0 ? (
            <p className="text-[11px] text-zinc-500 truncate">
              Includes: {matchingTracks.slice(0, 3).map((t) => t.title).join(', ')}
              {matchingTracks.length > 3 ? ` +${matchingTracks.length - 3} more` : ''}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500">
              No tracks match these filters yet — it will auto-populate as matching songs are added or played.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-sm font-medium text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="min-h-[44px] px-5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-sm font-semibold text-[var(--accent-contrast)] inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {saving
                ? 'Saving...'
                : editingPlaylist
                ? 'Save Rules'
                : 'Generate Smart Playlist'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
