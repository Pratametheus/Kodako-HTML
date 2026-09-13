import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProject, type Project } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
import { renderEditor } from '../../src/app/editor/editor-view';
import { ProjectManager } from '../../src/app/home/project-manager';
import { renderHome } from '../../src/app/home/home-view';

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

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
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
