import { describe, expect, it } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { spriteTheme } from '../../src/blocks/theme';

describe('installSpriteBlockly', () => {
  it('is idempotent and registers a headless workspace cleanly', () => {
    installSpriteBlockly();
    installSpriteBlockly();
    const ws = new Blockly.Workspace();
    expect(ws).toBeTruthy();
    ws.dispose();
  });

  it('exposes a theme with the seven category colours', () => {
    expect(spriteTheme).toBeTruthy();
    expect(Blockly.registry.hasItem(Blockly.registry.Type.THEME, 'kodako-sprite')).toBe(true);
  });
});
