import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../src/core/project';
import { createEmptyProject } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
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
  async deleteProject(id: string) {
    this.projects.delete(id);
    this.summaries = this.summaries.filter((s) => s.id !== id);
  }
  async importFromFile() {
    return createEmptyProject('Impor');
  }
  async exportToFile() {}
  async exportHtml() {}
}

let root: HTMLElement;
let storage: FakeStorage;
let manager: ProjectManager;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
  storage = new FakeStorage();
  manager = new ProjectManager(storage);
});

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

describe('renderHome', () => {
  it('shows the empty state when there are no projects', async () => {
    renderHome(root, { manager, onOpen: vi.fn() });
    await flush();
    expect(root.textContent).toContain('Belum ada project');
  });

  it('renders a card per project', async () => {
    await manager.create('Alpha');
    await manager.create('Beta');
    renderHome(root, { manager, onOpen: vi.fn() });
    await flush();
    expect(root.querySelectorAll('[data-card]')).toHaveLength(2);
    expect(root.textContent).toContain('Alpha');
    expect(root.textContent).toContain('Beta');
  });

  it('clicking "Project Baru" creates a project and calls onOpen', async () => {
    const onOpen = vi.fn();
    renderHome(root, { manager, onOpen });
    await flush();
    root.querySelector<HTMLButtonElement>('[data-action="new"]')!.click();
    await flush();
    expect(onOpen).toHaveBeenCalledOnce();
    expect(await manager.list()).toHaveLength(1);
  });

  it('clicking delete (confirmed) removes the card', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await manager.create('Hapus Aku');
    renderHome(root, { manager, onOpen: vi.fn() });
    await flush();
    root.querySelector<HTMLButtonElement>('[data-card] [data-action="delete"]')!.click();
    await flush();
    expect(root.querySelectorAll('[data-card]')).toHaveLength(0);
  });

  it('clicking "open" on a card calls onOpen with its id', async () => {
    const onOpen = vi.fn();
    const { id } = await manager.create('Buka Aku');
    renderHome(root, { manager, onOpen });
    await flush();
    root.querySelector<HTMLButtonElement>('[data-card] [data-action="open"]')!.click();
    expect(onOpen).toHaveBeenCalledWith(id);
  });
});
