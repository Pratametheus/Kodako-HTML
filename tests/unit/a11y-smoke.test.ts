import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { createEmptyProject, type Project } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
import { renderEditor } from '../../src/app/editor/editor-view';
import { ProjectManager } from '../../src/app/home/project-manager';
import { renderHome } from '../../src/app/home/home-view';
import { setSpriteWorkspaceFactoryForTests } from '../../src/app/editor/sprite-mode/sprite-mode';

installSpriteBlockly();

class FakeStorage implements Storage {
  projects = new Map<string, Project>();
  summaries: ProjectSummary[] = [];
  async listProjects() {
    return this.summaries;
  }
  async loadProject(id: string) {
    const p = this.projects.get(id);
    if (!p) throw new Error('tidak ditemukan');
    return structuredClone(p);
  }
  async saveProject(id: string, project: Project) {
    this.projects.set(id, structuredClone(project));
    this.summaries = [
      { id, name: project.meta.name, updatedAt: project.meta.updatedAt, thumbnailDataUrl: null },
      ...this.summaries.filter((s) => s.id !== id),
    ];
  }
  async deleteProject() {}
  async importFromFile() {
    return createEmptyProject('Impor');
  }
  async exportToFile() {}
  async exportHtml() {}
}

function accessibleName(el: Element): string {
  const label = el.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const ref = el.ownerDocument.getElementById(labelledby);
    if (ref?.textContent?.trim()) return ref.textContent.trim();
  }
  return el.textContent?.trim() ?? '';
}

function inputHasLabel(input: HTMLInputElement): boolean {
  if (input.getAttribute('aria-label')?.trim()) return true;
  if (input.closest('label')) return true;
  const id = input.id;
  if (id && input.ownerDocument.querySelector(`label[for="${id}"]`)) return true;
  return false;
}

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
  setSpriteWorkspaceFactoryForTests(() => {
    const workspace = new Blockly.Workspace() as unknown as Blockly.WorkspaceSvg;
    workspace.highlightBlock = vi.fn();
    return workspace;
  });
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 20 })),
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,x');
});

afterEach(() => {
  setSpriteWorkspaceFactoryForTests(null);
  vi.restoreAllMocks();
  root.remove();
  document.body.innerHTML = '';
});

function mountEditor(): () => void {
  return renderEditor(root, {
    id: 'p1',
    project: createEmptyProject('A11y'),
    storage: new FakeStorage(),
    onBack: vi.fn(),
  });
}

describe('a11y smoke', () => {
  it('gives every editor button an accessible name', () => {
    const cleanup = mountEditor();
    const nameless = [...root.querySelectorAll('button')].filter(
      (button) => accessibleName(button).length === 0,
    );
    expect(nameless).toHaveLength(0);
    cleanup();
  });

  it('exposes the mode toggle as an ARIA tablist', () => {
    const cleanup = mountEditor();
    const modeButtons = [...root.querySelectorAll<HTMLElement>('[data-mode]')];
    expect(modeButtons.length).toBeGreaterThanOrEqual(2);
    for (const button of modeButtons) {
      expect(button.getAttribute('role')).toBe('tab');
      expect(button.getAttribute('aria-selected')).toBeTypeOf('string');
    }
    expect(modeButtons[0]!.parentElement!.getAttribute('role')).toBe('tablist');
    cleanup();
  });

  it('labels the stage canvas as an image', () => {
    const cleanup = mountEditor();
    const canvas = root.querySelector('canvas')!;
    expect((canvas.getAttribute('aria-label') ?? '').trim().length).toBeGreaterThan(0);
    expect(canvas.getAttribute('role')).toBe('img');
    cleanup();
  });

  it('associates a label with every sprite-panel input', () => {
    const cleanup = mountEditor();
    const inputs = [...root.querySelectorAll<HTMLInputElement>('[data-panel="sprite"] input')];
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) expect(inputHasLabel(input)).toBe(true);
    cleanup();
  });

  it('gives every Home project card an accessible name', async () => {
    const manager = new ProjectManager(new FakeStorage());
    await manager.create('Kartu Satu');
    await manager.create('Kartu Dua');
    const cleanup = renderHome(root, { manager, onOpen: vi.fn() });
    await new Promise((r) => setTimeout(r, 0));

    const cards = [...root.querySelectorAll('[data-card]')];
    expect(cards).toHaveLength(2);
    for (const card of cards) expect(accessibleName(card).length).toBeGreaterThan(0);
    cleanup();
  });
});
