import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { EQ_PRESETS } from '../lib/audioEngine';
import { EqBands, EqSettings } from '../types/music';

interface EqualizerModalProps {
  isOpen: boolean;
  eq: EqSettings;
  onChange: (next: EqSettings) => void;
  onClose: () => void;
}

const BAND_META: Array<{ key: keyof EqBands; label: string }> = [
  { key: 'hz60', label: '60 Hz' },
  { key: 'hz230', label: '230 Hz' },
  { key: 'hz910', label: '910 Hz' },
  { key: 'khz3_6', label: '3.6 kHz' },
  { key: 'khz14', label: '14 kHz' },
];

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  eq,
  onChange,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleBandChange = (key: keyof EqBands, value: number) => {
    onChange({
      ...eq,
      presetName: 'Custom',
      bands: {
        ...eq.bands,
        [key]: value,
      },
    });
  };

  const applyPreset = (name: string) => {
    const presetBands = EQ_PRESETS[name];
    if (!presetBands) return;
    onChange({
      ...eq,
      enabled: true,
      presetName: name,
      bands: { ...presetBands },
    });
  };

  const handleReset = () => {
    onChange({
      enabled: true,
      presetName: 'Flat',
      preamp: 0,
      bands: { ...EQ_PRESETS.Flat },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="5-Band Equalizer"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#12151C] border border-zinc-200 dark:border-white/10 p-5 sm:p-6 shadow-2xl space-y-5 pb-safe">
        {/* Drag handle on mobile */}
        <div className="sm:hidden w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto -mt-1 mb-2" />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">5-Band Equalizer</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Real-time Web Audio DSP · {eq.enabled ? eq.presetName : 'Bypassed'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...eq, enabled: !eq.enabled })}
              className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                eq.enabled
                  ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]'
                  : 'bg-black/[0.06] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {eq.enabled ? 'Enabled' : 'Bypassed'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06]"
              aria-label="Close equalizer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(EQ_PRESETS).map((presetName) => {
            const active = eq.enabled && eq.presetName === presetName;
            return (
              <button
                key={presetName}
                type="button"
                onClick={() => applyPreset(presetName)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[var(--accent-tint)] text-[var(--accent-soft)] border border-[var(--accent-border)]'
                    : 'bg-zinc-100 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.06] hover:bg-zinc-200 dark:hover:bg-white/[0.08]'
                }`}
              >
                {presetName}
              </button>
            );
          })}
        </div>

        {/* 5-Band Sliders */}
        <div className="grid grid-cols-5 gap-2 pt-2">
          {BAND_META.map((band) => {
            const val = eq.bands[band.key];
            return (
              <div
                key={band.key}
                className="flex flex-col items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.06]"
              >
                <span className="text-[11px] font-mono-nums text-[var(--accent-soft)]">
                  {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                </span>
                <div className="h-36 flex items-center justify-center py-2">
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={val}
                    disabled={!eq.enabled}
                    onChange={(e) => handleBandChange(band.key, parseFloat(e.target.value))}
                    aria-label={`${band.label} gain`}
                    className="groover-range w-28 -rotate-90 accent-[var(--accent-primary)]"
                    style={{
                      background: 'linear-gradient(to right, rgba(128,128,128,0.28), var(--accent-dim))',
                      height: '4px',
                      borderRadius: '9999px',
                    }}
                  />
                </div>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  {band.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Preamp & Reset */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-200 dark:border-white/[0.07]">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Preamp Gain</span>
              <span className="font-mono-nums text-zinc-700 dark:text-zinc-200">
                {eq.preamp > 0 ? `+${eq.preamp.toFixed(1)}` : eq.preamp.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min={-6}
              max={6}
              step={0.5}
              value={eq.preamp}
              disabled={!eq.enabled}
              onChange={(e) => onChange({ ...eq, preamp: parseFloat(e.target.value) })}
              aria-label="Preamp gain"
              className="groover-range w-full h-1.5 rounded-full bg-zinc-300 dark:bg-white/15"
            />
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] px-3.5 rounded-xl bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black/[0.09] dark:hover:bg-white/[0.09] text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
