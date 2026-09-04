import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAudioEngine,
  createNoopAudioEngine,
  DEFAULT_VOLUME,
} from '../../src/runtime/sprite/audio';

class FakeGain {
  gain = { value: 1 };
  connect = vi.fn();
}

class FakeSource extends EventTarget {
  buffer: AudioBuffer | null = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  destination = {} as AudioDestinationNode;
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  decodeAudioData = vi.fn(async () => ({ duration: 0.1 }) as AudioBuffer);
  close = vi.fn(async () => undefined);

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain(): GainNode {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain as unknown as GainNode;
  }

  createBufferSource(): AudioBufferSourceNode {
    const source = new FakeSource();
    this.sources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }
}

describe('sprite audio engine', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([82, 73, 70, 70]))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('decodes, caches, starts, and stops live sources', async () => {
    const engine = createAudioEngine(FakeAudioContext as unknown as typeof AudioContext);
    const context = FakeAudioContext.instances[0]!;

    engine.play('/pop.wav', 's1');
    await vi.waitFor(() => expect(context.sources).toHaveLength(1));
    expect(context.decodeAudioData).toHaveBeenCalledOnce();
    expect(context.sources[0]!.start).toHaveBeenCalledOnce();

    engine.play('/pop.wav', 's1');
    await vi.waitFor(() => expect(context.sources).toHaveLength(2));
    expect(context.decodeAudioData).toHaveBeenCalledOnce();

    engine.stopAll();
    expect(context.sources[0]!.stop).toHaveBeenCalledOnce();
    expect(context.sources[1]!.stop).toHaveBeenCalledOnce();
  });

  it('tracks clamped per-sprite volume through gain nodes', () => {
    const engine = createAudioEngine(FakeAudioContext as unknown as typeof AudioContext);
    const context = FakeAudioContext.instances[0]!;

    expect(engine.getVolume('s1')).toBe(DEFAULT_VOLUME);
    engine.setVolume('s1', 50);
    expect(engine.getVolume('s1')).toBe(50);
    expect(context.gains[0]!.gain.value).toBe(0.5);
    engine.changeVolume('s1', -30);
    expect(engine.getVolume('s1')).toBe(20);
    engine.changeVolume('s1', 200);
    expect(engine.getVolume('s1')).toBe(100);
  });

  it('resolves playUntilDone only after the source ends', async () => {
    const engine = createAudioEngine(FakeAudioContext as unknown as typeof AudioContext);
    const context = FakeAudioContext.instances[0]!;
    let resolved = false;

    const completion = engine.playUntilDone('/boing.wav', 's1').then(() => {
      resolved = true;
    });
    await vi.waitFor(() => expect(context.sources).toHaveLength(1));
    expect(resolved).toBe(false);
    context.sources[0]!.dispatchEvent(new Event('ended'));
    await completion;
    expect(resolved).toBe(true);
  });

  it('closes its context when disposed', async () => {
    const engine = createAudioEngine(FakeAudioContext as unknown as typeof AudioContext);
    const context = FakeAudioContext.instances[0]!;
    engine.dispose();
    await vi.waitFor(() => expect(context.close).toHaveBeenCalledOnce());
  });

  it('provides a complete no-op engine when AudioContext is unavailable', async () => {
    const direct = createNoopAudioEngine();
    const detected = createAudioEngine();

    direct.play('/x.wav', 's1');
    direct.stopAll();
    direct.changeVolume('s1', -20);
    direct.setVolume('s1', 50);
    direct.dispose();
    await expect(direct.playUntilDone('/x.wav', 's1')).resolves.toBeUndefined();
    await expect(detected.playUntilDone('/x.wav', 's1')).resolves.toBeUndefined();
    expect(direct.getVolume('s1')).toBe(DEFAULT_VOLUME);
    expect(detected.getVolume('s1')).toBe(DEFAULT_VOLUME);
  });
});
