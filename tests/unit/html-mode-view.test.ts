import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blockly, installHtmlBlockly } from '../../src/blocks';
import {
  __htmlModeHandle,
  renderHtmlMode,
  setHtmlWorkspaceFactoryForTests,
} from '../../src/app/editor/html-mode/html-mode';
import { createEmptyProject, type Project } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';

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

function addTextElement(workspace: Blockly.Workspace, type: string, value: string): void {
  const page = workspace.getBlocksByType('html_page', false)[0]!;
  const element = workspace.newBlock(type);
  const text = workspace.newBlock('html_text');
  text.setFieldValue(value, 'VALUE');
  element.getInput('TEXT')?.connection?.connect(text.outputConnection!);
  page.getInput('BODY')?.connection?.connect(element.previousConnection!);
}

describe('HTML mode view', () => {
  beforeEach(() => {
    setHtmlWorkspaceFactoryForTests(() => {
      return new Blockly.Workspace() as unknown as Blockly.WorkspaceSvg;
    });
  });

  afterEach(() => {
    setHtmlWorkspaceFactoryForTests(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('mounts Blockly, secure preview, tabs, and export controls', () => {
    const host = document.createElement('div');
    const cleanup = renderHtmlMode(host, {
      project: createEmptyProject('X'),
      storage: new FakeStorage(),
      markDirty: vi.fn(),
    });

    expect(host.querySelector('#htmlBlocklyDiv')).toBeTruthy();
    const iframe = host.querySelector('iframe')!;
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-scripts');
    expect(host.querySelector('[data-tab="preview"]')).toBeTruthy();
    expect(host.querySelector('[data-tab="code"]')).toBeTruthy();
    expect(host.querySelector('[data-export-html]')).toBeTruthy();
    cleanup();
  });

  it('persists a non-UI workspace change and marks the project dirty', () => {
    const host = document.createElement('div');
    const project = createEmptyProject('X');
    const markDirty = vi.fn();
    const cleanup = renderHtmlMode(host, { project, storage: new FakeStorage(), markDirty });
    const workspace = __htmlModeHandle.current!.workspace;

    addTextElement(workspace, 'html_paragraph', 'Halo');
    workspace.fireChangeListener({ isUiEvent: false } as Blockly.Events.Abstract);

    expect(markDirty).toHaveBeenCalled();
    expect(JSON.stringify(project.html.workspace)).toContain('html_paragraph');
    cleanup();
  });

  it('shows generated code for blocks in the workspace', () => {
    const host = document.createElement('div');
    const cleanup = renderHtmlMode(host, {
      project: createEmptyProject('X'),
      storage: new FakeStorage(),
      markDirty: vi.fn(),
    });
    const workspace = __htmlModeHandle.current!.workspace;
    addTextElement(workspace, 'html_paragraph', 'Halo');
    workspace.fireChangeListener({ isUiEvent: false } as Blockly.Events.Abstract);

    host.querySelector<HTMLButtonElement>('[data-tab="code"]')!.click();

    expect(host.querySelector<HTMLElement>('[data-panel="code"]')!.hidden).toBe(false);
    expect(host.querySelector('[data-panel="code"]')?.textContent).toContain('<p>Halo</p>');
    cleanup();
  });

  it('refreshes preview and code with styles on every wrapped sibling', () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    const cleanup = renderHtmlMode(host, {
      project: createEmptyProject('X'),
      storage: new FakeStorage(),
      markDirty: vi.fn(),
    });
    const workspace = __htmlModeHandle.current!.workspace;
    const page = workspace.getBlocksByType('html_page', false)[0]!;
    const bold = workspace.newBlock('html_style_bold');
    const first = workspace.newBlock('html_paragraph');
    const second = workspace.newBlock('html_paragraph');
    const firstText = workspace.newBlock('html_text');
    const secondText = workspace.newBlock('html_text');
    firstText.setFieldValue('A', 'VALUE');
    secondText.setFieldValue('B', 'VALUE');
    first.getInput('TEXT')?.connection?.connect(firstText.outputConnection!);
    second.getInput('TEXT')?.connection?.connect(secondText.outputConnection!);
    first.nextConnection?.connect(second.previousConnection!);
    bold.getInput('BODY')?.connection?.connect(first.previousConnection!);
    page.getInput('BODY')?.connection?.connect(bold.previousConnection!);

    workspace.fireChangeListener({ isUiEvent: false } as Blockly.Events.Abstract);
    vi.advanceTimersByTime(300);

    const styledSecond = '<p style="font-weight:bold">B</p>';
    expect(host.querySelector<HTMLIFrameElement>('iframe')!.srcdoc).toContain(styledSecond);
    expect(host.querySelector('[data-panel="code"]')?.textContent).toContain(styledSecond);
    cleanup();
  });

  it('exports the current generated page', async () => {
    const host = document.createElement('div');
    const project = createEmptyProject('Halaman Uji');
    const storage = new FakeStorage();
    const cleanup = renderHtmlMode(host, { project, storage, markDirty: vi.fn() });
    const workspace = __htmlModeHandle.current!.workspace;
    addTextElement(workspace, 'html_paragraph', 'Isi ekspor');
    workspace.fireChangeListener({ isUiEvent: false } as Blockly.Events.Abstract);

    host.querySelector<HTMLButtonElement>('[data-export-html]')!.click();

    await vi.waitFor(() => expect(storage.exported).toHaveLength(1));
    expect(storage.exported[0]?.name).toBe(project.meta.name);
    expect(storage.exported[0]?.html).toContain('<p>Isi ekspor</p>');
    cleanup();
  });

  it('preserves blocks across cleanup and remount, then disposes fully', () => {
    const project = createEmptyProject('X');
    const host = document.createElement('div');
    const deps = { project, storage: new FakeStorage(), markDirty: vi.fn() };
    const firstCleanup = renderHtmlMode(host, deps);
    addTextElement(__htmlModeHandle.current!.workspace, 'html_heading', 'Judul');
    firstCleanup();

    const secondCleanup = renderHtmlMode(host, deps);
    expect(
      __htmlModeHandle
        .current!.workspace.getAllBlocks(false)
        .some((block) => block.type === 'html_heading'),
    ).toBe(true);
    secondCleanup();

    expect(host.innerHTML).toBe('');
    expect(__htmlModeHandle.current).toBeNull();
  });
});
