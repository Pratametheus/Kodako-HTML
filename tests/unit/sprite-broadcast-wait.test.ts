import { afterEach, describe, expect, it, vi } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { createRuntimeContext } from '../../src/runtime/sprite/runtime-context';
import { createScheduler } from '../../src/runtime/sprite/scheduler';
import { createSpriteEvents, type SpriteEvents } from '../../src/runtime/sprite/event-bus';
import { createSprite } from '../../src/runtime/sprite/sprite';

installSpriteBlockly();

function num(w: Blockly.Workspace, value: string): Blockly.Block {
  const n = w.newBlock('math_number');
  n.setFieldValue(value, 'NUM');
  return n;
}

/** sprite A: green flag -> `kirim "go" dan tunggu` -> `gerak 10 langkah` */
function senderWorkspace(): Blockly.Workspace {
  const w = new Blockly.Workspace();
  const hat = w.newBlock('sprite_hat_green_flag');
  const bw = w.newBlock('sprite_broadcast_wait');
  bw.setFieldValue('go', 'MSG');
  const move = w.newBlock('sprite_move');
  move.getInput('STEPS')!.connection!.connect(num(w, '10').outputConnection!);
  hat.nextConnection!.connect(bw.previousConnection!);
  bw.nextConnection!.connect(move.previousConnection!);
  return w;
}

/** sprite B: on receive "go" -> `tunggu 0.2 detik` -> `gerak 5 langkah` */
function receiverWorkspace(): Blockly.Workspace {
  const w = new Blockly.Workspace();
  const hat = w.newBlock('sprite_hat_receive');
  hat.setFieldValue('go', 'MSG');
  const wait = w.newBlock('sprite_wait');
  wait.getInput('SECS')!.connection!.connect(num(w, '0.2').outputConnection!);
  const move = w.newBlock('sprite_move');
  move.getInput('STEPS')!.connection!.connect(num(w, '5').outputConnection!);
  hat.nextConnection!.connect(wait.previousConnection!);
  wait.nextConnection!.connect(move.previousConnection!);
  return w;
}

describe('in-script kirim … dan tunggu (broadcastAndWait)', () => {
  const workspaces: Blockly.Workspace[] = [];
  afterEach(() => {
    workspaces.splice(0).forEach((w) => w.dispose());
  });

  it('parks the caller until every receiver thread has finished, then resumes it', () => {
    const wsA = senderWorkspace();
    const wsB = receiverWorkspace();
    workspaces.push(wsA, wsB);

    const ctx = createRuntimeContext(
      [createSprite({ id: 'A', name: 'A' }), createSprite({ id: 'B', name: 'B' })],
      () => 0,
    );
    const onHighlight = vi.fn();
    // Forward ref: the scheduler needs a broadcast sink before `events` exists.
    let broadcast: (message: string) => void = () => {};
    const scheduler = createScheduler({
      ctx,
      render: () => {},
      onHighlight,
      onBroadcastDone: (message) => broadcast(message),
    });
    const events: SpriteEvents = createSpriteEvents({ ctx, scheduler, onHighlight });
    broadcast = events.broadcast;
    events.rebuild([
      { spriteId: 'A', workspace: wsA },
      { spriteId: 'B', workspace: wsB },
    ]);

    events.greenFlag();

    // tick 0: A runs up to broadcastAndWait, which spawns B and parks A.
    scheduler.tick(0);
    expect(ctx.sprites.get('A')!.x).toBeCloseTo(0);
    expect(scheduler.threads.some((t) => t.spriteId === 'B')).toBe(true);

    // B is mid-wait (parked until ~216ms); A must not advance.
    scheduler.tick(16); // B evaluates wait(0.2)
    scheduler.tick(100);
    scheduler.tick(200);
    expect(ctx.sprites.get('A')!.x).toBeCloseTo(0);
    expect(ctx.sprites.get('B')!.x).toBeCloseTo(0);

    // B's wait elapses: B moves 5 and finishes.
    scheduler.tick(260);
    expect(ctx.sprites.get('B')!.x).toBeCloseTo(5);
    expect(ctx.sprites.get('A')!.x).toBeCloseTo(0); // A still parked this tick

    // Next tick: receiver set is empty, A resumes and moves 10.
    scheduler.tick(300);
    expect(ctx.sprites.get('A')!.x).toBeCloseTo(10);
    expect(scheduler.isRunning()).toBe(false);
  });
});
