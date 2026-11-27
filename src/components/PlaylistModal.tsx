import React, { useState } from 'react';
import { X } from 'lucide-react';

interface PlaylistModalProps {
  isOpen: boolean;
  initialName?: string;
  initialDescription?: string;
  mode: 'create' | 'rename';
  onSubmit: (name: string, description: string) => Promise<void>;
  onClose: () => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  initialName = '',
  initialDescription = '',
  mode,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Create Playlist' : 'Rename Playlist'}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#12151C] border border-zinc-200 dark:border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 pb-safe"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
            {mode === 'create' ? 'New Offline Playlist' : 'Edit Playlist'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Playlist Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Night Drive Mix"
            required
            autoFocus
            className="w-full min-h-[44px] px-3 rounded-xl bg-zinc-50 dark:bg-[#090A0D] border border-zinc-300 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Description (optional)</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Lossless FLAC favorites for commute"
            className="w-full min-h-[44px] px-3 rounded-xl bg-zinc-50 dark:bg-[#090A0D] border border-zinc-300 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black/[0.09] dark:hover:bg-white/[0.09] text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="min-h-[44px] px-5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-50"
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Create Playlist' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
