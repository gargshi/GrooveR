import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EqualizerModal } from './components/EqualizerModal';
import { LibraryViews } from './components/LibraryViews';
import { MobileBottomNav } from './components/MobileBottomNav';
import { NowPlayingSheet } from './components/NowPlayingSheet';
import { PlayerBar } from './components/PlayerBar';
import { PlaylistModal } from './components/PlaylistModal';
import { QueueDrawer } from './components/QueueDrawer';
import { SettingsModal } from './components/SettingsModal';
import { SidebarNav } from './components/SidebarNav';
import { SmartPlaylistModal } from './components/SmartPlaylistModal';
import { TrackEditorModal } from './components/TrackEditorModal';
import { GrooveAudioEngine } from './lib/audioEngine';
import { applyAppFont, applyButtonColorScheme, applyColorMode, applyUiScale } from './lib/fonts';
import {
  clearOfflineLibrary,
  DEFAULT_SETTINGS,
  deletePlaylist,
  deleteTrackWithAudio,
  getAllPlaylists,
  getAllTracks,
  getStorageStats,
  getTrackAudioBlob,
  loadSettings,
  savePlaylist,
  saveSettings,
  saveTrackWithAudio,
  updateTrackRecord,
} from './lib/idb';
import { parseAudioFileToTrack } from './lib/metadataParser';
import {
  ButtonColorScheme,
  ColorMode,
  EqSettings,
  FontOption,
  LibraryView,
  PersistedSettings,
  Playlist,
  RepeatMode,
  SmartPlaylistRules,
  SongsDisplayMode,
  StorageEstimateInfo,
  Track,
  TrackMetadataUpdate,
  UiScaleOption,
  UiTheme,
} from './types/music';

const AUDIO_EXT_REGEX = /\.(mp3|flac|wav|m4a|aac|ogg|opus|webm)$/i;
const SLEEP_STEPS = [null, 15, 30, 45, 60] as const;

