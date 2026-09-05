import { describe, expect, it, vi } from 'vitest';
import { Blockly, installHtmlBlockly, installSpriteBlockly } from '../../src/blocks';
import {
  __htmlModeHandle,
  renderHtmlMode,
  setHtmlWorkspaceFactoryForTests,
} from '../../src/app/editor/html-mode/html-mode';
import { htmlWorkspaceJson, withHtmlWorkspace } from '../../src/core/html-project';
import { createEmptyProject, type Project } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
import { spriteWorkspaceJson, withSpriteWorkspace } from '../../src/core/sprite-project';
import { WebStorage } from '../../src/core/web-storage';

installSpriteBlockly();
installHtmlBlockly();

class FakeStorage implements Storage {
  async listProjects(): Promise<ProjectSummary[]> {
    return [];
  }
  async loadProject(): Promise<Project> {
    throw new Error('tidak dipakai');
  }
  async saveProject(): Promise<void> {}
  async deleteProject(): Promise<void> {}
  async importFromFile(): Promise<Project> {
    throw new Error('tidak dipakai');
  }
  async exportToFile(): Promise<void> {}
  async exportHtml(): Promise<void> {}
}

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
    const paragraph = htmlWorkspace.newBlock('html_paragraph');
    const text = htmlWorkspace.newBlock('html_text');
    text.setFieldValue('Halo', 'VALUE');
    paragraph.getInput('TEXT')?.connection?.connect(text.outputConnection!);
    project = withHtmlWorkspace(project, Blockly.serialization.workspaces.save(htmlWorkspace));
    htmlWorkspace.dispose();

    const storage = new WebStorage();
    await storage.saveProject('dua-mode', project);
    const reloaded = await storage.loadProject('dua-mode');

    expect(JSON.stringify(spriteWorkspaceJson(reloaded.sprite.sprites[0]!))).toContain(
      'sprite_move',
    );
    const htmlJson = JSON.stringify(htmlWorkspaceJson(reloaded));
    expect(htmlJson).not.toContain('html_page');
    expect(htmlJson).toContain('html_paragraph');
  });

  it('migrates a stored legacy html_page workspace on load', () => {
    setHtmlWorkspaceFactoryForTests(
      () => new Blockly.Workspace() as unknown as Blockly.WorkspaceSvg,
    );
    try {
      const project = createEmptyProject('Legacy');
      project.html.workspace = {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_page',
              x: 20,
              y: 20,
              inputs: {
                BODY: {
                  block: {
                    type: 'html_paragraph',
                    inputs: {
                      TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Halo' } } },
                    },
                  },
                },
              },
            },
          ],
        },
      };

      const host = document.createElement('div');
      const cleanup = renderHtmlMode(host, {
        project,
        storage: new FakeStorage(),
        markDirty: vi.fn(),
      });
      const blocks = __htmlModeHandle.current!.workspace.getAllBlocks(false);
      expect(blocks.some((b) => b.type === 'html_page')).toBe(false);
      expect(blocks.some((b) => b.type === 'html_paragraph')).toBe(true);
      cleanup();
    } finally {
      setHtmlWorkspaceFactoryForTests(null);
    }
  });
});
