import { afterEach, describe, expect, it } from 'vitest';
import {
  Blockly,
  generateThreads,
  installSpriteBlockly,
  setSensingTargetsProvider,
  setSoundOptionsProvider,
} from '../../src/blocks';
import { SPRITE_BLOCK_TYPES } from '../../src/blocks/sprite/blocks';

installSpriteBlockly();

const NEW_TYPES = [
  'sound_play',
  'sound_play_until_done',
  'sound_stop_all',
  'sound_change_volume',
  'sound_set_volume',
  'sensing_touching',
  'sensing_touching_color',
  'sensing_mouse_down',
  'sensing_mouse_x',
  'sensing_mouse_y',
  'sensing_distance_to',
  'sensing_ask',
  'sensing_answer',
] as const;

const workspaces: Blockly.Workspace[] = [];

function workspace(): Blockly.Workspace {
  const created = new Blockly.Workspace();
  workspaces.push(created);
  return created;
}

function codeForStatement(type: string, configure?: (block: Blockly.Block) => void): string {
  const ws = workspace();
  const hat = ws.newBlock('sprite_hat_green_flag');
  const block = ws.newBlock(type);
  configure?.(block);
  hat.nextConnection!.connect(block.previousConnection!);
  return generateThreads(ws)[0]!.code;
}

function codeForReporter(type: string, configure?: (block: Blockly.Block) => void): string {
  const ws = workspace();
  const hat = ws.newBlock('sprite_hat_green_flag');
  const say = ws.newBlock('sprite_say');
  const reporter = ws.newBlock(type);
  configure?.(reporter);
  say.getInput('TEXT')!.connection!.connect(reporter.outputConnection!);
  hat.nextConnection!.connect(say.previousConnection!);
  return generateThreads(ws)[0]!.code;
}

afterEach(() => {
  workspaces.splice(0).forEach((ws) => ws.dispose());
  setSoundOptionsProvider(() => [['(tidak ada suara)', '']]);
  setSensingTargetsProvider(() => []);
});

describe('sound and full sensing blocks', () => {
  it('registers every new block type and constructs each headlessly', () => {
    const ws = workspace();
    for (const type of NEW_TYPES) {
      expect(SPRITE_BLOCK_TYPES).toContain(type);
      expect(Blockly.Blocks[type]).toBeTruthy();
      expect(ws.newBlock(type).type).toBe(type);
    }
  });

  it('uses dynamic sound and sensing target providers', () => {
    setSoundOptionsProvider(() => [['Pop', 'builtin:snd-pop']]);
    setSensingTargetsProvider(() => [['Sprite 2', 'Sprite 2']]);
    const ws = workspace();
    const sound = ws.newBlock('sound_play');
    const touching = ws.newBlock('sensing_touching');
    const distance = ws.newBlock('sensing_distance_to');

    expect((sound.getField('SOUND') as Blockly.FieldDropdown).getOptions(false)).toEqual([
      ['Pop', 'builtin:snd-pop'],
    ]);
    expect((touching.getField('TARGET') as Blockly.FieldDropdown).getOptions(false)).toEqual([
      ['tepi', 'edge'],
      ['pointer mouse', 'pointer'],
      ['Sprite 2', 'Sprite 2'],
    ]);
    expect((distance.getField('TARGET') as Blockly.FieldDropdown).getOptions(false)).toEqual([
      ['pointer mouse', 'pointer'],
      ['Sprite 2', 'Sprite 2'],
    ]);
  });

  it('generates the representative sound, edge, ask, and answer program as synchronous ES5', () => {
    setSoundOptionsProvider(() => [['Pop', 'builtin:snd-pop']]);
    const ws = workspace();
    const hat = ws.newBlock('sprite_hat_green_flag');
    const play = ws.newBlock('sound_play');
    play.setFieldValue('builtin:snd-pop', 'SOUND');
    const conditional = ws.newBlock('sprite_if');
    const touching = ws.newBlock('sensing_touching');
    touching.setFieldValue('edge', 'TARGET');
    conditional.getInput('COND')!.connection!.connect(touching.outputConnection!);
    conditional
      .getInput('DO')!
      .connection!.connect(ws.newBlock('sound_stop_all').previousConnection!);
    const ask = ws.newBlock('sensing_ask');
    const question = ws.newBlock('text');
    question.setFieldValue('Nama?', 'TEXT');
    ask.getInput('TEXT')!.connection!.connect(question.outputConnection!);
    const say = ws.newBlock('sprite_say');
    say.getInput('TEXT')!.connection!.connect(ws.newBlock('sensing_answer').outputConnection!);
    hat.nextConnection!.connect(play.previousConnection!);
    play.nextConnection!.connect(conditional.previousConnection!);
    conditional.nextConnection!.connect(ask.previousConnection!);
    ask.nextConnection!.connect(say.previousConnection!);

    const code = generateThreads(ws)[0]!.code;
    expect(code).toContain('playSound("builtin:snd-pop");');
    expect(code).toContain('isTouching("edge")');
    expect(code).toContain('stopAllSounds();');
    expect(code).toContain('ask("Nama?");');
    expect(code).toContain('answer()');
    expect(code).not.toMatch(/=>|\basync\b|\bawait\b|\blet\b|\bconst\b|`/);
  });

  it.each([
    ['sound_play_until_done', 'playSoundUntilDone("");'],
    ['sound_stop_all', 'stopAllSounds();'],
    ['sound_change_volume', 'changeVolume(0);'],
    ['sound_set_volume', 'setVolume(0);'],
    ['sensing_ask', "ask('');"],
  ])('generates %s command', (type, expected) => {
    expect(codeForStatement(type)).toContain(expected);
  });

  it.each([
    ['sensing_touching', 'isTouching("edge")'],
    ['sensing_touching_color', 'isTouchingColor("#e53935")'],
    ['sensing_mouse_down', 'isMouseDown()'],
    ['sensing_mouse_x', 'mouseX()'],
    ['sensing_mouse_y', 'mouseY()'],
    ['sensing_distance_to', 'distanceTo("pointer")'],
    ['sensing_answer', 'answer()'],
  ])('generates %s reporter', (type, expected) => {
    expect(codeForReporter(type)).toContain(expected);
  });
});
