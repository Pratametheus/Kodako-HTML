import { describe, expect, it, vi } from 'vitest';
import { buildApi, cmp } from '../../src/runtime/sprite/api';
import { createRuntimeContext } from '../../src/runtime/sprite/runtime-context';
import { createSprite } from '../../src/runtime/sprite/sprite';

function setup() {
  let now = 1000;
  const sprite = createSprite({
    id: 's1',
    name: 'Kucing',
    costumes: ['cat', 'ball', 'star'],
  });
  const ctx = createRuntimeContext([sprite], () => now);
  const hooks = {
    onBroadcast: vi.fn(),
    onStop: vi.fn(),
    onHighlight: vi.fn(),
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
});
