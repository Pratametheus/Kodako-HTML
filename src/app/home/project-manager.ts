import { t } from '../i18n';
import { newId } from '../../core/ids';
import { createEmptyProject, type Project } from '../../core/project';
import type { ProjectSummary, Storage } from '../../core/storage';

export type OpenedProject = { id: string; project: Project };

export class ProjectManager {
  constructor(private readonly storage: Storage) {}

  list(): Promise<ProjectSummary[]> {
    return this.storage.listProjects();
  }

  async create(name?: string): Promise<OpenedProject> {
    const id = newId('proj');
    const project = createEmptyProject(name ?? t('home.newProjectName'));
    await this.storage.saveProject(id, project);
    return { id, project };
  }

  async rename(id: string, name: string): Promise<void> {
    const project = await this.storage.loadProject(id);
    project.meta.name = name;
    project.meta.updatedAt = new Date().toISOString();
    await this.storage.saveProject(id, project);
  }

  async duplicate(id: string): Promise<OpenedProject> {
    const source = await this.storage.loadProject(id);
    const now = new Date().toISOString();
    const project: Project = structuredClone(source);
    project.meta.name = `${source.meta.name} ${t('home.copySuffix')}`;
    project.meta.createdAt = now;
    project.meta.updatedAt = now;
    const newProjectId = newId('proj');
    await this.storage.saveProject(newProjectId, project);
    return { id: newProjectId, project };
  }

  remove(id: string): Promise<void> {
    return this.storage.deleteProject(id);
  }

  async openFromFile(): Promise<OpenedProject> {
    const project = await this.storage.importFromFile();
    const id = newId('proj');
    await this.storage.saveProject(id, project);
    return { id, project };
  }

  async exportToFile(id: string): Promise<void> {
    const project = await this.storage.loadProject(id);
    await this.storage.exportToFile(project);
  }
}
