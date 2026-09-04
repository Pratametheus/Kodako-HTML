import { describe, expect, it } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { generateThreads } from '../../src/blocks/sprite/generator';

installSpriteBlockly();

function ws(): Blockly.Workspace {
  return new Blockly.Workspace();
}
function connectStack(...blocks: Blockly.Block[]) {
  for (let i = 0; i < blocks.length - 1; i++) {
    blocks[i]!.nextConnection!.connect(blocks[i + 1]!.previousConnection!);
  }
}

describe('generateThreads', () => {
  it('emits one sync ES5 function per hat with no async/await/let/const/=>', () => {
    const w = ws();
    const hat = w.newBlock('sprite_hat_green_flag');
    const move = w.newBlock('sprite_move');
    move.getInput('STEPS')!.connection!.connect(
      (() => {
        const n = w.newBlock('math_number');
        n.setFieldValue('10', 'NUM');
        return n.outputConnection!;
      })(),
    );
    connectStack(hat, move);
    const threads = generateThreads(w);
    expect(threads).toHaveLength(1);
    expect(threads[0]!.hatType).toBe('green_flag');
    const code = threads[0]!.code;
    expect(code).toMatch(/^function hat_green_flag_0\(\) \{/);
    expect(code).not.toMatch(/\basync\b|\bawait\b|=>|\blet\b|\bconst\b|`/);
    expect(code).toContain('move(10)');
    expect(code).toContain("highlightBlock('");
    w.dispose();
  });

  it('ulangi terus becomes while(true) with a __yield__() at the end of the body', () => {
    const w = ws();
    const hat = w.newBlock('sprite_hat_green_flag');
    const forever = w.newBlock('sprite_forever');
    const move = w.newBlock('sprite_move');
    move.getInput('STEPS')!.connection!.connect(
      (() => {
        const n = w.newBlock('math_number');
        n.setFieldValue('1', 'NUM');
        return n.outputConnection!;
      })(),
    );
    forever.getInput('DO')!.connection!.connect(move.previousConnection!);
    connectStack(hat, forever);
    const code = generateThreads(w)[0]!.code;
    expect(code).toMatch(/while \(true\) \{[\s\S]*__yield__\(\);\s*\}/);
    w.dispose();
  });

  it('captures key / message metadata from key and receive hats', () => {
    const w = ws();
    const kh = w.newBlock('sprite_hat_key');
    kh.setFieldValue('ArrowUp', 'KEY');
    const rh = w.newBlock('sprite_hat_receive');
    rh.setFieldValue('mulai', 'MSG');
    const threads = generateThreads(w);
    expect(threads.find((t) => t.hatType === 'key')?.key).toBe('ArrowUp');
    expect(threads.find((t) => t.hatType === 'receive')?.message).toBe('mulai');
    w.dispose();
  });

  it("hentikan [semua] emits stop('all') immediately followed by return;", () => {
    const w = ws();
    const hat = w.newBlock('sprite_hat_green_flag');
    const stop = w.newBlock('sprite_stop');
    stop.setFieldValue('all', 'TARGET');
    connectStack(hat, stop);
    const code = generateThreads(w)[0]!.code;
    expect(code).toContain("stop('all');\nreturn;");
    w.dispose();
  });

  it('hentikan [skrip lain] also halts the caller with return;', () => {
    const w = ws();
    const hat = w.newBlock('sprite_hat_green_flag');
    const stop = w.newBlock('sprite_stop');
    stop.setFieldValue('others', 'TARGET');
    connectStack(hat, stop);
    const code = generateThreads(w)[0]!.code;
    expect(code).toContain("stop('others');\nreturn;");
    w.dispose();
  });
});

// ---------------------------------------------------------------------------
// T2 — table-driven coverage of every forBlock handler.
// For each entry we build `hat -> (carrier with the block wired in)` and assert
// generateThreads() emits the expected fragment. `kind` picks the carrier:
//   statement -> connected straight after the hat
//   number    -> nested in a `sprite_move` STEPS input (which follows the hat)
//   boolean   -> nested in a `sprite_if` COND input
//   text      -> nested in a `sprite_say` TEXT input
// ---------------------------------------------------------------------------

type Kind = 'statement' | 'number' | 'boolean' | 'text';

const CASES: { blockType: string; kind: Kind; expected: string }[] = [
  // motion
  { blockType: 'sprite_turn_right', kind: 'statement', expected: 'turnRight(' },
  { blockType: 'sprite_turn_left', kind: 'statement', expected: 'turnLeft(' },
  { blockType: 'sprite_goto_xy', kind: 'statement', expected: 'gotoXY(' },
  { blockType: 'sprite_change_x', kind: 'statement', expected: 'changeX(' },
  { blockType: 'sprite_change_y', kind: 'statement', expected: 'changeY(' },
  { blockType: 'sprite_point_direction', kind: 'statement', expected: 'pointInDirection(' },
  { blockType: 'sprite_glide', kind: 'statement', expected: 'glide(' },
  { blockType: 'sprite_bounce_edge', kind: 'statement', expected: 'bounceIfOnEdge()' },
  // looks
  { blockType: 'sprite_say', kind: 'statement', expected: 'say(' },
  { blockType: 'sprite_say_for', kind: 'statement', expected: 'sayForSecs(' },
  { blockType: 'sprite_say_clear', kind: 'statement', expected: 'sayClear()' },
  { blockType: 'sprite_switch_costume', kind: 'statement', expected: 'switchCostume(' },
  { blockType: 'sprite_next_costume', kind: 'statement', expected: 'nextCostume()' },
  { blockType: 'sprite_change_size', kind: 'statement', expected: 'changeSize(' },
  { blockType: 'sprite_set_size', kind: 'statement', expected: 'setSize(' },
  { blockType: 'sprite_show', kind: 'statement', expected: 'show()' },
  { blockType: 'sprite_hide', kind: 'statement', expected: 'hide()' },
  // control
  { blockType: 'sprite_wait', kind: 'statement', expected: 'wait(' },
  { blockType: 'sprite_repeat', kind: 'statement', expected: 'for (var' },
  { blockType: 'sprite_forever', kind: 'statement', expected: 'while (true)' },
  { blockType: 'sprite_if', kind: 'statement', expected: 'if (' },
  { blockType: 'sprite_if_else', kind: 'statement', expected: '} else {' },
  { blockType: 'sprite_wait_until', kind: 'statement', expected: 'while (!(' },
  { blockType: 'sprite_stop', kind: 'statement', expected: 'stop(' },
  { blockType: 'sprite_broadcast', kind: 'statement', expected: 'broadcast(' },
  { blockType: 'sprite_broadcast_wait', kind: 'statement', expected: 'broadcastAndWait(' },
  { blockType: 'sprite_sensing_reset_timer', kind: 'statement', expected: 'resetTimer()' },
  // operators — number
  { blockType: 'sprite_op_arith', kind: 'number', expected: ' + ' },
  { blockType: 'sprite_op_mod', kind: 'number', expected: ' % ' },
  { blockType: 'sprite_op_random', kind: 'number', expected: 'Math.random()' },
  { blockType: 'sprite_op_length', kind: 'number', expected: '.length' },
  { blockType: 'sprite_sensing_timer', kind: 'number', expected: 'timer()' },
  // operators — boolean
  { blockType: 'sprite_op_compare', kind: 'boolean', expected: 'cmp(' },
  { blockType: 'sprite_op_and', kind: 'boolean', expected: ' && ' },
  { blockType: 'sprite_op_or', kind: 'boolean', expected: ' || ' },
  { blockType: 'sprite_op_not', kind: 'boolean', expected: '!(' },
  { blockType: 'sprite_sensing_key', kind: 'boolean', expected: 'isKeyPressed(' },
  // operators — text
  { blockType: 'sprite_op_join', kind: 'text', expected: 'String(' },
  // variables
  { blockType: 'variables_get', kind: 'text', expected: 'getVar(' },
  { blockType: 'variables_set', kind: 'statement', expected: 'setVar(' },
  { blockType: 'math_change', kind: 'statement', expected: 'changeVar(' },
];

function buildCase(w: Blockly.Workspace, entry: (typeof CASES)[number]): void {
  const hat = w.newBlock('sprite_hat_green_flag');
  const block = w.newBlock(entry.blockType);

  if (entry.blockType === 'variables_get' || entry.blockType === 'variables_set') {
    const model = w.createVariable('skor');
    block.getField('VAR')!.setValue(model.getId());
  }
  if (entry.blockType === 'math_change') {
    const model = w.getVariable('skor') ?? w.createVariable('skor');
    block.getField('VAR')!.setValue(model.getId());
  }

  if (entry.kind === 'statement') {
    hat.nextConnection!.connect(block.previousConnection!);
    return;
  }
  const carrier =
    entry.kind === 'boolean'
      ? w.newBlock('sprite_if')
      : entry.kind === 'text'
        ? w.newBlock('sprite_say')
        : w.newBlock('sprite_move');
  const inputName = entry.kind === 'boolean' ? 'COND' : entry.kind === 'text' ? 'TEXT' : 'STEPS';
  hat.nextConnection!.connect(carrier.previousConnection!);
  carrier.getInput(inputName)!.connection!.connect(block.outputConnection!);
}

describe('generateThreads — every forBlock handler', () => {
  for (const entry of CASES) {
    it(`${entry.blockType} emits ${JSON.stringify(entry.expected)}`, () => {
      const w = ws();
      buildCase(w, entry);
      const code = generateThreads(w)[0]!.code;
      expect(code, `${entry.blockType} -> ${code}`).toContain(entry.expected);
      // ES5 guarantee: no arrow/async/await/let/const/backtick anywhere.
      expect(code).not.toMatch(/=>|\basync\b|\bawait\b|\blet\b|\bconst\b|`/);
      w.dispose();
    });
  }
});
