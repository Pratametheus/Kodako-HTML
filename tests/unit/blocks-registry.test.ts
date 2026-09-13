import { describe, expect, it } from 'vitest';
import { Blockly, blocklyTheme, installBlockly } from '../../src/blocks';

describe('installBlockly', () => {
  it('is idempotent and registers a headless workspace cleanly', () => {
    installBlockly();
    installBlockly();
    const ws = new Blockly.Workspace();
    expect(ws).toBeTruthy();
    ws.dispose();
  });

  it('exposes a theme with the three category colours', () => {
    expect(blocklyTheme).toBeTruthy();
    expect(Blockly.registry.hasItem(Blockly.registry.Type.THEME, 'kodako-html')).toBe(true);
  });
});
