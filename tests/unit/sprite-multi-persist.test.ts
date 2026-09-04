import { beforeEach, describe, expect, it } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { createEmptyProject } from '../../src/core/project';
import { addSprite, withSpriteWorkspace } from '../../src/core/sprite-project';
import { WebStorage } from '../../src/core/web-storage';

installSpriteBlockly();
beforeEach(() => localStorage.clear());

/** A minimal real Blockly workspace JSON: green-flag hat followed by one block. */
function scriptWith(blockType: string): Record<string, unknown> {
  const w = new Blockly.Workspace();
  const hat = w.newBlock('sprite_hat_green_flag');
  const block = w.newBlock(blockType);
  hat.nextConnection!.connect(block.previousConnection!);
  const json = Blockly.serialization.workspaces.save(w) as Record<string, unknown>;
  w.dispose();
  return json;
}

describe('multi-sprite persist + reload', () => {
  it('round-trips two sprites with distinct scripts through WebStorage', async () => {
    let project = createEmptyProject('Multi');
    const firstId = project.sprite.sprites[0]!.id;
    const added = addSprite(project, 'Sprite 2');
    project = added.project;
    const secondId = added.spriteId;

    project = withSpriteWorkspace(project, firstId, scriptWith('sprite_move'));
    project = withSpriteWorkspace(project, secondId, scriptWith('sprite_turn_right'));

    const storage = new WebStorage();
    await storage.saveProject('proj_multi', project);
    const reloaded = await storage.loadProject('proj_multi');

    expect(reloaded.sprite.sprites).toHaveLength(2);

    const script0 = JSON.stringify(reloaded.sprite.sprites[0]!.script);
    const script1 = JSON.stringify(reloaded.sprite.sprites[1]!.script);
    expect(script0).toContain('sprite_move');
    expect(script0).not.toContain('sprite_turn_right');
    expect(script1).toContain('sprite_turn_right');
    expect(script1).not.toContain('sprite_move');
    expect(reloaded.sprite.sprites[0]!.script).not.toEqual(reloaded.sprite.sprites[1]!.script);
  });
});
