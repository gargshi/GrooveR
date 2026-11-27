export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value >= 100 || exp === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exp]}`;
}

export function formatRelativeDate(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isLosslessFormat(format: string): boolean {
  const upper = format.toUpperCase();
  return upper === 'FLAC' || upper === 'WAV' || upper === 'ALAC' || upper === 'AIFF';
}

const ARTIST_SPLIT_REGEX =
  /\s*(?:;|、|＆|\s+&\s+|\s+\/\s+|\s+\+\s+|,\s*(?!(?:Jr\.?|Sr\.?|II|III|Inc\.?|The)\b))\s*/i;

export function splitArtists(raw?: string): string[] {
  if (!raw || !raw.trim()) return [];
  let normalized = raw.replace(
    /[\(\[]\s*(?:feat\.?|ft\.?|featuring|with)\s+([^\)\]]+)[\)\]]/gi,
    ' ; $1 '
  );
  normalized = normalized.replace(
    /\s+(?:feat\.?|ft\.?|featuring|with|vs\.?|x|×)\s+/gi,
    ' ; '
  );

  const parts = normalized.split(ARTIST_SPLIT_REGEX);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of parts) {
    const cleaned = part.replace(/^[\s,;(\[]+|[\s,;)\]]+$/g, '').trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
    }
  }
  return result;
}

export function getAlbumArtistEntries(albumArtist?: string, artist?: string): string[] {
  const fromArtist = splitArtists(artist);
  const fromAlbumArtist = splitArtists(albumArtist).filter(
    (name) => !(name.toLowerCase() === 'various artists' && fromArtist.length > 0)
  );

  const seen = new Set<string>();
  const combined: string[] = [];
  for (const name of [...fromAlbumArtist, ...fromArtist]) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(name);
    }
  }
  return combined.length > 0 ? combined : ['Unknown Artist'];
}
