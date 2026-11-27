import { Track } from '../types/music';

interface ParsedTags {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  year?: string;
  genre?: string;
  trackNumber?: number;
  coverArt?: string;
}

const ACCENT_PALETTE = [
  '#2E8BFF',
  '#3B82F6',
  '#0EA5E9',
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#E11D48',
];

function pickAccentForTitle(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return ACCENT_PALETTE[Math.abs(hash) % ACCENT_PALETTE.length];
}

function decodeText(bytes: Uint8Array, encodingByte?: number, joinNulls = false): string {
  if (bytes.length === 0) return '';
  let encoding = 'utf-8';
  let slice = bytes;

  if (encodingByte !== undefined) {
    if (encodingByte === 0) {
      encoding = 'iso-8859-1';
    } else if (encodingByte === 1) {
      if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        encoding = 'utf-16le';
        slice = bytes.subarray(2);
      } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        encoding = 'utf-16be';
        slice = bytes.subarray(2);
      } else {
        encoding = 'utf-16le';
      }
    } else if (encodingByte === 2) {
      encoding = 'utf-16be';
    } else {
      encoding = 'utf-8';
    }
  }

  try {
    const text = new TextDecoder(encoding).decode(slice).replace(/\0+$/g, '');
    return (joinNulls ? text.replace(/\0+/g, ' / ') : text.replace(/\0/g, ' ')).trim();
  } catch {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(slice).replace(/\0+$/g, '');
    return (joinNulls ? text.replace(/\0+/g, ' / ') : text.replace(/\0/g, ' ')).trim();
  }
}

