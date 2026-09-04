import { describe, expect, it } from 'vitest';
import { Blockly, installHtmlBlockly } from '../../src/blocks';
import { createEmptyProject, type Project } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
import { buildStandaloneDocument, exportHtmlProject } from '../../src/runtime/html/export';

installHtmlBlockly();

class FakeStorage implements Storage {
  exported: { name: string; html: string }[] = [];

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
  async exportHtml(name: string, html: string): Promise<void> {
    this.exported.push({ name, html });
  }
}

function projectWithParagraph(text: string): Project {
  const workspace = new Blockly.Workspace();
  const page = workspace.newBlock('html_page');
  const paragraph = workspace.newBlock('html_paragraph');
  const value = workspace.newBlock('html_text');
  value.setFieldValue(text, 'VALUE');
  paragraph.getInput('TEXT')?.connection?.connect(value.outputConnection!);
  page.getInput('BODY')?.connection?.connect(paragraph.previousConnection!);
  const project = createEmptyProject('Halaman Saya');
  project.html.workspace = Blockly.serialization.workspaces.save(workspace);
  workspace.dispose();
  return project;
}

describe('standalone HTML export', () => {
  it('builds a complete document', () => {
    const html = buildStandaloneDocument('Judul', '<p>hi</p>', {});
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>Judul</title>');
    expect(html).toContain('<p>hi</p>');
    expect(html).toContain(
      "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'none'; object-src 'none'; base-uri 'none'\">",
    );
  });

  it('inlines embedded image assets', () => {
    const html = buildStandaloneDocument('Judul', '<img src="asset:x">', {
      x: { ref: 'data:image/png;base64,AAA' },
    });
    expect(html).toContain('src="data:image/png;base64,AAA"');
    expect(html).not.toContain('asset:');
  });

  it('generates and exports the project workspace once', async () => {
    const project = projectWithParagraph('Hai');
    const storage = new FakeStorage();

    await exportHtmlProject(project, storage);

    expect(storage.exported).toHaveLength(1);
    expect(storage.exported[0]?.name).toBe(project.meta.name);
    expect(storage.exported[0]?.html).toContain('<p>Hai</p>');
  });
});
