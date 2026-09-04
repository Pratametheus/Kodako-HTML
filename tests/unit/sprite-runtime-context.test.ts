import { describe, expect, it } from 'vitest';
import {
  createRuntimeContext,
  isKeyDown,
  resetTimer,
  setAnswer,
  setKey,
  setMouse,
  timerSeconds,
  updateSprite,
} from '../../src/runtime/sprite/runtime-context';
import { createNoopAudioEngine } from '../../src/runtime/sprite/audio';
import { createSprite } from '../../src/runtime/sprite/sprite';

describe('sprite runtime context', () => {
  it('clones input sprites into an addressable stage map', () => {
    const input = createSprite({
      id: 's1',
      name: 'Kucing',
      costumes: ['cat'],
      variables: { skor: 1 },
    });
    const ctx = createRuntimeContext([input], () => 1000);

    const stored = ctx.sprites.get('s1')!;
    expect(stored).toEqual(input);
    expect(stored).not.toBe(input);
    expect(stored.costumes).not.toBe(input.costumes);
    expect(stored.variables).not.toBe(input.variables);
    expect(ctx.getStageSprites()).toEqual([stored]);
  });

  it('uses the injected clock and rebases the timer', () => {
    let now = 1000;
    const ctx = createRuntimeContext([], () => now);
    now = 2500;
    expect(timerSeconds(ctx)).toBe(1.5);
    resetTimer(ctx);
    now = 3000;
    expect(timerSeconds(ctx)).toBe(0.5);
  });

  it('round-trips normalized keyboard state', () => {
    const ctx = createRuntimeContext([]);
    setKey(ctx, 'A', true);
    setKey(ctx, 'ArrowUp', true);
    setKey(ctx, ' ', true);

    expect(isKeyDown(ctx, 'a')).toBe(true);
    expect(isKeyDown(ctx, 'A')).toBe(true);
    expect(isKeyDown(ctx, 'ArrowUp')).toBe(true);
    expect(isKeyDown(ctx, ' ')).toBe(true);

    setKey(ctx, 'a', false);
    expect(isKeyDown(ctx, 'A')).toBe(false);
  });

  it('replaces a sprite map entry', () => {
    const first = createSprite({ id: 's1', name: 'Kucing' });
    const next = { ...first, x: 42 };
    const ctx = createRuntimeContext([first]);

    updateSprite(ctx, 's1', next);

    expect(ctx.sprites.get('s1')).toBe(next);
  });

  it('initializes and updates shared mouse and answer state', () => {
    const ctx = createRuntimeContext([]);

    expect(ctx.mouse).toEqual({ x: 0, y: 0, down: false });
    expect(ctx.answer).toBe('');
    expect(ctx.audio.getVolume('s1')).toBe(100);

    setMouse(ctx, 12, -8, true);
    setAnswer(ctx, 'Budi');
    expect(ctx.mouse).toEqual({ x: 12, y: -8, down: true });
    expect(ctx.answer).toBe('Budi');
  });

  it('uses injected clock and audio engine options', () => {
    const audio = createNoopAudioEngine();
    const ctx = createRuntimeContext([], { now: () => 1234, audio });

    expect(ctx.timerOrigin).toBe(1234);
    expect(ctx.audio).toBe(audio);
  });
});
