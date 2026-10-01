export class AudioEngine {
  private audio: HTMLAudioElement = new HTMLAudioElement();
  private callbacks: Map<
    string,
    ((...args: unknown[]) => void)[]
  > = new Map();

  on(event: string, cb: (...args: unknown[]) => void): () => void {
    if (!this.callbacks.has(event)) this.callbacks.set(event, []);
    this.callbacks.get(event)!.push(cb);
    return () => {
      const list = this.callbacks.get(event);
      if (list) this.callbacks.set(event, list.filter((c) => c !== cb));
    };
  }

  private dispatch(event: string, ...args: unknown[]) {
    const list = this.callbacks.get(event);
    if (list) list.forEach((cb) => cb(...args as unknown[]));
  }

  setupEventListeners(elem: HTMLAudioElement) {
    elem.addEventListener('play', () => this.dispatch('play'));
    elem.addEventListener('pause', () => this.dispatch('pause'));
    elem.addEventListener('ended', () => this.dispatch('ended'));
    elem.addEventListener(
      'error',
      (e) => this.dispatch('error', e.message)
    );
    elem.addEventListener('canplay', () => this.dispatch('canplay'));
    elem.addEventListener('waiting', () => this.dispatch('buffering'));
    elem.addEventListener('playing', () => this.dispatch('playing'));
    elem.addEventListener('timeupdate', () => this.dispatch('timeupdate', elem.currentTime));
    elem.addEventListener('volumechange', () => this.dispatch('volumechange', elem.volume));
  }

  private baseAudioUrl = '/audio/';

  setBaseAudioUrl(url: string): void {
    this.baseAudioUrl = url.replace(/\/?$/, '/') + '/';
  }

  async play(trackId?: string): Promise<void> {
    if (!trackId) {
      this.stop();
      return;
    }
    this.dispatch('load', { trackId });
    this.audio.src = `${this.baseAudioUrl}${trackId}.wav`;
    this.audio.load();
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.audio.readyState >= 2) {
          this.audio.removeEventListener('canplay', check);
          resolve();
        }
      };
      this.audio.addEventListener('canplay', check);
      setTimeout(() => {
        this.audio.removeEventListener('canplay', check);
        this.dispatch('error', {
          code: 'TIMEOUT',
          message: 'Timeout cargando audio',
          retryable: true,
        });
        resolve();
      }, 10000);
    });
  }

  pause(): void {
    this.audio.pause();
    this.dispatch('pause');
  }

  toggle(): void {
    if (this.audio.paused) this.audio.play();
    else this.audio.pause();
  }

  next(): void {
    this.dispatch('next');
  }

  prev(): void {
    this.dispatch('prev');
  }

  seek(t: number): void {
    this.audio.currentTime = t;
    this.dispatch('seek', t);
  }

  setVolume(v: number): void {
    const volume = Math.max(0, Math.min(1, v));
    this.audio.volume = volume;
    this.dispatch('volumechange', volume);
  }

  setRepeat(m: 'off' | 'all' | 'one'): void {
    this.dispatch('repeat', m);
  }

  toggleShuffle(): void {
    this.dispatch('shuffle-toggle');
  }

  get isPlaying(): boolean {
    return !this.audio.paused && this.audio.currentTime > 0 && !this.audio.ended;
  }

  get duration(): number {
    return this.audio.duration;
  }

  get currentTime(): number {
    return this.audio.currentTime;
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.dispatch('stop');
  }
}
