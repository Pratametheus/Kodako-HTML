import { describe, expect, it, vi } from 'vitest';
import { buildApi, cmp } from '../../src/runtime/sprite/api';
import { createRuntimeContext } from '../../src/runtime/sprite/runtime-context';
import { createSprite } from '../../src/runtime/sprite/sprite';
import type { AudioEngine } from '../../src/runtime/sprite/audio';

function setup() {
  let now = 1000;
  const volumes = new Map<string, number>();
  const audio: AudioEngine = {
    play: vi.fn(),
    playUntilDone: vi.fn(async () => undefined),
    stopAll: vi.fn(),
    changeVolume: vi.fn((id, delta) => volumes.set(id, (volumes.get(id) ?? 100) + delta)),
    setVolume: vi.fn((id, percent) => volumes.set(id, percent)),
    getVolume: vi.fn((id) => volumes.get(id) ?? 100),
    dispose: vi.fn(),
  };
  const sprite = createSprite({
    id: 's1',
    name: 'Kucing',
    costumes: ['cat', 'ball', 'star'],
  });
  const other = createSprite({ id: 's2', name: 'Sprite 2', x: 20, y: 0 });
  const ctx = createRuntimeContext([sprite, other], {
    now: () => now,
    audio,
    assets: { 'uploaded-sound': { name: 'Rekam', ref: 'data:audio/wav;base64,UklGRg==' } },
  });
  const hooks = {
    onBroadcast: vi.fn(),
    onStop: vi.fn(),
    onHighlight: vi.fn(),
    onPlaySound: vi.fn(),
    onStopAllSounds: vi.fn(),
    onVolumeChange: vi.fn(),
    costumeNaturalOf: vi.fn(() => ({ width: 80, height: 80 })),
    spriteByName: vi.fn(
      (name: string) =>
        [...ctx.sprites.values()].find((candidate) => candidate.name === name) ?? null,
    ),
    colorUnderSprite: vi.fn(() => true),
  };
  const api = buildApi(ctx, 's1', hooks);
  return { api, ctx, hooks, setNow: (value: number) => (now = value) };
}

