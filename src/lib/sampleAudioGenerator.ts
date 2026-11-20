import { Track } from '../types/music';

interface SynthSpec {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  trackNumber: number;
  coverPath: string;
  chords: number[][];
  tempoSec: number;
  baseType: OscillatorType;
}

const SAMPLE_SPECS: SynthSpec[] = [
  {
    title: 'Cobalt Refraction',
    artist: 'Kaelen Vance',
    album: 'Midnight Horizon',
    genre: 'Ambient Electronic',
    year: '2026',
    trackNumber: 1,
    coverPath: '/src/assets/images/cover_midnight_horizon_1795158172785.jpg',
    chords: [
      [130.81, 196.0, 246.94, 329.63],
      [110.0, 164.81, 220.0, 293.66],
      [146.83, 220.0, 261.63, 349.23],
      [98.0, 146.83, 196.0, 293.66],
    ],
    tempoSec: 4.5,
    baseType: 'triangle',
  },
  {
    title: 'Tungsten Archway',
    artist: 'Nocturne District',
    album: 'Velvet Pulse',
    genre: 'Downtempo',
    year: '2026',
    trackNumber: 2,
    coverPath: '/src/assets/images/cover_velvet_pulse_1795158173719.jpg',
    chords: [
      [146.83, 220.0, 261.63, 329.63],
      [123.47, 185.0, 246.94, 329.63],
      [130.81, 196.0, 246.94, 392.0],
      [110.0, 164.81, 220.0, 329.63],
    ],
    tempoSec: 4.5,
    baseType: 'sine',
  },
  {
    title: 'Basalt Resonance',
    artist: 'Sora Takahashi',
    album: 'Monolith Echo',
    genre: 'Minimal Acoustic',
    year: '2026',
    trackNumber: 3,
    coverPath: '/src/assets/images/cover_monolith_echo_1795158173185.jpg',
    chords: [
      [164.81, 246.94, 329.63, 493.88],
      [146.83, 220.0, 293.66, 440.0],
      [130.81, 196.0, 261.63, 392.0],
      [110.0, 164.81, 246.94, 329.63],
    ],
    tempoSec: 4.5,
    baseType: 'sine',
  },
];

function encodeWavFromAudioBuffer(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function fetchImageAsDataUrl(path: string): Promise<string | undefined> {
  try {
    const res = await fetch(path);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function generatePlayableSampleTracks(): Promise<Array<{ track: Track; blob: Blob }>> {
  const sampleRate = 44100;
  const duration = 18;
  const results: Array<{ track: Track; blob: Blob }> = [];

  for (const spec of SAMPLE_SPECS) {
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, 0);
    masterGain.gain.exponentialRampToValueAtTime(0.32, 1.2);
    masterGain.gain.setValueAtTime(0.32, duration - 2.0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, duration);

    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1600, 0);
    lowpass.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    spec.chords.forEach((chord, chordIndex) => {
      const startTime = chordIndex * spec.tempoSec;
      const chordDur = spec.tempoSec;

      chord.forEach((freq, noteIdx) => {
        const osc = offlineCtx.createOscillator();
        const noteGain = offlineCtx.createGain();
        const panner = offlineCtx.createStereoPanner();

        osc.type = noteIdx === 0 ? spec.baseType : 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.detune.setValueAtTime((noteIdx - 1.5) * 4, startTime);

        panner.pan.setValueAtTime(((noteIdx % 2 === 0 ? -1 : 1) * 0.25), startTime);

        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(0.18 / chord.length, startTime + 0.35);
        noteGain.gain.exponentialRampToValueAtTime(0.08 / chord.length, startTime + chordDur - 0.1);
        noteGain.gain.linearRampToValueAtTime(0.0001, startTime + chordDur);

        osc.connect(noteGain);
        noteGain.connect(panner);
        panner.connect(lowpass);

        osc.start(startTime);
        osc.stop(startTime + chordDur + 0.05);
      });

      // Subtle rhythmic pulse pluck
      for (let step = 0; step < 4; step++) {
        const pulseStart = startTime + step * (chordDur / 4);
        const pulseOsc = offlineCtx.createOscillator();
        const pulseGain = offlineCtx.createGain();
        pulseOsc.type = 'triangle';
        pulseOsc.frequency.setValueAtTime(chord[step % chord.length] * 2, pulseStart);
        pulseGain.gain.setValueAtTime(0.0001, pulseStart);
        pulseGain.gain.linearRampToValueAtTime(0.09, pulseStart + 0.03);
        pulseGain.gain.exponentialRampToValueAtTime(0.0001, pulseStart + 0.75);
        pulseOsc.connect(pulseGain);
        pulseGain.connect(lowpass);
        pulseOsc.start(pulseStart);
        pulseOsc.stop(pulseStart + 0.8);
      }
    });

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = encodeWavFromAudioBuffer(renderedBuffer);
    const coverArt = await fetchImageAsDataUrl(spec.coverPath);

    const track: Track = {
      id: `sample-${spec.trackNumber}-${Date.now()}`,
      title: spec.title,
      artist: spec.artist,
      album: spec.album,
      albumArtist: spec.artist,
      genre: spec.genre,
      year: spec.year,
      trackNumber: spec.trackNumber,
      duration,
      fileName: `${spec.title.toLowerCase().replace(/\s+/g, '_')}.wav`,
      fileSize: wavBlob.size,
      format: 'WAV',
      mimeType: 'audio/wav',
      sampleRate: 44100,
      bitrateKbps: 1411,
      coverArt: coverArt || spec.coverPath,
      accentColor: '#2E8BFF',
      isFavorite: spec.trackNumber === 1,
      playCount: 0,
      addedAt: Date.now() - (4 - spec.trackNumber) * 1000,
      isSample: true,
    };

    results.push({ track, blob: wavBlob });
  }

  return results;
}
