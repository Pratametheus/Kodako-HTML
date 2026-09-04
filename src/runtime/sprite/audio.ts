export const DEFAULT_VOLUME = 100;

export type AudioEngine = {
  play(url: string, spriteId: string): void;
  playUntilDone(url: string, spriteId: string): Promise<void>;
  stopAll(): void;
  changeVolume(spriteId: string, deltaPercent: number): void;
  setVolume(spriteId: string, percent: number): void;
  getVolume(spriteId: string): number;
  dispose(): void;
};

export function createNoopAudioEngine(): AudioEngine {
  return {
    play: () => {},
    playUntilDone: () => Promise.resolve(),
    stopAll: () => {},
    changeVolume: () => {},
    setVolume: () => {},
    getVolume: () => DEFAULT_VOLUME,
    dispose: () => {},
  };
}

function clampVolume(percent: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : DEFAULT_VOLUME));
}

export function createAudioEngine(ctor?: typeof AudioContext): AudioEngine {
  const audioGlobals = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  const ContextCtor =
    ctor ??
    (typeof audioGlobals.AudioContext !== 'undefined'
      ? audioGlobals.AudioContext
      : audioGlobals.webkitAudioContext);
  if (!ContextCtor) return createNoopAudioEngine();

  const context = new ContextCtor();
  const buffers = new Map<string, Promise<AudioBuffer>>();
  const gains = new Map<string, { node: GainNode; volume: number }>();
  const liveSources = new Set<AudioBufferSourceNode>();

  const gainFor = (spriteId: string): { node: GainNode; volume: number } => {
    const existing = gains.get(spriteId);
    if (existing) return existing;
    const node = context.createGain();
    node.gain.value = 1;
    node.connect(context.destination);
    const created = { node, volume: DEFAULT_VOLUME };
    gains.set(spriteId, created);
    return created;
  };

  const loadBuffer = (url: string): Promise<AudioBuffer> => {
    const cached = buffers.get(url);
    if (cached) return cached;
    const pending = fetch(url)
      .then((response) => response.arrayBuffer())
      .then((bytes) => context.decodeAudioData(bytes));
    buffers.set(url, pending);
    void pending.catch(() => buffers.delete(url));
    return pending;
  };

  const start = async (url: string, spriteId: string, onEnded?: () => void): Promise<void> => {
    const buffer = await loadBuffer(url);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(gainFor(spriteId).node);
    liveSources.add(source);
    source.addEventListener(
      'ended',
      () => {
        liveSources.delete(source);
        onEnded?.();
      },
      { once: true },
    );
    source.start();
  };

  const setVolume = (spriteId: string, percent: number): void => {
    const gain = gainFor(spriteId);
    gain.volume = clampVolume(percent);
    gain.node.gain.value = gain.volume / 100;
  };

  return {
    play(url, spriteId): void {
      void start(url, spriteId).catch(() => {});
    },
    playUntilDone(url, spriteId): Promise<void> {
      return new Promise((resolve, reject) => {
        void start(url, spriteId, resolve).catch(reject);
      });
    },
    stopAll(): void {
      for (const source of liveSources) {
        try {
          source.stop();
        } catch {
          liveSources.delete(source);
        }
      }
    },
    changeVolume(spriteId, deltaPercent): void {
      setVolume(spriteId, (gains.get(spriteId)?.volume ?? DEFAULT_VOLUME) + deltaPercent);
    },
    setVolume,
    getVolume(spriteId): number {
      return gains.get(spriteId)?.volume ?? DEFAULT_VOLUME;
    },
    dispose(): void {
      for (const source of liveSources) {
        try {
          source.stop();
        } catch {
          // A source may already have ended between iteration and stop.
        }
      }
      liveSources.clear();
      void context.close();
    },
  };
}
