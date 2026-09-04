import { describe, expect, it, vi } from 'vitest';
import { buildApi } from '../../src/runtime/sprite/api';
import { createThreadInterpreter } from '../../src/runtime/sprite/interpreter';
import { createRuntimeContext } from '../../src/runtime/sprite/runtime-context';
import { createScheduler } from '../../src/runtime/sprite/scheduler';
import { createSprite } from '../../src/runtime/sprite/sprite';

function harness(
  code: string,
  overrides: {
    playSound?: (soundUrl: string, spriteId: string) => Promise<void>;
    onAsk?: (question: string, submit: (answer: string) => void) => void;
    onAskCancel?: () => void;
  } = {},
) {
  const ctx = createRuntimeContext([createSprite({ id: 's1', name: 'Kucing' })], () => 0);
  const render = vi.fn();
  const onHighlight = vi.fn();
  const scheduler = createScheduler({
    ctx,
    render,
    onHighlight,
    maxStepsPerFrame: 200_000,
    ...overrides,
  });
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

  it('parks until playSoundUntilDone resolves, then resumes the thread', async () => {
    let finishSound: (() => void) | undefined;
    const playSound = vi.fn(
      (soundUrl: string, spriteId: string) =>
        new Promise<void>((resolve) => {
          String(soundUrl);
          String(spriteId);
          finishSound = resolve;
        }),
    );
    const { ctx, scheduler } = harness(
      `
        function hat_green_flag_0() {
          playSoundUntilDone("builtin:snd-pop");
          move(10);
        }
      `,
      { playSound },
    );

    scheduler.tick(0);
    expect(ctx.sprites.get('s1')!.x).toBe(0);
    expect(playSound).toHaveBeenCalledOnce();
    expect(playSound).toHaveBeenCalledWith(expect.any(String), 's1');
    expect(playSound.mock.calls[0]?.[0]).not.toBe('');
    finishSound?.();
    await Promise.resolve();
    scheduler.tick(16);
    expect(ctx.sprites.get('s1')!.x).toBe(10);
    expect(scheduler.isRunning()).toBe(false);
  });

  it('resumes the thread when playSoundUntilDone rejects', async () => {
    const playSound = vi.fn(() => Promise.reject(new Error('decode gagal')));
    const { ctx, scheduler } = harness(
      `
        function hat_green_flag_0() {
          playSoundUntilDone("builtin:snd-pop");
          move(10);
        }
      `,
      { playSound },
    );

    scheduler.tick(0);
    expect(ctx.sprites.get('s1')!.x).toBe(0);
    await Promise.resolve();
    scheduler.tick(16);

    expect(ctx.sprites.get('s1')!.x).toBe(10);
    expect(scheduler.isRunning()).toBe(false);
  });

  it('skips playback and resumes when playSoundUntilDone has an empty URL', () => {
    const playSound = vi.fn(async () => undefined);
    const { ctx, scheduler } = harness(
      `
        function hat_green_flag_0() {
          playSoundUntilDone("");
          move(10);
        }
      `,
      { playSound },
    );

    scheduler.tick(0);
    scheduler.tick(16);

    expect(playSound).not.toHaveBeenCalled();
    expect(ctx.sprites.get('s1')!.x).toBe(10);
    expect(scheduler.isRunning()).toBe(false);
  });

  it('parks on ask, stores the submitted answer, then resumes', () => {
    let submit: ((answer: string) => void) | undefined;
    const onAsk = vi.fn((_question: string, callback: (answer: string) => void) => {
      submit = callback;
    });
    const { ctx, scheduler } = harness(
      `
        function hat_green_flag_0() {
          ask("Nama?");
          move(5);
          setVar("terlihat", answer());
        }
      `,
      { onAsk },
    );

    scheduler.tick(0);
    expect(onAsk).toHaveBeenCalledOnce();
    expect(onAsk.mock.calls[0]?.[0]).toBe('Nama?');
    expect(ctx.sprites.get('s1')!.x).toBe(0);
    submit?.('Budi');
    scheduler.tick(16);
    expect(ctx.answer).toBe('Budi');
    expect(ctx.sprites.get('s1')!.x).toBe(5);
    expect(ctx.sprites.get('s1')!.variables.terlihat).toBe('Budi');
  });

  it('opens only one ask at a time across sprite threads', () => {
    const ctx = createRuntimeContext([
      createSprite({ id: 's1', name: 'Satu' }),
      createSprite({ id: 's2', name: 'Dua' }),
    ]);
    const submissions: ((answer: string) => void)[] = [];
    const onAsk = vi.fn((_question: string, submit: (answer: string) => void) => {
      submissions.push(submit);
    });
    const scheduler = createScheduler({ ctx, render: vi.fn(), onHighlight: vi.fn(), onAsk });
    const makeThread = (spriteId: string, question: string) => {
      const api = buildApi(ctx, spriteId, {
        onBroadcast: vi.fn(),
        onStop: vi.fn(),
        onHighlight: vi.fn(),
      });
      return {
        spriteId,
        hatBlockId: `hat_${spriteId}`,
        interp: createThreadInterpreter(
          `function hat_green_flag_0() { ask("${question}"); move(1); }`,
          api,
        ),
      };
    };
    scheduler.start([makeThread('s1', 'Satu?'), makeThread('s2', 'Dua?')]);

    scheduler.tick(0);
    expect(onAsk).toHaveBeenCalledOnce();
    submissions[0]?.('A');
    expect(onAsk).toHaveBeenCalledTimes(2);
    submissions[1]?.('B');
    scheduler.tick(16);
    expect(ctx.sprites.get('s1')!.x).toBe(1);
    expect(ctx.sprites.get('s2')!.x).toBe(1);
  });

  it('cancels an active ask and drops its thread on stopAll', () => {
    const onAskCancel = vi.fn();
    const { scheduler } = harness(`function hat_green_flag_0() { ask("Nama?"); }`, {
      onAsk: vi.fn(),
      onAskCancel,
    });

    scheduler.tick(0);
    scheduler.stopAll();
    expect(scheduler.threads).toHaveLength(0);
    expect(onAskCancel).toHaveBeenCalledOnce();
  });
});
