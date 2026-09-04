import { describe, expect, it } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { generateThreads } from '../../src/blocks/sprite/generator';
import { buildApi } from '../../src/runtime/sprite/api';
import { createThreadInterpreter } from '../../src/runtime/sprite/interpreter';
import { createRuntimeContext } from '../../src/runtime/sprite/runtime-context';
import { createScheduler } from '../../src/runtime/sprite/scheduler';
import { createSprite } from '../../src/runtime/sprite/sprite';

installSpriteBlockly();

describe('highlight tracking + say end-to-end (generator -> interpreter -> scheduler)', () => {
  it('highlights the katakan block then the gerak block, and applies say + move', () => {
    const w = new Blockly.Workspace();
    const hat = w.newBlock('sprite_hat_green_flag');
    const say = w.newBlock('sprite_say');
    const text = w.newBlock('text');
    text.setFieldValue('hai', 'TEXT');
    say.getInput('TEXT')!.connection!.connect(text.outputConnection!);
    const move = w.newBlock('sprite_move');
    const n = w.newBlock('math_number');
    n.setFieldValue('5', 'NUM');
    move.getInput('STEPS')!.connection!.connect(n.outputConnection!);
    hat.nextConnection!.connect(say.previousConnection!);
    say.nextConnection!.connect(move.previousConnection!);

    const code = generateThreads(w)[0]!.code;

    const ctx = createRuntimeContext([createSprite({ id: 's1', name: 'Kucing' })], () => 0);
    const highlights: (string | null)[] = [];
    const onHighlight = (id: string | null): void => {
      highlights.push(id);
    };
    const scheduler = createScheduler({ ctx, render: () => {}, onHighlight });
    const api = buildApi(ctx, 's1', {
      onBroadcast: () => {},
      onStop: () => {},
      onHighlight: (id) => onHighlight(id),
    });
    scheduler.start([
      { spriteId: 's1', hatBlockId: hat.id, interp: createThreadInterpreter(code, api) },
    ]);

    for (let frame = 0; frame < 5; frame++) scheduler.tick(frame * 16);

    // (a) highlight ids track real execution order: katakan before gerak.
    expect(highlights).toContain(say.id);
    expect(highlights).toContain(move.id);
    expect(highlights.indexOf(say.id)).toBeLessThan(highlights.indexOf(move.id));

    // (b) the say + move effects reached the runtime context.
    expect(ctx.sprites.get('s1')!.bubble).toEqual({ kind: 'say', text: 'hai' });
    expect(ctx.sprites.get('s1')!.x).toBeCloseTo(5);
    expect(scheduler.isRunning()).toBe(false);

    w.dispose();
  });
});
