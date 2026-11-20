import { EqSettings, Track } from '../types/music';

export const EQ_PRESETS: Record<string, EqSettings['bands']> = {
  'OnePlus Bass': { hz60: 3.5, hz230: 1.5, hz910: 0, khz3_6: 1.5, khz14: 2.5 },
  Flat: { hz60: 0, hz230: 0, hz910: 0, khz3_6: 0, khz14: 0 },
  'Vocal Clarity': { hz60: -2, hz230: 0, hz910: 3.5, khz3_6: 4, khz14: 1.5 },
  Acoustic: { hz60: 2, hz230: 1, hz910: 1.5, khz3_6: 2.5, khz14: 2 },
  Electronic: { hz60: 4.5, hz230: 2, hz910: -1, khz3_6: 2.5, khz14: 4 },
  'Late Night': { hz60: 1.5, hz230: 2, hz910: 1, khz3_6: -1, khz14: -2 },
};

export class GrooveAudioEngine {
  private audio: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private preampNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private currentUrl: string | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
  }

  get element(): HTMLAudioElement {
    return this.audio;
  }

  private ensureGraph(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(this.audio);

    const freqs = [60, 230, 910, 3600, 14000];
    const filters = freqs.map((freq, idx) => {
      const filter = ctx.createBiquadFilter();
      filter.type = idx === 0 ? 'lowshelf' : idx === freqs.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.0;
      filter.gain.value = 0;
      return filter;
    });

    const preampNode = ctx.createGain();
    preampNode.gain.value = 1;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;

    source.connect(preampNode);
    let prev: AudioNode = preampNode;
    for (const f of filters) {
      prev.connect(f);
      prev = f;
    }
    prev.connect(analyser);
    analyser.connect(ctx.destination);

    this.ctx = ctx;
    this.source = source;
    this.filters = filters;
    this.preampNode = preampNode;
    this.analyser = analyser;
    this.freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  }

  async loadBlob(blob: Blob, autoPlay: boolean): Promise<void> {
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
    }
    this.currentUrl = URL.createObjectURL(blob);
    this.audio.src = this.currentUrl;
    this.audio.load();

    if (autoPlay) {
      await this.play();
    }
  }

  async play(): Promise<void> {
    this.ensureGraph();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  seek(time: number): void {
    if (Number.isFinite(time) && time >= 0) {
      this.audio.currentTime = Math.min(time, this.audio.duration || time);
    }
  }

  setVolume(volume: number, muted: boolean): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
    this.audio.muted = muted;
  }

  applyEq(eq: EqSettings): void {
    if (!this.ctx || this.filters.length < 5 || !this.preampNode) return;
    const values = eq.enabled
      ? [eq.bands.hz60, eq.bands.hz230, eq.bands.hz910, eq.bands.khz3_6, eq.bands.khz14]
      : [0, 0, 0, 0, 0];

    values.forEach((db, idx) => {
      this.filters[idx].gain.setTargetAtTime(db, this.ctx!.currentTime, 0.04);
    });

    const preampLinear = eq.enabled ? Math.pow(10, eq.preamp / 20) : 1;
    this.preampNode.gain.setTargetAtTime(preampLinear, this.ctx.currentTime, 0.04);
  }

  getFrequencyBins(binCount = 32): number[] {
    if (!this.analyser || !this.freqData) {
      return new Array(binCount).fill(0);
    }
    this.analyser.getByteFrequencyData(this.freqData);
    const out: number[] = [];
    const step = Math.max(1, Math.floor(this.freqData.length / binCount));
    for (let i = 0; i < binCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += this.freqData[Math.min(i * step + j, this.freqData.length - 1)];
      }
      out.push(sum / step / 255);
    }
    return out;
  }

  updateMediaSession(
    track: Track | null,
    isPlaying: boolean,
    handlers: {
      onPlay: () => void;
      onPause: () => void;
      onPrev: () => void;
      onNext: () => void;
      onSeek: (time: number) => void;
    }
  ): void {
    if (!('mediaSession' in navigator)) return;
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artwork: MediaImage[] = track.coverArt
      ? [{ src: track.coverArt, sizes: '512x512', type: 'image/jpeg' }]
      : [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork,
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', handlers.onPlay);
    navigator.mediaSession.setActionHandler('pause', handlers.onPause);
    navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
    navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) handlers.onSeek(details.seekTime);
    });
  }

  dispose(): void {
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
    if (this.ctx) {
      void this.ctx.close();
    }
  }
}
