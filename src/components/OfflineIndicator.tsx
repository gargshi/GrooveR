import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-[#1B1F29] border border-amber-400/50 dark:border-amber-500/35 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 whitespace-nowrap shrink-0"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <span>Offline Mode</span>
    </div>
  );
};
