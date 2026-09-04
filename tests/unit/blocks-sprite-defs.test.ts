import { describe, expect, it } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { SPRITE_BLOCK_TYPES } from '../../src/blocks/sprite/blocks';
import { spriteToolbox } from '../../src/blocks/sprite/toolbox';

installSpriteBlockly();

describe('sprite block definitions', () => {
  it('registers every declared block type', () => {
    for (const type of SPRITE_BLOCK_TYPES) {
      expect(Blockly.Blocks[type], `missing block ${type}`).toBeTruthy();
    }
  });

  it('every block instantiates on a headless workspace without throwing', () => {
    const ws = new Blockly.Workspace();
    for (const type of SPRITE_BLOCK_TYPES) {
      const b = ws.newBlock(type);
      expect(b.type).toBe(type);
    }
    ws.dispose();
  });

  it('captions are Bahasa Indonesia (spot check)', () => {
    const ws = new Blockly.Workspace();
    const move = ws.newBlock('sprite_move');
    // message0 like "gerak %1 langkah"
    // NOTE: brief used JSON.stringify(move.inputList); in Blockly 11.2.2 an Input
    // holds a back-reference to its source block, so that throws
    // "Converting circular structure to JSON". Serialise the field text instead
    // (same intent: the caption contains the Bahasa Indonesia word "langkah").
    const caption = move.inputList
      .flatMap((input) => input.fieldRow.map((field) => field.getText()))
      .join(' ');
    expect(caption).toMatch(/langkah/);
    ws.dispose();
  });

  it('toolbox references the seven category styles', () => {
    const json = JSON.stringify(spriteToolbox);
    for (const c of ['events', 'motion', 'looks', 'control', 'operators', 'sensing', 'variables']) {
      expect(json).toContain(`${c}_category`);
    }
  });
});
