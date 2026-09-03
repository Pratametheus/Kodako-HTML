import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProject, type Project } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
import { ProjectManager } from '../../src/app/home/project-manager';

class FakeStorage implements Storage {
  projects = new Map<string, Project>();
  summaries = new Map<string, ProjectSummary>();
  exported: Project[] = [];
  importPayload: Project | null = null;

  async listProjects() {
    return [...this.summaries.values()];
  }
  async loadProject(id: string) {
    const p = this.projects.get(id);
    if (!p) throw new Error('tidak ditemukan');
    return structuredClone(p);
  }
  async saveProject(id: string, project: Project, thumb: string | null = null) {
    this.projects.set(id, structuredClone(project));
    this.summaries.set(id, {
      id,
      name: project.meta.name,
      updatedAt: project.meta.updatedAt,
      thumbnailDataUrl: thumb,
    });
  }
  async deleteProject(id: string) {
    this.projects.delete(id);
    this.summaries.delete(id);
  }
  async importFromFile() {
    if (!this.importPayload) throw new Error('batal');
    return structuredClone(this.importPayload);
  }
  async exportToFile(project: Project) {
    this.exported.push(project);
  }
  async exportHtml() {}
}

let storage: FakeStorage;
let manager: ProjectManager;

beforeEach(() => {
  storage = new FakeStorage();
  manager = new ProjectManager(storage);
});

describe('ProjectManager', () => {
  it('create() adds exactly one listed project', async () => {
    await manager.create('Latihan');
    const list = await manager.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe('Latihan');
  });

  it('create() with no name uses the default Indonesian name', async () => {
    const { project } = await manager.create();
    expect(project.meta.name).toBe('Project Tanpa Nama');
  });

  it('rename() changes the summary name and bumps updatedAt', async () => {
    const { id, project } = await manager.create('Awal');
    await manager.rename(id, 'Baru');
    const list = await manager.list();
    expect(list[0]!.name).toBe('Baru');
    expect(list[0]!.updatedAt >= project.meta.updatedAt).toBe(true);
  });

  it('duplicate() creates a second, distinct project with the (salinan) suffix', async () => {
    const { id } = await manager.create('Asli');
    const dup = await manager.duplicate(id);
    expect(dup.id).not.toBe(id);
    expect(dup.project.meta.name).toBe('Asli (salinan)');
    expect(await manager.list()).toHaveLength(2);
  });

  it('remove() deletes the project', async () => {
    const { id } = await manager.create('X');
    await manager.remove(id);
    expect(await manager.list()).toHaveLength(0);
  });

  it('openFromFile() saves the imported project under a fresh id', async () => {
    storage.importPayload = createEmptyProject('Dari File');
    const { id, project } = await manager.openFromFile();
    expect(id).toMatch(/^proj_/);
    expect(project.meta.name).toBe('Dari File');
    expect(await manager.list()).toHaveLength(1);
  });

  it('exportToFile() hands the loaded project to storage', async () => {
    const { id } = await manager.create('Ekspor');
    await manager.exportToFile(id);
    expect(storage.exported).toHaveLength(1);
    expect(storage.exported[0]!.meta.name).toBe('Ekspor');
  });
});
