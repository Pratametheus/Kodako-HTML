import { describe, expect, it, vi } from 'vitest';
import { buildApi } from '../../src/runtime/sprite/api';
import { createThreadInterpreter } from '../../src/runtime/sprite/interpreter';
import { createRuntimeContext } from '../../src/runtime/sprite/runtime-context';
import { createScheduler } from '../../src/runtime/sprite/scheduler';
import { createSprite } from '../../src/runtime/sprite/sprite';

function harness(code: string) {
  const ctx = createRuntimeContext([createSprite({ id: 's1', name: 'Kucing' })], () => 0);
  const render = vi.fn();
  const onHighlight = vi.fn();
  const scheduler = createScheduler({ ctx, render, onHighlight, maxStepsPerFrame: 200_000 });
  const api = buildApi(ctx, 's1', {
    onBroadcast: vi.fn(),
    onStop: vi.fn(),
    onHighlight: (id) => onHighlight(id),
  });
  scheduler.start([
    {
      spriteId: 's1',
      hatBlockId: 'hat1',
      interp: createThreadInterpreter(code, api),
    },
  ]);
  return { ctx, render, onHighlight, scheduler };
}

describe('sprite scheduler', () => {
  it('runs a finite repeat program to completion across frame yields', () => {
    const { ctx, render, scheduler } = harness(`
      function hat_green_flag_0() {
        for (var i = 0; i < 4; i++) {
          turnRight(90);
          move(10);
          __yield__();
        }
      }
    `);

    for (let frame = 0; frame < 5; frame++) scheduler.tick(frame * 16);

    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(0);
    expect(ctx.sprites.get('s1')!.y).toBeCloseTo(0);
    expect(scheduler.isRunning()).toBe(false);
    expect(render).toHaveBeenCalledTimes(5);
  });

  it('parks waits until their deadline', () => {
    const { ctx, scheduler } = harness(`
      function hat_green_flag_0() {
        move(5);
        wait(0.1);
        move(7);
      }
    `);

    scheduler.tick(0);
    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(5);
    scheduler.tick(50);
    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(5);
    scheduler.tick(120);
    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(12);
    expect(scheduler.isRunning()).toBe(false);
  });

  it('keeps forever loops alive at one iteration per frame and can stop all', () => {
    const { ctx, onHighlight, scheduler } = harness(`
      function hat_green_flag_0() {
        while (true) {
          move(1);
          __yield__();
        }
      }
    `);

    for (let frame = 0; frame < 10; frame++) scheduler.tick(frame * 16);

    expect(scheduler.isRunning()).toBe(true);
    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(10);
    scheduler.stopAll();
    expect(scheduler.threads).toHaveLength(0);
    expect(onHighlight).toHaveBeenLastCalledWith(null);
  });

  it('interpolates glides and snaps to their destination', () => {
    const { ctx, scheduler } = harness(`
      function hat_green_flag_0() {
        glide(1, 100, 0);
      }
    `);

    scheduler.tick(0);
    scheduler.tick(500);
    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(50);
    scheduler.tick(1000);
    expect(ctx.sprites.get('s1')!.x).toBe(100);
    expect(scheduler.isRunning()).toBe(false);
  });
});
