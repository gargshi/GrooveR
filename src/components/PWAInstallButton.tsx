import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-tint)] text-[var(--accent-soft)] border border-[var(--accent-border)] hover:brightness-110 transition-colors whitespace-nowrap shrink-0 min-h-[44px] ${
          compact ? 'px-3 text-xs font-medium' : 'px-4 py-2 text-xs font-semibold w-full'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{compact ? 'Install' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-black/[0.05] dark:bg-white/[0.05] text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 min-h-[44px] ${
            compact ? 'px-3 text-xs font-medium' : 'px-4 py-2 text-xs font-semibold w-full'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#14171F] border border-zinc-200 dark:border-white/10 p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Install GrooveR</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  aria-label="Close install guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                1. Tap the <strong className="text-zinc-900 dark:text-white">Share</strong> icon in your browser bar.
                <br />
                2. Scroll down and select <strong className="text-zinc-900 dark:text-white">Add to Home Screen</strong> for offline standalone playback.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[var(--accent-primary)] text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
