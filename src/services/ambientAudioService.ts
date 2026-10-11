// Exclusive Background Game Soundtrack Engine for EcoQuest
// Strictly plays only the single serene piano & forest stream soundtrack
// with volume control, speech ducking, and seamless looping.

import {
  saveCustomTrack,
  deleteCustomTrack,
  StoredCustomTrack,
} from './audioStorage';

export interface SoundtrackTrack {
  id: string;
  title: string;
  artist: string;
  mood: string;
  src: string;
  isProcedural?: boolean;
  proceduralType?: 'zen' | 'rain' | 'river';
  isCustom?: boolean;
  fileSize?: string;
}

export const BUILT_IN_PLAYLIST: SoundtrackTrack[] = [
  {
    id: 'serene-nature-piano',
    title: 'Serene Nature Piano & Stream',
    artist: 'EcoQuest Exclusive Soundtrack',
    mood: 'Gentle Piano & Forest Stream (02:01)',
    src: '/audio/expedition_chill.wav?v=2',
  },
];

export interface AudioEngineState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0.0 to 1.0
  currentTrackIndex: number;
  currentTrack: SoundtrackTrack;
  playlist: SoundtrackTrack[];
  currentTime: number;
  duration: number;
}

class AmbientAudioService {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private wantsToPlay: boolean = true;
  private currentVolume: number = 0.65;
  private isMuted: boolean = false;
  private currentTrackIndex: number = 0;
  private isDucked: boolean = false;
  private duckFadeTimer: ReturnType<typeof setInterval> | null = null;
  private playlist: SoundtrackTrack[] = [...BUILT_IN_PLAYLIST];
  private currentTime: number = 0;
  private duration: number = 0;

  private listeners: Set<(state: AudioEngineState) => void> = new Set();
  private objectUrlsToRevoke: string[] = [];
  private gestureUnlockBound: boolean = false;

  constructor() {
    try {
      const savedVol = localStorage.getItem('ecoquest_audio_volume');
      if (savedVol) this.currentVolume = parseFloat(savedVol);
      const savedMute = localStorage.getItem('ecoquest_audio_muted');
      if (savedMute) this.isMuted = savedMute === 'true';
    } catch {}

    if (typeof window !== 'undefined') {
      this.initAudioElement();
      this.setupAutoplayUnlock();
      // Immediately attempt autoplay when app starts
      this.start().catch(() => {});
    }
  }

  private setupAutoplayUnlock() {
    if (this.gestureUnlockBound || typeof window === 'undefined') return;
    this.gestureUnlockBound = true;

    const tryResumeOnGesture = () => {
      if (this.wantsToPlay && this.audioElement && (this.audioElement.paused || !this.isPlaying)) {
        this.audioElement.volume = this.effectiveVolume();
        this.audioElement
          .play()
          .then(() => {
            this.isPlaying = true;
            this.notify();
          })
          .catch(() => {});
      }
    };

    ['pointerdown', 'touchstart', 'keydown', 'click'].forEach((evt) => {
      window.addEventListener(evt, tryResumeOnGesture, { passive: true });
    });
  }

