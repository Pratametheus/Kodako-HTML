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
});
