import { afterEach, describe, expect, it, vi } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { createSpriteEvents } from '../../src/runtime/sprite/event-bus';
import { createRuntimeContext } from '../../src/runtime/sprite/runtime-context';
import { createScheduler } from '../../src/runtime/sprite/scheduler';
import { createSprite } from '../../src/runtime/sprite/sprite';

installSpriteBlockly();

const workspaces: Blockly.Workspace[] = [];
afterEach(() => {
  workspaces.splice(0).forEach((workspace) => workspace.dispose());
});

function program(hatType: string, statementType: string, amount = 5): Blockly.Workspace {
  const workspace = new Blockly.Workspace();
  workspaces.push(workspace);
  const hat = workspace.newBlock(hatType);
  const statement = workspace.newBlock(statementType);
  const inputName = statementType === 'sprite_wait' ? 'SECS' : 'STEPS';
  const number = workspace.newBlock('math_number');
  number.setFieldValue(String(amount), 'NUM');
  statement.getInput(inputName)!.connection!.connect(number.outputConnection!);
  hat.nextConnection!.connect(statement.previousConnection!);
  return workspace;
}

function setup(spriteIds: string[]) {
  const ctx = createRuntimeContext(
    spriteIds.map((id) => createSprite({ id, name: id })),
    () => 0,
  );
  const scheduler = createScheduler({ ctx, render: vi.fn(), onHighlight: vi.fn() });
  const events = createSpriteEvents({ ctx, scheduler, onHighlight: vi.fn() });
  return { ctx, events, scheduler };
}

describe('sprite event bus', () => {
  it('starts green-flag threads for every sprite', () => {
    const { ctx, events, scheduler } = setup(['s1', 's2']);
    events.rebuild([
      { spriteId: 's1', workspace: program('sprite_hat_green_flag', 'sprite_move', 5) },
      { spriteId: 's2', workspace: program('sprite_hat_green_flag', 'sprite_move', 5) },
    ]);

    events.greenFlag();
    scheduler.tick(0);

    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(5);
    expect(ctx.sprites.get('s2')!.x).toBeCloseTo(5);
    expect(scheduler.isRunning()).toBe(false);
  });

  it('starts only matching receive and clicked hats', () => {
    const { ctx, events, scheduler } = setup(['s1']);
    const receive = program('sprite_hat_receive', 'sprite_move', 3);
    receive.getTopBlocks(true)[0]!.setFieldValue('go', 'MSG');
    const clicked = program('sprite_hat_clicked', 'sprite_move', 2);
    events.rebuild([
      { spriteId: 's1', workspace: receive },
      { spriteId: 's1', workspace: clicked },
    ]);

    events.broadcast('nope');
    scheduler.tick(0);
    expect(ctx.sprites.get('s1')!.x).toBe(0);
    events.broadcast('go');
    scheduler.tick(16);
    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(3);
    events.spriteClicked('s1');
    scheduler.tick(32);
    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(5);
  });

  it('sets key state and deduplicates a live key-hat thread', () => {
    const { ctx, events, scheduler } = setup(['s1']);
    const workspace = new Blockly.Workspace();
    workspaces.push(workspace);
    const hat = workspace.newBlock('sprite_hat_key');
    hat.setFieldValue('ArrowUp', 'KEY');
    const wait = workspace.newBlock('sprite_wait');
    const seconds = workspace.newBlock('math_number');
    seconds.setFieldValue('0.1', 'NUM');
    wait.getInput('SECS')!.connection!.connect(seconds.outputConnection!);
    hat.nextConnection!.connect(wait.previousConnection!);
    events.rebuild([{ spriteId: 's1', workspace }]);

    events.keyDown('ArrowUp');
    events.keyDown('ArrowUp');

    expect(ctx.keysDown.has('ArrowUp')).toBe(true);
    expect(scheduler.threads).toHaveLength(1);
    scheduler.tick(0);
    events.keyDown('ArrowUp');
    expect(scheduler.threads).toHaveLength(1);
    events.keyUp('ArrowUp');
    expect(ctx.keysDown.has('ArrowUp')).toBe(false);
  });

  it('stops the previous green-flag run before restarting', () => {
    const { events, scheduler } = setup(['s1']);
    events.rebuild([
      { spriteId: 's1', workspace: program('sprite_hat_green_flag', 'sprite_wait', 1) },
    ]);

    events.greenFlag();
    const firstId = scheduler.threads[0]!.id;
    events.greenFlag();

    expect(scheduler.threads).toHaveLength(1);
    expect(scheduler.threads[0]!.id).not.toBe(firstId);
  });

  it('completes broadcast-and-wait immediately when there are no receivers', () => {
    const { events } = setup(['s1']);
    const done = vi.fn();
    events.rebuild([]);

    events.broadcastAndWait('none', done);

    expect(done).toHaveBeenCalledOnce();
    expect(events.hasLiveThreadsForMessage('none')).toBe(false);
  });
});