export default function App() {
  const engineRef = useRef<GrooveAudioEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GrooveAudioEngine();
  }
  const engine = engineRef.current;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [settings, setSettings] = useState<PersistedSettings>(DEFAULT_SETTINGS);
  const [storageStats, setStorageStats] = useState<StorageEstimateInfo>({
    usageBytes: 0,
    quotaBytes: 4 * 1024 * 1024 * 1024,
    trackCount: 0,
    totalAudioBytes: 0,
  });

  const [activeView, setActiveView] = useState<LibraryView>('songs');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Playback & Queue state
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Shuffle playback history & non-repeating cycle tracking (track-ID based)
  const shuffleHistoryIdsRef = useRef<string[]>([]);
  const shuffleHistoryPosRef = useRef<number>(-1);
  const shufflePlayedIdsRef = useRef<Set<string>>(new Set());

  // Overlays & Modals
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [playlistModalState, setPlaylistModalState] = useState<{
    open: boolean;
    mode: 'create' | 'rename';
    playlist?: Playlist;
  }>({ open: false, mode: 'create' });
  const [smartPlaylistModalState, setSmartPlaylistModalState] = useState<{
    open: boolean;
    editingPlaylist?: Playlist | null;
  }>({ open: false, editingPlaylist: null });

  // Sleep Timer
  const [sleepRemainingMin, setSleepRemainingMin] = useState<number | null>(null);

  // Import & Drag states
  const [isImporting, setIsImporting] = useState(false);
  const [importProgressText, setImportProgressText] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const libraryBackHandlerRef = useRef<(() => boolean) | null>(null);
  const handleHardwareBackRef = useRef<() => boolean>(() => false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const refreshStorageStats = useCallback(async (trackList: Track[]) => {
    const stats = await getStorageStats(trackList);
    setStorageStats(stats);
  }, []);

  // Hydrate library from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedTracks, loadedPlaylists, loadedSettings] = await Promise.all([
          getAllTracks(),
          getAllPlaylists(),
          loadSettings(),
        ]);
        if (cancelled) return;

        // Clean up any legacy sample tracks if present
        const legacySamples = loadedTracks.filter((t) => t.isSample);
        if (legacySamples.length > 0) {
          await Promise.all(legacySamples.map((t) => deleteTrackWithAudio(t.id)));
        }
        const realTracks = loadedTracks.filter((t) => !t.isSample);
        const sortedTracks = [...realTracks].sort((a, b) => b.addedAt - a.addedAt);
        setTracks(sortedTracks);
        setPlaylists(loadedPlaylists.sort((a, b) => b.updatedAt - a.updatedAt));
        setSettings(loadedSettings);
        applyAppFont(loadedSettings.fontFamily);
        applyUiScale(loadedSettings.uiScale);
        applyColorMode(loadedSettings.colorMode);
        applyButtonColorScheme(loadedSettings.buttonColorScheme, loadedSettings.colorMode);
        engine.setVolume(loadedSettings.volume, loadedSettings.isMuted);
        engine.setPlaybackRate(loadedSettings.playbackRate);
        engine.applyEq(loadedSettings.eq);
        await refreshStorageStats(sortedTracks);

        if (sortedTracks.length > 0) {
          setQueueIds(sortedTracks.map((t) => t.id));
          if (loadedSettings.lastTrackId) {
            const idx = sortedTracks.findIndex((t) => t.id === loadedSettings.lastTrackId);
            if (idx >= 0) {
              setCurrentQueueIndex(idx);
              const seedId = sortedTracks[idx].id;
              shuffleHistoryIdsRef.current = [seedId];
              shuffleHistoryPosRef.current = 0;
              shufflePlayedIdsRef.current = new Set([seedId]);
              const blob = await getTrackAudioBlob(sortedTracks[idx].id);
              if (blob && !cancelled) {
                await engine.loadBlob(blob, false);
                setDuration(sortedTracks[idx].duration);
              }
            }
          }
        }
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [engine, refreshStorageStats]);

  // Apply active font, UI scale, button color scheme, and playback speed whenever changed
  useEffect(() => {
    applyAppFont(settings.fontFamily);
  }, [settings.fontFamily]);

  useEffect(() => {
    applyUiScale(settings.uiScale);
  }, [settings.uiScale]);

  useEffect(() => {
    applyColorMode(settings.colorMode);
  }, [settings.colorMode]);

  useEffect(() => {
    applyButtonColorScheme(settings.buttonColorScheme, settings.colorMode);
  }, [settings.buttonColorScheme, settings.colorMode]);

  useEffect(() => {
    engine.setPlaybackRate(settings.playbackRate);
  }, [engine, settings.playbackRate]);

  // Auto-hide scrollbars after 5 seconds of inactivity; reveal immediately on any action
  useEffect(() => {
    let hideTimer: number | null = null;
    const root = document.documentElement;

    const scheduleHide = () => {
      if (root.classList.contains('scrollbars-hidden')) {
        root.classList.remove('scrollbars-hidden');
      }
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
      }
      hideTimer = window.setTimeout(() => {
        root.classList.add('scrollbars-hidden');
      }, 5000);
    };

    scheduleHide();

    const passiveEvents: Array<keyof WindowEventMap> = [
      'wheel',
      'touchstart',
      'touchmove',
      'pointerdown',
      'pointermove',
      'keydown',
    ];

    window.addEventListener('scroll', scheduleHide, { capture: true, passive: true });
    for (const ev of passiveEvents) {
      window.addEventListener(ev, scheduleHide, { passive: true });
    }

    return () => {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
      }
      root.classList.remove('scrollbars-hidden');
      window.removeEventListener('scroll', scheduleHide, true);
      for (const ev of passiveEvents) {
        window.removeEventListener(ev, scheduleHide);
      }
    };
  }, []);

  handleHardwareBackRef.current = () => {
    if (editingTrack !== null) {
      setEditingTrack(null);
      return true;
    }
    if (smartPlaylistModalState.open) {
      setSmartPlaylistModalState({ open: false, editingPlaylist: null });
      return true;
    }
    if (playlistModalState.open) {
      setPlaylistModalState({ open: false, mode: 'create' });
      return true;
    }
    if (isEqOpen) {
      setIsEqOpen(false);
      return true;
    }
    if (isQueueOpen) {
      setIsQueueOpen(false);
      return true;
    }
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return true;
    }
    if (isNowPlayingOpen) {
      setIsNowPlayingOpen(false);
      return true;
    }
    if (libraryBackHandlerRef.current?.()) {
      return true;
    }
    return false;
  };

  // Native Android & browser Back button handling: close sub-screens/modals, do nothing on main pages
  useEffect(() => {
    const onNativeBack = () => {
      handleHardwareBackRef.current();
    };
    window.addEventListener('grooverBackPressed', onNativeBack);

    const isNativeCapacitor = Boolean(
      (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );

    if (isNativeCapacitor) {
      return () => {
        window.removeEventListener('grooverBackPressed', onNativeBack);
      };
    }

    const ensureHistoryGuard = () => {
      try {
        if ((window.history.state as { grooverGuard?: boolean } | null)?.grooverGuard !== true) {
          window.history.pushState({ grooverGuard: true }, '');
        }
      } catch {
        // Ignore restricted history API contexts
      }
    };

    const onPopState = () => {
      handleHardwareBackRef.current();
      ensureHistoryGuard();
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('pointerdown', ensureHistoryGuard, { passive: true });
    window.addEventListener('keydown', ensureHistoryGuard, { passive: true });

    return () => {
      window.removeEventListener('grooverBackPressed', onNativeBack);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pointerdown', ensureHistoryGuard);
      window.removeEventListener('keydown', ensureHistoryGuard);
    };
  }, []);

  // Persist settings helper
  const updateSettings = useCallback(
    (updater: (prev: PersistedSettings) => PersistedSettings) => {
      setSettings((prev) => {
        const next = updater(prev);
        void saveSettings(next);
        return next;
      });
    },
    []
  );

  const trackMap = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of tracks) m.set(t.id, t);
    return m;
  }, [tracks]);

  const queueTracks = useMemo(
    () => queueIds.map((id) => trackMap.get(id)).filter((t): t is Track => Boolean(t)),
    [queueIds, trackMap]
  );

  const currentTrack = useMemo(() => {
    if (currentQueueIndex < 0 || currentQueueIndex >= queueTracks.length) return null;
    return queueTracks[currentQueueIndex];
  }, [queueTracks, currentQueueIndex]);

  const mediaStateRef = useRef({
    track: currentTrack,
    duration,
    isPlaying,
    lockscreenWidget: settings.lockscreenWidget,
  });
  mediaStateRef.current = {
    track: currentTrack,
    duration,
    isPlaying,
    lockscreenWidget: settings.lockscreenWidget,
  };

  const syncMediaPosition = useCallback(
    (posOverride?: number, durOverride?: number, playingOverride?: boolean) => {
      const state = mediaStateRef.current;
      if (!state.lockscreenWidget || !state.track) return;
      const audio = engine.element;
      const resolvedDuration =
        durOverride !== undefined && Number.isFinite(durOverride) && durOverride > 0
          ? durOverride
          : Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : state.duration > 0
          ? state.duration
          : state.track.duration || 0;
      const resolvedPos =
        posOverride !== undefined && Number.isFinite(posOverride)
          ? posOverride
          : Number.isFinite(audio.currentTime)
          ? audio.currentTime
          : 0;
      const resolvedPlaying =
        playingOverride !== undefined ? playingOverride : state.isPlaying;
      engine.updatePositionState(
        resolvedPos,
        resolvedDuration,
        resolvedPlaying,
        state.lockscreenWidget
      );
    },
    [engine]
  );

  const playQueueAtIndex = useCallback(
    async (
      idx: number,
      customQueue?: string[],
      historyMode: 'reset' | 'push' | 'preserve' = 'push'
    ) => {
      const targetQueue = customQueue ?? queueIds;
      if (idx < 0 || idx >= targetQueue.length) return;
      const trackId = targetQueue[idx];
      const trk = trackMap.get(trackId);
      if (!trk) return;

      const blob = await getTrackAudioBlob(trackId);
      if (!blob) {
        showToast('Audio file missing from offline vault');
        return;
      }

      if (customQueue || historyMode === 'reset') {
        shuffleHistoryIdsRef.current = [trackId];
        shuffleHistoryPosRef.current = 0;
        shufflePlayedIdsRef.current = new Set([trackId]);
      } else if (historyMode === 'push') {
        const truncated = shuffleHistoryIdsRef.current.slice(
          0,
          Math.max(0, shuffleHistoryPosRef.current + 1)
        );
        if (truncated[truncated.length - 1] !== trackId) {
          truncated.push(trackId);
        }
        shuffleHistoryIdsRef.current = truncated;
        shuffleHistoryPosRef.current = truncated.length - 1;
        shufflePlayedIdsRef.current.add(trackId);
      }

      setCurrentQueueIndex(idx);
      setCurrentTime(0);
      setDuration(trk.duration);

      try {
        await engine.loadBlob(blob, true);
        engine.applyEq(settings.eq);
        engine.setVolume(settings.volume, settings.isMuted);
        engine.setPlaybackRate(settings.playbackRate);
        setIsPlaying(true);

        const updated: Track = {
          ...trk,
          playCount: (trk.playCount || 0) + 1,
          lastPlayedAt: Date.now(),
        };
        setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        void updateTrackRecord(updated);
        updateSettings((prev) => ({ ...prev, lastTrackId: trk.id }));
      } catch {
        setIsPlaying(false);
      }
    },
    [queueIds, trackMap, engine, settings.eq, settings.volume, settings.isMuted, settings.playbackRate, showToast, updateSettings]
  );

  const handleToggleShuffle = useCallback(() => {
    updateSettings((prev) => {
      const nextShuffle = !prev.shuffle;
      if (nextShuffle) {
        const seedId =
          currentQueueIndex >= 0 && currentQueueIndex < queueIds.length
            ? queueIds[currentQueueIndex]
            : undefined;
        shuffleHistoryIdsRef.current = seedId ? [seedId] : [];
        shuffleHistoryPosRef.current = seedId ? 0 : -1;
        shufflePlayedIdsRef.current = new Set(seedId ? [seedId] : []);
      }
      return { ...prev, shuffle: nextShuffle };
    });
  }, [currentQueueIndex, queueIds, updateSettings]);

  const handleNext = useCallback(() => {
    if (queueTracks.length === 0) return;

    if (settings.repeat === 'one' && currentQueueIndex >= 0) {
      engine.seek(0);
      setCurrentTime(0);
      syncMediaPosition(0, undefined, true);
      void engine.play();
      return;
    }

    if (settings.shuffle && queueIds.length > 1) {
      // If user stepped backward in shuffle history, Next moves deterministically forward through visited history
      while (shuffleHistoryPosRef.current < shuffleHistoryIdsRef.current.length - 1) {
        shuffleHistoryPosRef.current += 1;
        const targetId = shuffleHistoryIdsRef.current[shuffleHistoryPosRef.current];
        const targetIdx = queueIds.indexOf(targetId);
        if (targetIdx >= 0) {
          void playQueueAtIndex(targetIdx, undefined, 'preserve');
          return;
        }
      }

      // Ensure active track is marked as played in the current non-repeating cycle
      const activeId =
        currentQueueIndex >= 0 && currentQueueIndex < queueIds.length
          ? queueIds[currentQueueIndex]
          : undefined;
      if (activeId) {
        shufflePlayedIdsRef.current.add(activeId);
      }

      let unplayedIndices: number[] = [];
      for (let i = 0; i < queueIds.length; i++) {
        if (i !== currentQueueIndex && !shufflePlayedIdsRef.current.has(queueIds[i])) {
          unplayedIndices.push(i);
        }
      }

      // Once every song in the queue has played, start a fresh non-repeating cycle without immediate repeat
      if (unplayedIndices.length === 0) {
        shufflePlayedIdsRef.current = new Set(activeId ? [activeId] : []);
        unplayedIndices = [];
        for (let i = 0; i < queueIds.length; i++) {
          if (i !== currentQueueIndex) {
            unplayedIndices.push(i);
          }
        }
      }

      if (unplayedIndices.length > 0) {
        const nextIdx = unplayedIndices[Math.floor(Math.random() * unplayedIndices.length)];
        const nextId = queueIds[nextIdx];
        shufflePlayedIdsRef.current.add(nextId);
        const prefix = shuffleHistoryIdsRef.current.slice(
          0,
          Math.max(0, shuffleHistoryPosRef.current + 1)
        );
        prefix.push(nextId);
        shuffleHistoryIdsRef.current = prefix;
        shuffleHistoryPosRef.current = prefix.length - 1;
        void playQueueAtIndex(nextIdx, undefined, 'preserve');
      }
      return;
    }

    const nextIdx = currentQueueIndex + 1;
    if (nextIdx < queueTracks.length) {
      void playQueueAtIndex(nextIdx, undefined, 'push');
    } else if (settings.repeat === 'all') {
      void playQueueAtIndex(0, undefined, 'push');
    } else {
      engine.pause();
      setIsPlaying(false);
    }
  }, [
    queueTracks.length,
    queueIds,
    settings.repeat,
    settings.shuffle,
    currentQueueIndex,
    engine,
    playQueueAtIndex,
  ]);

  const handlePrev = useCallback(() => {
    if (queueTracks.length === 0) return;
    if (currentTime > 3) {
      engine.seek(0);
      setCurrentTime(0);
      syncMediaPosition(0);
      return;
    }

    if (settings.shuffle) {
      // Deterministic backward navigation through actual played songs (never randomized)
      while (shuffleHistoryPosRef.current > 0) {
        shuffleHistoryPosRef.current -= 1;
        const targetId = shuffleHistoryIdsRef.current[shuffleHistoryPosRef.current];
        const targetIdx = queueIds.indexOf(targetId);
        if (targetIdx >= 0) {
          void playQueueAtIndex(targetIdx, undefined, 'preserve');
          return;
        }
      }
      engine.seek(0);
      setCurrentTime(0);
      syncMediaPosition(0);
      return;
    }

    const prevIdx =
      currentQueueIndex - 1 >= 0
        ? currentQueueIndex - 1
        : settings.repeat === 'all'
        ? queueTracks.length - 1
        : 0;
    void playQueueAtIndex(prevIdx, undefined, 'push');
  }, [
    queueTracks.length,
    queueIds,
    currentTime,
    currentQueueIndex,
    settings.shuffle,
    settings.repeat,
    engine,
    playQueueAtIndex,
    syncMediaPosition,
  ]);

  const handleTogglePlay = useCallback(async () => {
    if (!currentTrack) {
      if (tracks.length > 0) {
        const ids = tracks.map((t) => t.id);
        setQueueIds(ids);
        await playQueueAtIndex(0, ids);
      }
      return;
    }

    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      try {
        await engine.play();
        engine.applyEq(settings.eq);
        setIsPlaying(true);
      } catch {
        // Fallback reload blob if audio src was cleared
        const blob = await getTrackAudioBlob(currentTrack.id);
        if (blob) {
          await engine.loadBlob(blob, true);
          setIsPlaying(true);
        }
      }
    }
  }, [currentTrack, tracks, isPlaying, engine, settings.eq, playQueueAtIndex]);

  // Audio Element Event Binding
  useEffect(() => {
    const audio = engine.element;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onDurationResolved = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        syncMediaPosition(audio.currentTime || 0, audio.duration, !audio.paused);
      }
    };
    const onSeeked = () => {
      const pos = audio.currentTime || 0;
      setCurrentTime(pos);
      syncMediaPosition(pos, undefined, !audio.paused);
    };
    const onRateChange = () => {
      syncMediaPosition(audio.currentTime || 0, undefined, !audio.paused);
    };
    const onPlay = () => {
      setIsPlaying(true);
      syncMediaPosition(audio.currentTime || 0, undefined, true);
    };
    const onPause = () => {
      setIsPlaying(false);
      syncMediaPosition(audio.currentTime || 0, undefined, false);
    };
    const onEnded = () => handleNext();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDurationResolved);
    audio.addEventListener('durationchange', onDurationResolved);
    audio.addEventListener('seeked', onSeeked);
    audio.addEventListener('ratechange', onRateChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDurationResolved);
      audio.removeEventListener('durationchange', onDurationResolved);
      audio.removeEventListener('seeked', onSeeked);
      audio.removeEventListener('ratechange', onRateChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [engine, handleNext, syncMediaPosition]);

  // MediaSession API + Native Lockscreen Widget Sync (OnePlus 15R Lockscreen & Bluetooth Controls)
  useEffect(() => {
    engine.updateMediaSession(currentTrack, isPlaying, settings.lockscreenWidget, {
      onPlay: () => void handleTogglePlay(),
      onPause: () => {
        engine.pause();
        setIsPlaying(false);
      },
      onPrev: handlePrev,
      onNext: handleNext,
      onSeek: (t) => {
        engine.seek(t);
        setCurrentTime(t);
        syncMediaPosition(t);
      },
    });
  }, [
    engine,
    currentTrack,
    isPlaying,
    settings.lockscreenWidget,
    handleTogglePlay,
    handlePrev,
    handleNext,
    syncMediaPosition,
  ]);

  // Sync playback rate changes immediately to lockscreen & status bar widget
  useEffect(() => {
    syncMediaPosition();
  }, [settings.playbackRate, syncMediaPosition]);

  // Keep MediaSession & native lockscreen progress bar in sync smoothly
  useEffect(() => {
    if (!isPlaying || !currentTrack || !settings.lockscreenWidget) return;
    const interval = setInterval(() => {
      syncMediaPosition();
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, settings.lockscreenWidget, syncMediaPosition]);

  // Listen for native Android LockscreenMediaPlugin button actions
  useEffect(() => {
    const onNativeMediaAction = (event: Event) => {
      type MediaActionPayload = { action?: string; positionMs?: number };
      const raw = event as CustomEvent<MediaActionPayload> & MediaActionPayload;
      const detail = raw.detail && typeof raw.detail === 'object' ? raw.detail : raw;
      if (!detail?.action) return;
      if (detail.action === 'play') {
        if (!isPlaying) void handleTogglePlay();
      } else if (detail.action === 'pause') {
        if (isPlaying) {
          engine.pause();
          setIsPlaying(false);
        }
      } else if (detail.action === 'toggle') {
        void handleTogglePlay();
      } else if (detail.action === 'next') {
        handleNext();
      } else if (detail.action === 'prev') {
        handlePrev();
      } else if (detail.action === 'seek' && typeof detail.positionMs === 'number') {
        const sec = Math.max(0, detail.positionMs / 1000);
        engine.seek(sec);
        setCurrentTime(sec);
        syncMediaPosition(sec);
      }
    };

    window.addEventListener('grooverMediaAction', onNativeMediaAction);
    return () => window.removeEventListener('grooverMediaAction', onNativeMediaAction);
  }, [engine, isPlaying, handleTogglePlay, handleNext, handlePrev, syncMediaPosition]);

  // Sleep Timer Countdown
  useEffect(() => {
    if (sleepRemainingMin === null) return;
    const interval = setInterval(() => {
      setSleepRemainingMin((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          engine.pause();
          setIsPlaying(false);
          showToast('Sleep timer paused playback');
          return null;
        }
        return prev - 1;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [sleepRemainingMin, engine, showToast]);

  // Spacebar shortcut on desktop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        void handleTogglePlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay]);

  // File Import Pipeline
  const processImportedFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const audioFiles = Array.from(fileList).filter(
        (f) => f.type.startsWith('audio/') || AUDIO_EXT_REGEX.test(f.name)
      );
      if (audioFiles.length === 0) {
        showToast('No supported audio files found (MP3, FLAC, M4A, WAV, OGG)');
        return;
      }

      setIsImporting(true);
      const addedTracks: Track[] = [];
      try {
        for (let i = 0; i < audioFiles.length; i++) {
          const file = audioFiles[i];
          setImportProgressText(`Indexing ${i + 1} of ${audioFiles.length}: ${file.name}`);
          const { track, blob } = await parseAudioFileToTrack(file);
          await saveTrackWithAudio(track, blob);
          addedTracks.push(track);
        }

        const nextTracks = [...addedTracks, ...tracks];
        setTracks(nextTracks);
        await refreshStorageStats(nextTracks);
        if (queueIds.length === 0 && addedTracks.length > 0) {
          setQueueIds(nextTracks.map((t) => t.id));
        }
        showToast(
          `Saved ${addedTracks.length} ${addedTracks.length === 1 ? 'track' : 'tracks'} to offline vault`
        );
      } finally {
        setIsImporting(false);
        setImportProgressText(null);
      }
    },
    [tracks, queueIds.length, refreshStorageStats, showToast]
  );

  const handlePlayTrackList = useCallback(
    (list: Track[], startIndex: number) => {
      if (list.length === 0) return;
      const ids = list.map((t) => t.id);
      setQueueIds(ids);
      setTimeout(() => {
        void playQueueAtIndex(startIndex, ids, 'reset');
      }, 0);
    },
    [playQueueAtIndex]
  );

  const handleShuffleTrackList = useCallback(
    (list: Track[]) => {
      if (list.length === 0) return;
      const ids = list.map((t) => t.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      updateSettings((prev) => ({ ...prev, shuffle: true }));
      setQueueIds(ids);
      setTimeout(() => {
        void playQueueAtIndex(0, ids, 'reset');
      }, 0);
    },
    [updateSettings, playQueueAtIndex]
  );

  const handlePlayNext = useCallback(
    (track: Track) => {
      setQueueIds((prev) => {
        const copy = [...prev];
        const insertAt = currentQueueIndex >= 0 ? currentQueueIndex + 1 : 0;
        copy.splice(insertAt, 0, track.id);
        return copy;
      });
      showToast(`Playing "${track.title}" next`);
    },
    [currentQueueIndex, showToast]
  );

  const handleAddToQueue = useCallback(
    (track: Track) => {
      setQueueIds((prev) => [...prev, track.id]);
      showToast(`Added "${track.title}" to queue`);
    },
    [showToast]
  );

  const handleToggleFavorite = useCallback(
    (trackId: string) => {
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id !== trackId) return t;
          const updated = { ...t, isFavorite: !t.isFavorite };
          void updateTrackRecord(updated);
          return updated;
        })
      );
    },
    []
  );

  const handleSaveTrackMetadata = useCallback(
    async (trackId: string, update: TrackMetadataUpdate) => {
      const existing = trackMap.get(trackId);
      if (!existing) return;
      const updated: Track = {
        ...existing,
        ...update,
      };
      await updateTrackRecord(updated);
      setTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));
      showToast('Updated track metadata');
    },
    [trackMap, showToast]
  );

  const handleDeleteTrack = useCallback(
    async (trackId: string) => {
      await deleteTrackWithAudio(trackId);
      const nextTracks = tracks.filter((t) => t.id !== trackId);
      setTracks(nextTracks);
      setPlaylists((prev) =>
        prev.map((pl) => ({
          ...pl,
          trackIds: pl.trackIds.filter((id) => id !== trackId),
        }))
      );
      setQueueIds((prev) => prev.filter((id) => id !== trackId));
      await refreshStorageStats(nextTracks);
      showToast('Removed track from offline vault');
    },
    [tracks, refreshStorageStats, showToast]
  );

  const handleCreateOrRenamePlaylist = useCallback(
    async (name: string, description: string) => {
      if (playlistModalState.mode === 'create') {
        const pl: Playlist = {
          id: `pl-${Date.now()}`,
          name,
          description,
          trackIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await savePlaylist(pl);
        setPlaylists((prev) => [pl, ...prev]);
        setActiveView('playlists');
        setActivePlaylistId(pl.id);
        showToast(`Created playlist "${name}"`);
      } else if (playlistModalState.playlist) {
        const updated: Playlist = {
          ...playlistModalState.playlist,
          name,
          description,
          updatedAt: Date.now(),
        };
        await savePlaylist(updated);
        setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast('Playlist updated');
      }
    },
    [playlistModalState, showToast]
  );

  const handleSaveSmartPlaylist = useCallback(
    async (
      name: string,
      description: string,
      rules: SmartPlaylistRules,
      existingId?: string
    ) => {
      if (existingId) {
        const existing = playlists.find((p) => p.id === existingId);
        if (!existing) return;
        const updated: Playlist = {
          ...existing,
          name,
          description,
          isSmart: true,
          smartRules: rules,
          updatedAt: Date.now(),
        };
        await savePlaylist(updated);
        setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast(`Updated smart playlist "${name}"`);
      } else {
        const pl: Playlist = {
          id: `spl-${Date.now()}`,
          name,
          description,
          trackIds: [],
          isSmart: true,
          smartRules: rules,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await savePlaylist(pl);
        setPlaylists((prev) => [pl, ...prev]);
        setActiveView('playlists');
        setActivePlaylistId(pl.id);
        showToast(`Generated smart playlist "${name}"`);
      }
    },
    [playlists, showToast]
  );

  const handleAddToPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          if (pl.trackIds.includes(trackId)) {
            showToast(`Already in "${pl.name}"`);
            return pl;
          }
          const updated: Playlist = {
            ...pl,
            trackIds: [...pl.trackIds, trackId],
            updatedAt: Date.now(),
          };
          void savePlaylist(updated);
          showToast(`Added to "${pl.name}"`);
          return updated;
        })
      );
    },
    [showToast]
  );

  const handleRemoveFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          const idx = pl.trackIds.indexOf(trackId);
          if (idx < 0) return pl;
          const nextIds = [...pl.trackIds];
          nextIds.splice(idx, 1);
          const updated: Playlist = {
            ...pl,
            trackIds: nextIds,
            updatedAt: Date.now(),
          };
          void savePlaylist(updated);
          return updated;
        })
      );
      showToast('Removed from playlist');
    },
    [showToast]
  );

  const handleDeletePlaylist = useCallback(
    (playlistId: string) => {
      void deletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      showToast('Deleted playlist');
    },
    [showToast]
  );

  const handleEqChange = useCallback(
    (nextEq: EqSettings) => {
      engine.applyEq(nextEq);
      updateSettings((prev) => ({ ...prev, eq: nextEq }));
    },
    [engine, updateSettings]
  );

  const handleCycleSleepTimer = useCallback(() => {
    const idx = SLEEP_STEPS.indexOf(
      sleepRemainingMin as (typeof SLEEP_STEPS)[number]
    );
    const next = SLEEP_STEPS[(idx + 1) % SLEEP_STEPS.length];
    setSleepRemainingMin(next);
    showToast(next === null ? 'Sleep timer turned off' : `Sleep timer set for ${next} min`);
  }, [sleepRemainingMin, showToast]);

  const handleExportManifest = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'GrooveR',
      tracks: tracks.map(({ coverArt: _omit, ...rest }) => rest),
      playlists,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groover-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported library manifest JSON');
  }, [tracks, playlists, showToast]);

  const handleClearLibrary = useCallback(async () => {
    engine.pause();
    await clearOfflineLibrary();
    setTracks([]);
    setPlaylists([]);
    setQueueIds([]);
    setCurrentQueueIndex(-1);
    shuffleHistoryIdsRef.current = [];
    shuffleHistoryPosRef.current = -1;
    shufflePlayedIdsRef.current.clear();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    await refreshStorageStats([]);
    showToast('Cleared offline vault');
  }, [engine, refreshStorageStats, showToast]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingFiles(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void processImportedFiles(e.dataTransfer.files);
      }
    },
    [processImportedFiles]
  );

  const safeDuration = duration > 0 ? duration : currentTrack?.duration || 0;
  const progressPercent = safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0;

  return (
    <div
      className={`h-dvh w-full flex flex-col text-zinc-900 dark:text-[#F3F4F6] overflow-hidden select-none pt-safe transition-colors ${
        settings.uiTheme === 'pivot'
          ? 'bg-white dark:bg-black'
          : 'bg-[#F4F6FA] dark:bg-[#090A0D]'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFiles(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDraggingFiles(false);
      }}
      onDrop={handleDrop}
    >
      {/* Hidden File & Folder Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.flac,.wav,.m4a,.aac,.ogg,.opus"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void processImportedFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void processImportedFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <SidebarNav
          uiTheme={settings.uiTheme}
          activeView={activeView}
          onSelectView={(v) => {
            setActiveView(v);
            setActivePlaylistId(null);
          }}
          tracks={tracks}
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          onSelectPlaylist={(plId) => {
            setActiveView('playlists');
            setActivePlaylistId(plId);
          }}
          onCreatePlaylist={() => setPlaylistModalState({ open: true, mode: 'create' })}
          onGenerateSmartPlaylist={() =>
            setSmartPlaylistModalState({ open: true, editingPlaylist: null })
          }
          onImportFiles={() => fileInputRef.current?.click()}
          onImportFolder={() => folderInputRef.current?.click()}
          onOpenEq={() => setIsEqOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          trackCount={tracks.length}
        />

        <main className="flex-1 overflow-y-auto pb-32 lg:pb-8">
          {!isHydrated ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-zinc-400">Opening offline vault...</p>
            </div>
          ) : (
            <LibraryViews
              activeView={activeView}
              tracks={tracks}
              playlists={playlists}
              activePlaylistId={activePlaylistId}
              currentTrackId={currentTrack?.id ?? null}
              isPlaying={isPlaying}
              storageStats={storageStats}
              isImporting={isImporting}
              importProgressText={importProgressText}
              onSelectView={(v) => {
                setActiveView(v);
                if (v !== 'playlists') setActivePlaylistId(null);
              }}
              onSelectPlaylist={setActivePlaylistId}
              onImportFiles={() => fileInputRef.current?.click()}
              onImportFolder={() => folderInputRef.current?.click()}
              onPlayTrackList={handlePlayTrackList}
              onShuffleTrackList={handleShuffleTrackList}
              onPlayNext={handlePlayNext}
              onAddToQueue={handleAddToQueue}
              onToggleFavorite={handleToggleFavorite}
              onAddToPlaylist={handleAddToPlaylist}
              onRemoveFromPlaylist={handleRemoveFromPlaylist}
              onCreatePlaylist={() => setPlaylistModalState({ open: true, mode: 'create' })}
              onOpenSmartPlaylistModal={(editing) =>
                setSmartPlaylistModalState({ open: true, editingPlaylist: editing ?? null })
              }
              onRenamePlaylist={(pl) =>
                setPlaylistModalState({ open: true, mode: 'rename', playlist: pl })
              }
              onDeletePlaylist={handleDeletePlaylist}
              onEditTrack={(trk) => setEditingTrack(trk)}
              onDeleteTrack={(id) => void handleDeleteTrack(id)}
              onExportManifest={handleExportManifest}
              onClearLibrary={handleClearLibrary}
              onOpenEq={() => setIsEqOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              fontFamily={settings.fontFamily}
              onSelectFont={(font: FontOption) =>
                updateSettings((prev) => ({ ...prev, fontFamily: font }))
              }
              uiScale={settings.uiScale}
              onSelectUiScale={(scale: UiScaleOption) =>
                updateSettings((prev) => ({ ...prev, uiScale: scale }))
              }
              lockscreenWidget={settings.lockscreenWidget}
              onToggleLockscreenWidget={(enabled: boolean) =>
                updateSettings((prev) => ({ ...prev, lockscreenWidget: enabled }))
              }
              songsDisplayMode={settings.songsDisplayMode}
              onSelectSongsDisplayMode={(mode: SongsDisplayMode) =>
                updateSettings((prev) => ({ ...prev, songsDisplayMode: mode }))
              }
              uiTheme={settings.uiTheme}
              onSelectUiTheme={(uiTheme: UiTheme) =>
                updateSettings((prev) => ({ ...prev, uiTheme }))
              }
              colorMode={settings.colorMode}
              onSelectColorMode={(colorMode: ColorMode) =>
                updateSettings((prev) => ({ ...prev, colorMode }))
              }
              buttonColorScheme={settings.buttonColorScheme}
              onSelectButtonColorScheme={(buttonColorScheme: ButtonColorScheme) =>
                updateSettings((prev) => ({ ...prev, buttonColorScheme }))
              }
              playbackRate={settings.playbackRate}
              activeTrackBitrateKbps={currentTrack?.bitrateKbps}
              onChangePlaybackRate={(rate: number) => {
                const clamped = Math.min(2, Math.max(0.5, Number.isFinite(rate) ? rate : 1));
                engine.setPlaybackRate(clamped);
                updateSettings((prev) => ({ ...prev, playbackRate: clamped }));
                syncMediaPosition();
              }}
              onTogglePlay={() => void handleTogglePlay()}
              backHandlerRef={libraryBackHandlerRef}
            />
          )}
        </main>
      </div>

      {/* Desktop Bottom Player Bar */}
      <PlayerBar
        uiTheme={settings.uiTheme}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={settings.volume}
        isMuted={settings.isMuted}
        shuffle={settings.shuffle}
        repeat={settings.repeat}
        sleepRemainingMin={sleepRemainingMin}
        onTogglePlay={() => void handleTogglePlay()}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={(t) => {
          engine.seek(t);
          setCurrentTime(t);
          syncMediaPosition(t);
        }}
        onVolumeChange={(v) => {
          engine.setVolume(v, false);
          updateSettings((prev) => ({ ...prev, volume: v, isMuted: false }));
        }}
        onToggleMute={() => {
          const nextMuted = !settings.isMuted;
          engine.setVolume(settings.volume, nextMuted);
          updateSettings((prev) => ({ ...prev, isMuted: nextMuted }));
        }}
        onToggleShuffle={handleToggleShuffle}
        onCycleRepeat={() =>
          updateSettings((prev) => {
            const order: RepeatMode[] = ['off', 'all', 'one'];
            const next = order[(order.indexOf(prev.repeat) + 1) % order.length];
            return { ...prev, repeat: next };
          })
        }
        onToggleFavorite={handleToggleFavorite}
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
        onOpenQueue={() => setIsQueueOpen(true)}
        onOpenEq={() => setIsEqOpen(true)}
        onCycleSleepTimer={handleCycleSleepTimer}
      />

      {/* Mobile Mini-Player + Bottom Tab Bar */}
      <MobileBottomNav
        uiTheme={settings.uiTheme}
        activeView={activeView}
        onSelectView={(v) => {
          setActiveView(v);
          if (v !== 'playlists') setActivePlaylistId(null);
        }}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        progressPercent={progressPercent}
        onTogglePlay={() => void handleTogglePlay()}
        onNext={handleNext}
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
      />

      {/* Fullscreen Now Playing View */}
      <NowPlayingSheet
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        currentTrack={currentTrack}
        queueTracks={queueTracks}
        currentQueueIndex={currentQueueIndex}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        shuffle={settings.shuffle}
        repeat={settings.repeat}
        sleepRemainingMin={sleepRemainingMin}
        audioEngine={engine}
        onTogglePlay={() => void handleTogglePlay()}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={(t) => {
          engine.seek(t);
          setCurrentTime(t);
          syncMediaPosition(t);
        }}
        onToggleShuffle={handleToggleShuffle}
        onCycleRepeat={() =>
          updateSettings((prev) => {
            const order: RepeatMode[] = ['off', 'all', 'one'];
            const next = order[(order.indexOf(prev.repeat) + 1) % order.length];
            return { ...prev, repeat: next };
          })
        }
        onToggleFavorite={handleToggleFavorite}
        onOpenEq={() => setIsEqOpen(true)}
        onEditTrack={(trk) => setEditingTrack(trk)}
        onCycleSleepTimer={handleCycleSleepTimer}
        onPlayQueueIndex={(idx) => void playQueueAtIndex(idx)}
      />

      {/* Slide-over Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        queueTracks={queueTracks}
        currentQueueIndex={currentQueueIndex}
        onPlayIndex={(idx) => void playQueueAtIndex(idx)}
        onMoveItem={(from, to) => {
          setQueueIds((prev) => {
            if (to < 0 || to >= prev.length) return prev;
            const copy = [...prev];
            const [item] = copy.splice(from, 1);
            copy.splice(to, 0, item);
            if (currentQueueIndex === from) setCurrentQueueIndex(to);
            else if (currentQueueIndex === to) setCurrentQueueIndex(from);
            return copy;
          });
        }}
        onRemoveIndex={(idx) => {
          setQueueIds((prev) => prev.filter((_, i) => i !== idx));
          if (idx < currentQueueIndex) setCurrentQueueIndex((c) => c - 1);
        }}
        onClearQueue={() => {
          engine.pause();
          setIsPlaying(false);
          setQueueIds([]);
          setCurrentQueueIndex(-1);
          shuffleHistoryIdsRef.current = [];
          shuffleHistoryPosRef.current = -1;
          shufflePlayedIdsRef.current.clear();
        }}
        onClose={() => setIsQueueOpen(false)}
      />

      {/* 5-Band Equalizer Modal */}
      <EqualizerModal
        isOpen={isEqOpen}
        eq={settings.eq}
        onChange={handleEqChange}
        onClose={() => setIsEqOpen(false)}
      />

      {/* Font & App Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        fontFamily={settings.fontFamily}
        uiScale={settings.uiScale}
        lockscreenWidget={settings.lockscreenWidget}
        songsDisplayMode={settings.songsDisplayMode}
        uiTheme={settings.uiTheme}
        colorMode={settings.colorMode}
        buttonColorScheme={settings.buttonColorScheme}
        playbackRate={settings.playbackRate}
        activeTrackBitrateKbps={currentTrack?.bitrateKbps}
        onSelectFont={(font: FontOption) =>
          updateSettings((prev) => ({ ...prev, fontFamily: font }))
        }
        onSelectUiScale={(scale: UiScaleOption) =>
          updateSettings((prev) => ({ ...prev, uiScale: scale }))
        }
        onToggleLockscreenWidget={(enabled: boolean) =>
          updateSettings((prev) => ({ ...prev, lockscreenWidget: enabled }))
        }
        onSelectSongsDisplayMode={(mode: SongsDisplayMode) =>
          updateSettings((prev) => ({ ...prev, songsDisplayMode: mode }))
        }
        onSelectUiTheme={(uiTheme: UiTheme) =>
          updateSettings((prev) => ({ ...prev, uiTheme }))
        }
        onSelectColorMode={(colorMode: ColorMode) =>
          updateSettings((prev) => ({ ...prev, colorMode }))
        }
        onSelectButtonColorScheme={(buttonColorScheme: ButtonColorScheme) =>
          updateSettings((prev) => ({ ...prev, buttonColorScheme }))
        }
        onChangePlaybackRate={(rate: number) => {
          const clamped = Math.min(2, Math.max(0.5, Number.isFinite(rate) ? rate : 1));
          engine.setPlaybackRate(clamped);
          updateSettings((prev) => ({ ...prev, playbackRate: clamped }));
          syncMediaPosition();
        }}
        onOpenEq={() => setIsEqOpen(true)}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Offline Track Tag & Artwork Editor */}
      <TrackEditorModal
        track={editingTrack}
        onSave={handleSaveTrackMetadata}
        onClose={() => setEditingTrack(null)}
      />

      {/* Create / Rename Playlist Modal */}
      <PlaylistModal
        key={playlistModalState.playlist?.id ?? playlistModalState.mode}
        isOpen={playlistModalState.open}
        mode={playlistModalState.mode}
        initialName={playlistModalState.playlist?.name}
        initialDescription={playlistModalState.playlist?.description}
        onSubmit={handleCreateOrRenamePlaylist}
        onClose={() => setPlaylistModalState({ open: false, mode: 'create' })}
      />

      {/* Smart Playlist Generator / Rule Editor Modal */}
      <SmartPlaylistModal
        isOpen={smartPlaylistModalState.open}
        tracks={tracks}
        editingPlaylist={smartPlaylistModalState.editingPlaylist}
        onSave={handleSaveSmartPlaylist}
        onClose={() => setSmartPlaylistModalState({ open: false, editingPlaylist: null })}
      />

      {/* Drag & Drop Overlay */}
      {isDraggingFiles && (
        <div className="fixed inset-0 z-50 bg-white/90 dark:bg-[#090A0D]/90 backdrop-blur-md flex items-center justify-center p-6 pointer-events-none">
          <div className="max-w-md w-full rounded-3xl border-2 border-dashed border-[var(--accent-primary)] bg-white dark:bg-[#111318] p-10 text-center space-y-2 shadow-xl">
            <p className="font-display text-xl font-bold text-zinc-900 dark:text-white">Drop audio files to import</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              MP3, FLAC, M4A, WAV, and OGG tracks are stored offline in your vault.
            </p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-32 lg:bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-white dark:bg-[#181C26] border border-zinc-200 dark:border-white/15 shadow-2xl text-xs font-medium text-zinc-900 dark:text-white whitespace-nowrap"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
