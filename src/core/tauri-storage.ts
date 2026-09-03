import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { parseProjectText, serializeProject, type Project } from './project';
import type { ProjectSummary, Storage } from './storage';
import { WebStorage } from './web-storage';

export class TauriStorage implements Storage {
  private local = new WebStorage();

  listProjects(): Promise<ProjectSummary[]> {
    return this.local.listProjects();
  }
  loadProject(id: string): Promise<Project> {
    return this.local.loadProject(id);
  }
  saveProject(id: string, project: Project, thumbnailDataUrl: string | null = null): Promise<void> {
    return this.local.saveProject(id, project, thumbnailDataUrl);
  }
  deleteProject(id: string): Promise<void> {
    return this.local.deleteProject(id);
  }

  async importFromFile(): Promise<Project> {
    const picked = await open({
      multiple: false,
      filters: [{ name: 'Project Game HTML', extensions: ['json', 'ghtml.json'] }],
    });
    if (typeof picked !== 'string') throw new Error('Tidak ada file yang dipilih.');
    const text = await readTextFile(picked);
    const res = parseProjectText(text);
    if (!res.ok) throw new Error(`File project tidak valid: ${res.errors.join(' ')}`);
    return res.project;
  }

  async exportToFile(project: Project): Promise<void> {
    const path = await save({
      defaultPath: `${project.meta.name}.ghtml.json`,
      filters: [{ name: 'Project Game HTML', extensions: ['ghtml.json'] }],
    });
    if (!path) return;
    await writeTextFile(path, serializeProject(project));
  }

  async exportHtml(name: string, html: string): Promise<void> {
    const path = await save({
      defaultPath: `${name}.html`,
      filters: [{ name: 'Halaman Web', extensions: ['html'] }],
    });
    if (!path) return;
    await writeTextFile(path, html);
  }
}