function uint8ToDataUrl(bytes: Uint8Array, mime: string): string {
  const safeMime = mime && mime.startsWith('image/') ? mime : 'image/jpeg';
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:${safeMime};base64,${btoa(binary)}`;
}

async function compressCoverDataUrl(dataUrl: string, maxDim = 600): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxDim && img.height <= maxDim && dataUrl.length < 180_000) {
        resolve(dataUrl);
        return;
      }
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function readSynchsafeInt(view: DataView, offset: number): number {
  return (
    ((view.getUint8(offset) & 0x7f) << 21) |
    ((view.getUint8(offset + 1) & 0x7f) << 14) |
    ((view.getUint8(offset + 2) & 0x7f) << 7) |
    (view.getUint8(offset + 3) & 0x7f)
  );
}

function parseID3v2(buffer: ArrayBuffer): ParsedTags {
  const tags: ParsedTags = {};
  if (buffer.byteLength < 10) return tags;
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return tags;
  }

  const version = bytes[3];
  const flags = bytes[5];
  const tagSize = readSynchsafeInt(view, 6);
  const limit = Math.min(buffer.byteLength, 10 + tagSize);
  let pos = 10;

  // Extended header
  if ((flags & 0x40) !== 0 && pos + 4 <= limit) {
    const extSize = version === 4 ? readSynchsafeInt(view, pos) : view.getUint32(pos);
    pos += extSize;
  }

  while (pos + 10 <= limit) {
    if (bytes[pos] === 0) break;

    if (version === 2) {
      if (pos + 6 > limit) break;
      const frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2]);
      const frameSize = (bytes[pos + 3] << 16) | (bytes[pos + 4] << 8) | bytes[pos + 5];
      pos += 6;
      if (frameSize <= 0 || pos + frameSize > limit) break;
      const payload = bytes.subarray(pos, pos + frameSize);
      const joinMulti = frameId === 'TP1' || frameId === 'TP2' || frameId === 'TCO';
      const val = decodeText(payload.subarray(1), payload[0], joinMulti);
      if (frameId === 'TT2' && val) tags.title = val;
      if (frameId === 'TP1' && val) tags.artist = val;
      if (frameId === 'TAL' && val) tags.album = val;
      if (frameId === 'TP2' && val) tags.albumArtist = val;
      if (frameId === 'TYE' && val) tags.year = val;
      if (frameId === 'TCO' && val) tags.genre = val.replace(/^\(\d+\)/, '').trim() || val;
      if (frameId === 'TRK' && val) tags.trackNumber = parseInt(val.split('/')[0], 10) || undefined;
      pos += frameSize;
      continue;
    }

    const frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
    const frameSize =
      version >= 4 ? readSynchsafeInt(view, pos + 4) : view.getUint32(pos + 4);
    pos += 10;

    if (frameSize <= 0 || pos + frameSize > limit) break;
    const payload = bytes.subarray(pos, pos + frameSize);

    if (frameId.startsWith('T') && frameId !== 'TXXX' && payload.length > 1) {
      const joinMulti = frameId === 'TPE1' || frameId === 'TPE2' || frameId === 'TCON';
      const val = decodeText(payload.subarray(1), payload[0], joinMulti);
      if (frameId === 'TIT2' && val) tags.title = val;
      else if (frameId === 'TPE1' && val) tags.artist = val;
      else if (frameId === 'TALB' && val) tags.album = val;
      else if (frameId === 'TPE2' && val) tags.albumArtist = val;
      else if ((frameId === 'TYER' || frameId === 'TDRC') && val) tags.year = val.slice(0, 4);
      else if (frameId === 'TCON' && val) {
        tags.genre = val.replace(/^\(\d+\)/, '').trim() || val;
      } else if (frameId === 'TRCK' && val) {
        const num = parseInt(val.split('/')[0], 10);
        if (Number.isFinite(num) && num > 0) tags.trackNumber = num;
      }
    } else if (frameId === 'APIC' && payload.length > 4 && !tags.coverArt) {
      const enc = payload[0];
      let idx = 1;
      while (idx < payload.length && payload[idx] !== 0) idx++;
      const mime = new TextDecoder('iso-8859-1').decode(payload.subarray(1, idx)) || 'image/jpeg';
      idx += 2; // null terminator + picture type byte

      // Skip description (terminated by 0 or 0x00 0x00 for UTF-16)
      if (enc === 1 || enc === 2) {
        while (idx + 1 < payload.length && !(payload[idx] === 0 && payload[idx + 1] === 0)) {
          idx += 2;
        }
        idx += 2;
      } else {
        while (idx < payload.length && payload[idx] !== 0) idx++;
        idx += 1;
      }

      if (idx < payload.length) {
        const imgBytes = payload.subarray(idx);
        if (imgBytes.length > 64) {
          tags.coverArt = uint8ToDataUrl(imgBytes, mime);
        }
      }
    }

    pos += frameSize;
  }

  return tags;
}

function parseFlac(buffer: ArrayBuffer): ParsedTags {
  const tags: ParsedTags = {};
  if (buffer.byteLength < 8) return tags;
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // 'fLaC'
  if (bytes[0] !== 0x66 || bytes[1] !== 0x4c || bytes[2] !== 0x61 || bytes[3] !== 0x43) {
    return tags;
  }

  let pos = 4;
  let isLast = false;

  while (!isLast && pos + 4 <= buffer.byteLength) {
    const header = bytes[pos];
    isLast = (header & 0x80) !== 0;
    const blockType = header & 0x7f;
    const blockLen = (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
    pos += 4;
    if (pos + blockLen > buffer.byteLength) break;

    if (blockType === 4 && pos + 8 <= buffer.byteLength) {
      // VORBIS_COMMENT
      let cPos = pos;
      const vendorLen = view.getUint32(cPos, true);
      cPos += 4 + vendorLen;
      if (cPos + 4 <= pos + blockLen) {
        const commentCount = view.getUint32(cPos, true);
        cPos += 4;
        for (let i = 0; i < commentCount && cPos + 4 <= pos + blockLen; i++) {
          const len = view.getUint32(cPos, true);
          cPos += 4;
          if (cPos + len > pos + blockLen) break;
          const entry = new TextDecoder('utf-8').decode(bytes.subarray(cPos, cPos + len));
          cPos += len;
          const eqIdx = entry.indexOf('=');
          if (eqIdx > 0) {
            const key = entry.slice(0, eqIdx).toUpperCase();
            const val = entry.slice(eqIdx + 1).trim();
            if (key === 'TITLE' && val) tags.title = val;
            else if (key === 'ARTIST' && val) tags.artist = val;
            else if (key === 'ALBUM' && val) tags.album = val;
            else if (key === 'ALBUMARTIST' && val) tags.albumArtist = val;
            else if ((key === 'DATE' || key === 'YEAR') && val) tags.year = val.slice(0, 4);
            else if (key === 'GENRE' && val) tags.genre = val;
            else if (key === 'TRACKNUMBER' && val) {
              const num = parseInt(val.split('/')[0], 10);
              if (Number.isFinite(num) && num > 0) tags.trackNumber = num;
            }
          }
        }
      }
    } else if (blockType === 6 && !tags.coverArt && pos + 32 <= buffer.byteLength) {
      // METADATA_BLOCK_PICTURE
      let pPos = pos + 4; // skip picture type
      const mimeLen = view.getUint32(pPos, false);
      pPos += 4;
      const mime = new TextDecoder('ascii').decode(bytes.subarray(pPos, pPos + mimeLen));
      pPos += mimeLen;
      const descLen = view.getUint32(pPos, false);
      pPos += 4 + descLen + 16; // skip width, height, depth, colors
      if (pPos + 4 <= pos + blockLen) {
        const dataLen = view.getUint32(pPos, false);
        pPos += 4;
        if (pPos + dataLen <= pos + blockLen && dataLen > 64) {
          tags.coverArt = uint8ToDataUrl(bytes.subarray(pPos, pPos + dataLen), mime);
        }
      }
    }

    pos += blockLen;
  }

  return tags;
}

function parseFilenameFallback(fileName: string): {
  title: string;
  artist: string;
  trackNumber: number;
} {
  const base = fileName.replace(/\.[^/.]+$/, '').trim();
  let trackNumber = 0;
  let cleaned = base;

  const trackPrefixMatch = cleaned.match(/^(\d{1,3})\s*[-._\s]\s*(.+)$/);
  if (trackPrefixMatch) {
    trackNumber = parseInt(trackPrefixMatch[1], 10) || 0;
    cleaned = trackPrefixMatch[2].trim();
  }

  const dashSplit = cleaned.split(/\s+-\s+/);
  if (dashSplit.length >= 2) {
    return {
      artist: dashSplit[0].trim(),
      title: dashSplit.slice(1).join(' - ').trim(),
      trackNumber,
    };
  }

  return {
    artist: 'Unknown Artist',
    title: cleaned || fileName,
    trackNumber,
  };
}

function probeAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    if (typeof Audio === 'undefined') {
      resolve(0);
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const timeout = setTimeout(() => {
      cleanup();
      resolve(0);
    }, 3500);

    const cleanup = () => {
      clearTimeout(timeout);
      audio.src = '';
      URL.revokeObjectURL(url);
    };

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      cleanup();
      resolve(dur);
    };
    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
    audio.src = url;
  });
}

function detectFormat(file: File): string {
  const ext = file.name.split('.').pop()?.toUpperCase() || '';
  if (ext && ['MP3', 'FLAC', 'WAV', 'M4A', 'AAC', 'OGG', 'OPUS', 'WEBM'].includes(ext)) {
    return ext;
  }
  if (file.type.includes('flac')) return 'FLAC';
  if (file.type.includes('wav')) return 'WAV';
  if (file.type.includes('ogg')) return 'OGG';
  if (file.type.includes('mp4') || file.type.includes('m4a')) return 'M4A';
  return 'MP3';
}

export async function parseAudioFileToTrack(file: File): Promise<{ track: Track; blob: Blob }> {
  const headSize = Math.min(file.size, 2 * 1024 * 1024);
  const headBuffer = await file.slice(0, headSize).arrayBuffer();

  const id3 = parseID3v2(headBuffer);
  const flac = parseFlac(headBuffer);
  const tags: ParsedTags = {
    ...flac,
    ...id3,
    coverArt: id3.coverArt ?? flac.coverArt,
  };

  const fallback = parseFilenameFallback(file.name);
  const duration = await probeAudioDuration(file);
  const format = detectFormat(file);

  const title = tags.title || fallback.title;
  const artist = tags.artist || fallback.artist;
  const album = tags.album || 'Local Collection';
  const albumArtist = tags.albumArtist || artist;

  let coverArt = tags.coverArt;
  if (coverArt) {
    coverArt = await compressCoverDataUrl(coverArt, 600);
  }

  const bitrateKbps =
    duration > 0 ? Math.round((file.size * 8) / duration / 1000) : undefined;

  const track: Track = {
    id: crypto.randomUUID ? crypto.randomUUID() : `trk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    artist,
    album,
    albumArtist,
    genre: tags.genre || 'Local Audio',
    year: tags.year || '',
    trackNumber: tags.trackNumber || fallback.trackNumber || 0,
    duration,
    fileName: file.name,
    fileSize: file.size,
    format,
    mimeType: file.type || 'audio/mpeg',
    bitrateKbps,
    coverArt,
    accentColor: pickAccentForTitle(album + artist),
    isFavorite: false,
    playCount: 0,
    addedAt: Date.now(),
  };

  return { track, blob: file };
}

export async function resizeImageFileToDataUrl(file: File, maxDim = 600): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return compressCoverDataUrl(raw, maxDim);
}
