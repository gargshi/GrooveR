import React from 'react';
import { Check, SlidersHorizontal, Type, X } from 'lucide-react';
import { FONT_PRESETS } from '../lib/fonts';
import { FontOption } from '../types/music';

interface SettingsModalProps {
  isOpen: boolean;
  fontFamily: FontOption;
  onSelectFont: (font: FontOption) => void;
  onOpenEq: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  fontFamily,
  onSelectFont,
  onOpenEq,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="App Settings"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-[#12151C] border border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 max-h-[88vh] overflow-y-auto pb-safe">
        <div className="sm:hidden w-10 h-1 bg-zinc-700 rounded-full mx-auto -mt-1 mb-2" />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Settings</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Typography & Audio Preferences</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
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
                  <div className="min-w-0 flex-1" style={{ fontFamily: preset.cssStack }}>
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
              onClose();
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