  private initAudioElement() {
    if (this.audioElement) return;
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.loop = true;
    this.audioElement.volume = this.effectiveVolume();

    const track = this.playlist[this.currentTrackIndex] || this.playlist[0];
    if (track) {
      this.audioElement.src = track.src;
    }

    this.audioElement.addEventListener('ended', () => {
      if (this.audioElement) {
        this.audioElement.currentTime = 0;
        this.audioElement.play().catch(() => {});
      }
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement) {
        this.currentTime = this.audioElement.currentTime;
        this.duration = this.audioElement.duration || 0;
        this.notify();
      }
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement) {
        this.duration = this.audioElement.duration || 0;
        this.notify();
      }
    });

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.notify();
    });

    this.audioElement.addEventListener('pause', () => {
      if (!this.wantsToPlay) {
        this.isPlaying = false;
        this.notify();
      }
    });
  }

  public subscribe(cb: (state: AudioEngineState) => void) {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((cb) => cb(s));
  }

  public getState(): AudioEngineState {
    const curTrack = this.playlist[this.currentTrackIndex] || this.playlist[0];
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.currentVolume,
      currentTrackIndex: this.currentTrackIndex,
      currentTrack: curTrack,
      playlist: this.playlist,
      currentTime: this.currentTime,
      duration: this.duration,
    };
  }

  public async start(): Promise<void> {
    this.initAudioElement();
    this.wantsToPlay = true;
    const track = this.playlist[this.currentTrackIndex] || this.playlist[0];

    if (this.audioElement && track) {
      if (!this.audioElement.src || !this.audioElement.src.includes(track.src)) {
        this.audioElement.src = track.src;
      }
      this.audioElement.loop = true;
      this.audioElement.volume = this.effectiveVolume();
      try {
        await this.audioElement.play();
        this.isPlaying = true;
        this.notify();
      } catch {
        // Browser awaiting user gesture; setupAutoplayUnlock will start this exact track on first tap/click
        this.isPlaying = true;
        this.notify();
      }
    }
  }

  public stop(): void {
    this.wantsToPlay = false;
    this.stopHtmlAudio();
    this.isPlaying = false;
    this.notify();
  }

  private stopHtmlAudio() {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
      } catch {}
    }
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  public setVolume(vol: number): void {
    this.currentVolume = Math.min(1, Math.max(0, vol));
    try {
      localStorage.setItem('ecoquest_audio_volume', String(this.currentVolume));
    } catch {}

    if (this.audioElement) {
      this.audioElement.volume = this.effectiveVolume();
    }
    this.notify();
  }

  public seek(progressRatio: number): void {
    if (this.audioElement && this.duration > 0) {
      const targetTime = Math.min(this.duration, Math.max(0, progressRatio * this.duration));
      this.audioElement.currentTime = targetTime;
      this.currentTime = targetTime;
      this.notify();
    }
  }

  // Calculate actual volume accounting for mute and ducking (outdoor speech isolation)
  private effectiveVolume(): number {
    if (this.isMuted) return 0;
    if (this.isDucked) return Math.max(0, this.currentVolume * 0.12);
    return this.currentVolume;
  }

  // Automatically lowers background music when voice assistant is listening or speaking
  public duckAudioForSpeech(duckFactor = 0.12) {
    this.isDucked = true;
    if (this.duckFadeTimer) {
      clearInterval(this.duckFadeTimer);
      this.duckFadeTimer = null;
    }

    const targetVol = this.isMuted ? 0 : Math.max(0, this.currentVolume * duckFactor);

    if (this.audioElement) {
      const startVol = this.audioElement.volume;
      const steps = 6;
      let step = 0;
      this.duckFadeTimer = setInterval(() => {
        step++;
        if (this.audioElement) {
          const ratio = step / steps;
          this.audioElement.volume = Math.max(0, startVol + (targetVol - startVol) * ratio);
        }
        if (step >= steps) {
          if (this.duckFadeTimer) clearInterval(this.duckFadeTimer);
          this.duckFadeTimer = null;
        }
      }, 25);
    }
  }

  // Restores music to standard expedition level once conversation or speech concludes
  public restoreAudioAfterSpeech() {
    this.isDucked = false;
    if (this.duckFadeTimer) {
      clearInterval(this.duckFadeTimer);
      this.duckFadeTimer = null;
    }

    const targetVol = this.isMuted ? 0 : this.currentVolume;

    if (this.audioElement) {
      const startVol = this.audioElement.volume;
      const steps = 8;
      let step = 0;
      this.duckFadeTimer = setInterval(() => {
        step++;
        if (this.audioElement) {
          const ratio = step / steps;
          this.audioElement.volume = Math.min(1, Math.max(0, startVol + (targetVol - startVol) * ratio));
        }
        if (step >= steps) {
          if (this.duckFadeTimer) clearInterval(this.duckFadeTimer);
          this.duckFadeTimer = null;
        }
      }, 35);
    }
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('ecoquest_audio_muted', String(this.isMuted));
    } catch {}

    if (this.audioElement) {
      this.audioElement.volume = this.effectiveVolume();
    }
    this.notify();
  }

  public selectTrack(index: number): void {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentTrackIndex = index;
    const track = this.playlist[index];

    const wasPlaying = this.isPlaying;
    this.stop();

    if (this.audioElement) {
      this.audioElement.src = track.src;
    }

    if (wasPlaying) {
      this.start();
    } else {
      this.notify();
    }
  }

  public nextTrack(): void {
    if (this.playlist.length <= 1) {
      this.seek(0);
      return;
    }
    const nextIdx = (this.currentTrackIndex + 1) % this.playlist.length;
    this.selectTrack(nextIdx);
  }

  public prevTrack(): void {
    if (this.playlist.length <= 1) {
      this.seek(0);
      return;
    }
    const prevIdx =
      (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    this.selectTrack(prevIdx);
  }

  // Add custom track from file upload (replaces playlist so only 1 track plays)
  public async addCustomFileTrack(file: File, customTitle?: string, customArtist?: string): Promise<SoundtrackTrack> {
    const trackId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    const title = customTitle?.trim() || cleanName;
    const artist = customArtist?.trim() || 'My Music';
    const mood = 'Custom Expedition Soundtrack';

    const storedItem: StoredCustomTrack = {
      id: trackId,
      title,
      artist,
      mood,
      blob: file,
      filename: file.name,
      dateAdded: Date.now(),
    };
    await saveCustomTrack(storedItem);

    const objectUrl = URL.createObjectURL(file);
    this.objectUrlsToRevoke.push(objectUrl);

    const newTrack: SoundtrackTrack = {
      id: trackId,
      title,
      artist,
      mood,
      src: objectUrl,
      isCustom: true,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    };

    this.playlist = [newTrack];
    this.currentTrackIndex = 0;
    this.selectTrack(0);
    await this.start();
    return newTrack;
  }

  public async addCustomUrlTrack(title: string, artist: string, url: string): Promise<SoundtrackTrack> {
    const trackId = `custom-url-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const trackTitle = title.trim() || 'Custom Stream';
    const trackArtist = artist.trim() || 'Online Audio';

    const storedItem: StoredCustomTrack = {
      id: trackId,
      title: trackTitle,
      artist: trackArtist,
      mood: 'Streaming Soundtrack',
      url,
      dateAdded: Date.now(),
    };
    await saveCustomTrack(storedItem);

    const newTrack: SoundtrackTrack = {
      id: trackId,
      title: trackTitle,
      artist: trackArtist,
      mood: 'Streaming Soundtrack',
      src: url,
      isCustom: true,
    };

    this.playlist = [newTrack];
    this.currentTrackIndex = 0;
    this.selectTrack(0);
    await this.start();
    return newTrack;
  }

  public async removeCustomTrack(trackId: string): Promise<void> {
    await deleteCustomTrack(trackId);
    const filtered = this.playlist.filter((t) => t.id !== trackId);
    this.playlist = filtered.length > 0 ? filtered : [...BUILT_IN_PLAYLIST];
    this.currentTrackIndex = 0;
    this.selectTrack(0);
  }
}

export const ambientAudioService = new AmbientAudioService();
