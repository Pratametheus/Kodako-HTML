import { describe, expect, it, vi } from 'vitest';
import type { DurationRequest, SpriteApi } from '../../src/runtime/sprite/api';
import { createThreadInterpreter } from '../../src/runtime/sprite/interpreter';

function runUntilStopped(interp: ReturnType<typeof createThreadInterpreter>): void {
  for (let steps = 0; interp.state === 'running' && steps < 10_000; steps++) interp.step();
}

function fakeApi(moves: number[], highlight = vi.fn()): SpriteApi {
  return {
    sync: {
      move: (value) => moves.push(Number(value)),
      highlightBlock: (id) => highlight(String(id)),
    },
    async: {
      wait: (seconds): DurationRequest => ({ kind: 'wait', seconds: Number(seconds) }),
      frameYield: (): DurationRequest => ({ kind: 'yield' }),
    },
  };
}

describe('createThreadInterpreter', () => {
  it('parks on an async native function and resumes after its callback', () => {
    const moves: number[] = [];
    const interp = createThreadInterpreter(
      'function hat_green_flag_0(){ move(3); wait(0.1); move(7); }',
      fakeApi(moves),
    );

    runUntilStopped(interp);
    expect(interp.state).toBe('parked');
    expect(interp.pending).toEqual({ kind: 'wait', seconds: 0.1 });
    expect(moves).toEqual([3]);

    interp.resume();
    runUntilStopped(interp);
    expect(interp.state).toBe('done');
    expect(moves).toEqual([3, 7]);
  });

  it('runs a pure synchronous program through to done', () => {
    const moves: number[] = [];
    const interp = createThreadInterpreter(
      'function hat_green_flag_0(){ move(2); move(4); }',
      fakeApi(moves),
    );

    runUntilStopped(interp);

    expect(interp.state).toBe('done');
    expect(moves).toEqual([2, 4]);
  });

  it('forwards block highlighting through the sync API', () => {
    const highlight = vi.fn();
    const interp = createThreadInterpreter(
      "function hat_green_flag_0(){ highlightBlock('abc'); }",
      fakeApi([], highlight),
    );

    runUntilStopped(interp);

    expect(highlight).toHaveBeenCalledWith('abc');
  });
});
