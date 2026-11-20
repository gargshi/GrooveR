import { EqSettings, PersistedSettings, Playlist, StorageEstimateInfo, Track } from '../types/music';

const DB_NAME = 'groover_offline_db';
const DB_VERSION = 1;

const STORE_TRACKS = 'tracks';
const STORE_AUDIO = 'audioBlobs';
const STORE_PLAYLISTS = 'playlists';
const STORE_SETTINGS = 'settings';

export const DEFAULT_EQ: EqSettings = {
  enabled: true,
  presetName: 'OnePlus Bass',
  preamp: 0,
  bands: {
    hz60: 3.5,
    hz230: 1.5,
    hz910: 0,
    khz3_6: 1.5,
    khz14: 2.5,
  },
};

export const DEFAULT_SETTINGS: PersistedSettings = {
  id: 'app-settings',
  volume: 0.85,
  isMuted: false,
  shuffle: false,
  repeat: 'off',
  eq: DEFAULT_EQ,
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const trackStore = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        trackStore.createIndex('addedAt', 'addedAt', { unique: false });
        trackStore.createIndex('artist', 'artist', { unique: false });
        trackStore.createIndex('album', 'album', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

function runTx<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  executor: (tx: IDBTransaction) => Promise<T> | IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeNames, mode);
        let resultValue: T;

        tx.oncomplete = () => {
          db.close();
          resolve(resultValue);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction failed'));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction aborted'));
        };

        try {
          const out = executor(tx);
          if (out instanceof IDBRequest) {
            out.onsuccess = () => {
              resultValue = out.result;
            };
          } else {
            out.then((val) => {
              resultValue = val;
            }).catch((err) => {
              reject(err);
              try {
                tx.abort();
              } catch {
                // ignore abort error
              }
            });
          }
        } catch (err) {
          reject(err);
        }
      })
  );
}

export async function getAllTracks(): Promise<Track[]> {
  return runTx<Track[]>([STORE_TRACKS], 'readonly', (tx) =>
    tx.objectStore(STORE_TRACKS).getAll()
  );
}

export async function saveTrackWithAudio(track: Track, audioBlob: Blob): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO], 'readwrite');
    tx.objectStore(STORE_TRACKS).put(track);
    tx.objectStore(STORE_AUDIO).put({ id: track.id, blob: audioBlob });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to store offline track'));
    };
  });
}

export async function updateTrackRecord(track: Track): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS], 'readwrite');
    tx.objectStore(STORE_TRACKS).put(track);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to update track'));
    };
  });
}

export async function getTrackAudioBlob(trackId: string): Promise<Blob | null> {
  const record = await runTx<{ id: string; blob: Blob } | undefined>(
    [STORE_AUDIO],
    'readonly',
    (tx) => tx.objectStore(STORE_AUDIO).get(trackId)
  );
  return record?.blob ?? null;
}

export async function deleteTrackWithAudio(trackId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO, STORE_PLAYLISTS], 'readwrite');
    tx.objectStore(STORE_TRACKS).delete(trackId);
    tx.objectStore(STORE_AUDIO).delete(trackId);

    const plStore = tx.objectStore(STORE_PLAYLISTS);
    const getAllReq = plStore.getAll();
    getAllReq.onsuccess = () => {
      const playlists = (getAllReq.result as Playlist[]) || [];
      for (const pl of playlists) {
        if (pl.trackIds.includes(trackId)) {
          plStore.put({
            ...pl,
            trackIds: pl.trackIds.filter((id) => id !== trackId),
            updatedAt: Date.now(),
          });
        }
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to delete offline track'));
    };
  });
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  return runTx<Playlist[]>([STORE_PLAYLISTS], 'readonly', (tx) =>
    tx.objectStore(STORE_PLAYLISTS).getAll()
  );
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PLAYLISTS], 'readwrite');
    tx.objectStore(STORE_PLAYLISTS).put(playlist);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to save playlist'));
    };
  });
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PLAYLISTS], 'readwrite');
    tx.objectStore(STORE_PLAYLISTS).delete(playlistId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to delete playlist'));
    };
  });
}

export async function loadSettings(): Promise<PersistedSettings> {
  const stored = await runTx<PersistedSettings | undefined>(
    [STORE_SETTINGS],
    'readonly',
    (tx) => tx.objectStore(STORE_SETTINGS).get('app-settings')
  );
  if (!stored) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    eq: {
      ...DEFAULT_EQ,
      ...(stored.eq ?? {}),
      bands: {
        ...DEFAULT_EQ.bands,
        ...(stored.eq?.bands ?? {}),
      },
    },
  };
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SETTINGS], 'readwrite');
    tx.objectStore(STORE_SETTINGS).put({ ...settings, id: 'app-settings' });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to save settings'));
    };
  });
}

export async function clearOfflineLibrary(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_TRACKS, STORE_AUDIO, STORE_PLAYLISTS], 'readwrite');
    tx.objectStore(STORE_TRACKS).clear();
    tx.objectStore(STORE_AUDIO).clear();
    tx.objectStore(STORE_PLAYLISTS).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to clear offline vault'));
    };
  });
}

export async function getStorageStats(tracks: Track[]): Promise<StorageEstimateInfo> {
  const totalAudioBytes = tracks.reduce((sum, t) => sum + (t.fileSize || 0), 0);
  let usageBytes = totalAudioBytes;
  let quotaBytes = 1024 * 1024 * 1024 * 4;

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (typeof est.usage === 'number') usageBytes = est.usage;
      if (typeof est.quota === 'number' && est.quota > 0) quotaBytes = est.quota;
    } catch {
      // ignore fallback
    }
  }

  return {
    usageBytes,
    quotaBytes,
    trackCount: tracks.length,
    totalAudioBytes,
  };
}
