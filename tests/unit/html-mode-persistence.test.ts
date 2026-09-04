import { describe, expect, it } from 'vitest';
import { Blockly, installHtmlBlockly, installSpriteBlockly } from '../../src/blocks';
import { htmlWorkspaceJson, withHtmlWorkspace } from '../../src/core/html-project';
import { createEmptyProject } from '../../src/core/project';
import { spriteWorkspaceJson, withSpriteWorkspace } from '../../src/core/sprite-project';
import { WebStorage } from '../../src/core/web-storage';

installSpriteBlockly();
installHtmlBlockly();

describe('Sprite and HTML mode persistence', () => {
  it('round-trips both workspaces without either mode clobbering the other', async () => {
    let project = createEmptyProject('Dua Mode');
    const spriteId = project.sprite.sprites[0]!.id;

    const spriteWorkspace = new Blockly.Workspace();
    spriteWorkspace.newBlock('sprite_move');
    project = withSpriteWorkspace(
      project,
      spriteId,
      Blockly.serialization.workspaces.save(spriteWorkspace),
    );
    spriteWorkspace.dispose();

    project.activeMode = 'html';
    const htmlWorkspace = new Blockly.Workspace();
    const page = htmlWorkspace.newBlock('html_page');
    const paragraph = htmlWorkspace.newBlock('html_paragraph');
    const text = htmlWorkspace.newBlock('html_text');
    text.setFieldValue('Halo', 'VALUE');
    paragraph.getInput('TEXT')?.connection?.connect(text.outputConnection!);
    page.getInput('BODY')?.connection?.connect(paragraph.previousConnection!);
    project = withHtmlWorkspace(project, Blockly.serialization.workspaces.save(htmlWorkspace));
    htmlWorkspace.dispose();

    const storage = new WebStorage();
    await storage.saveProject('dua-mode', project);
    const reloaded = await storage.loadProject('dua-mode');

    expect(JSON.stringify(spriteWorkspaceJson(reloaded.sprite.sprites[0]!))).toContain(
      'sprite_move',
    );
    const htmlJson = JSON.stringify(htmlWorkspaceJson(reloaded));
    expect(htmlJson).toContain('html_page');
    expect(htmlJson).toContain('html_paragraph');
  });
});