describe('buildApi', () => {
  it('applies synchronous motion and appearance ops to the context sprite', () => {
    const { api, ctx } = setup();

    api.sync.move!(10);
    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(10);
    api.sync.turnRight!(45);
    expect(ctx.sprites.get('s1')!.direction).toBe(135);
    api.sync.gotoXY!(20, 30);
    api.sync.changeX!(5);
    api.sync.changeY!(-10);
    expect(ctx.sprites.get('s1')).toMatchObject({ x: 25, y: 20 });
    api.sync.say!('halo');
    expect(ctx.sprites.get('s1')!.bubble).toEqual({ kind: 'say', text: 'halo' });
    api.sync.sayClear!();
    expect(ctx.sprites.get('s1')!.bubble).toBeNull();
    api.sync.hide!();
    expect(ctx.sprites.get('s1')!.visible).toBe(false);
    api.sync.show!();
    expect(ctx.sprites.get('s1')!.visible).toBe(true);
  });

  it('resolves costumes by index string and name', () => {
    const { api, ctx } = setup();

    api.sync.switchCostume!('2');
    expect(ctx.sprites.get('s1')!.costumeIndex).toBe(2);
    api.sync.switchCostume!('ball');
    expect(ctx.sprites.get('s1')!.costumeIndex).toBe(1);
    api.sync.nextCostume!();
    expect(ctx.sprites.get('s1')!.costumeIndex).toBe(2);
  });

  it('gets, sets, and changes runtime variables', () => {
    const { api, ctx } = setup();

    expect(api.sync.getVar!('skor')).toBe(0);
    api.sync.setVar!('skor', 4);
    api.sync.changeVar!('skor', 3);
    expect(api.sync.getVar!('skor')).toBe(7);
    expect(ctx.sprites.get('s1')!.variables).toEqual({ skor: 7 });
  });

  it('exposes timer, key, broadcast, stop, and highlight hooks', () => {
    const { api, ctx, hooks, setNow } = setup();
    ctx.keysDown.add('a');
    setNow(2500);

    expect(api.sync.timer!()).toBe(1.5);
    expect(api.sync.isKeyPressed!('A')).toBe(true);
    api.sync.resetTimer!();
    setNow(3000);
    expect(api.sync.timer!()).toBe(0.5);
    api.sync.broadcast!('mulai');
    api.sync.stop!('others');
    api.sync.highlightBlock!('b1');

    expect(hooks.onBroadcast).toHaveBeenCalledWith('mulai');
    expect(hooks.onStop).toHaveBeenCalledWith('others', 's1');
    expect(hooks.onHighlight).toHaveBeenCalledWith('b1');
  });

  it('cmp() compares numerically when both sides look numeric, else as strings', () => {
    expect(cmp('10', '9', 'gt')).toBe(true); // numeric: 10 > 9, not lexicographic
    expect(cmp('10', 9, 'gt')).toBe(true);
    expect(cmp('apel', 'jeruk', 'lt')).toBe(true); // string: 'a' < 'j'
    expect(cmp('5', 5, 'eq')).toBe(true); // '5' == 5 after numeric coercion
    expect(cmp('2', '10', 'lt')).toBe(true); // numeric, not '2' > '1'
    expect(cmp('abc', 'abc', 'eq')).toBe(true);
    expect(cmp('abc', 'abd', 'eq')).toBe(false);
  });

  it('exposes cmp through the sync API', () => {
    const { api } = setup();
    expect(api.sync.cmp!('10', '9', 'gt')).toBe(true);
    expect(api.sync.cmp!('apel', 'jeruk', 'lt')).toBe(true);
    expect(api.sync.cmp!('5', 5, 'eq')).toBe(true);
  });

  it('returns duration requests and captures glide origin', () => {
    const { api } = setup();

    expect(api.async.wait!(0.5)).toEqual({ kind: 'wait', seconds: 0.5 });
    expect(api.async.glide!(1, 100, 20)).toEqual({
      kind: 'glide',
      seconds: 1,
      toX: 100,
      toY: 20,
      fromX: 0,
      fromY: 0,
    });
    expect(api.async.sayForSecs!('halo', 2)).toEqual({ kind: 'sayFor', seconds: 2 });
    expect(api.async.frameYield!()).toEqual({ kind: 'yield' });
    expect(api.async.broadcastAndWait!('go')).toEqual({
      kind: 'broadcastWait',
      message: 'go',
    });
  });

  it('plays resolved sounds and applies clamped per-sprite volume', () => {
    const { api, ctx, hooks } = setup();

    api.sync.playSound!('builtin:snd-pop');
    expect(hooks.onPlaySound).toHaveBeenCalledWith(expect.any(String), 's1');
    expect(hooks.onPlaySound.mock.calls[0]?.[0]).not.toBe('');
    api.sync.playSound!('Rekam');
    expect(hooks.onPlaySound).toHaveBeenLastCalledWith('data:audio/wav;base64,UklGRg==', 's1');
    api.sync.stopAllSounds!();
    expect(hooks.onStopAllSounds).toHaveBeenCalledOnce();

    api.sync.setVolume!(50);
    expect(ctx.audio.getVolume('s1')).toBe(50);
    expect(hooks.onVolumeChange).toHaveBeenLastCalledWith('s1', 50);
    api.sync.changeVolume!(-30);
    expect(ctx.audio.getVolume('s1')).toBe(20);
    expect(hooks.onVolumeChange).toHaveBeenLastCalledWith('s1', 20);

    const request = api.async.playSoundUntilDone!('builtin:snd-pop');
    expect(request).toMatchObject({ kind: 'playUntilDone', soundUrl: expect.any(String) });
    expect((request as { soundUrl: string }).soundUrl).not.toBe('');
  });

  it('reads edge, pointer, sprite, color, mouse, distance, and answer sensing state', () => {
    const { api, ctx, hooks } = setup();
    const self = ctx.sprites.get('s1')!;
    ctx.sprites.set('s1', { ...self, x: 240 });
    expect(api.sync.isTouching!('edge')).toBe(true);

    ctx.mouse = { x: 240, y: 0, down: true };
    expect(api.sync.isTouching!('pointer')).toBe(true);
    expect(api.sync.isTouching!('Sprite 2')).toBe(false);
    ctx.sprites.set('s1', { ...self, x: 0, y: 0 });
    expect(api.sync.isTouching!('Sprite 2')).toBe(true);
    expect(api.sync.isTouchingColor!('#000000')).toBe(true);
    expect(hooks.colorUnderSprite).toHaveBeenCalledWith('s1', '#000000');
    expect(api.sync.isMouseDown!()).toBe(true);
    ctx.mouse = { x: 3, y: 4, down: false };
    expect(api.sync.mouseX!()).toBe(3);
    expect(api.sync.mouseY!()).toBe(4);
    expect(api.sync.distanceTo!('pointer')).toBe(5);
    ctx.answer = 'Budi';
    expect(api.sync.answer!()).toBe('Budi');
    expect(api.sync.distanceTo!('tidak ada')).toBe(0);
  });

  it('returns an ask duration request without opening UI in the API layer', () => {
    const { api, hooks } = setup();
    expect(api.async.ask!('Nama?')).toEqual({ kind: 'ask', question: 'Nama?' });
    for (const hook of Object.values(hooks)) expect(hook).not.toHaveBeenCalled();
  });

  it('uses an 80 by 80 costume fallback for direct edge sensing callers', () => {
    const ctx = createRuntimeContext([createSprite({ id: 's1', name: 'Kucing', x: 210 })]);
    const api = buildApi(ctx, 's1', {
      onBroadcast: vi.fn(),
      onStop: vi.fn(),
      onHighlight: vi.fn(),
    });

    expect(api.sync.isTouching!('edge')).toBe(true);
  });
});
