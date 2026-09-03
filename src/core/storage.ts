import type { Project } from './project';

export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
  thumbnailDataUrl: string | null;
};

export interface Storage {
  listProjects(): Promise<ProjectSummary[]>;
  loadProject(id: string): Promise<Project>;
  saveProject(id: string, project: Project, thumbnailDataUrl?: string | null): Promise<void>;
  deleteProject(id: string): Promise<void>;
  importFromFile(): Promise<Project>;
  exportToFile(project: Project): Promise<void>;
  exportHtml(name: string, html: string): Promise<void>;
}

export const STORAGE_KEYS = {
  list: 'ghtml:projects',
  project: (id: string) => `ghtml:project:${id}`,
  tmp: (id: string) => `ghtml:project:${id}:tmp`,
} as const;

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

import { WebStorage } from './web-storage';
import { TauriStorage } from './tauri-storage';

export function getStorage(): Storage {
  return isTauri() ? new TauriStorage() : new WebStorage();
}
