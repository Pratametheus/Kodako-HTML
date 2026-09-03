import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProject, type Project } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
import { renderEditor } from '../../src/app/editor/editor-view';

class FakeStorage implements Storage {
  saved: Project[] = [];
  exported: Project[] = [];
  async listProjects(): Promise<ProjectSummary[]> {
    return [];
  }
  async loadProject(): Promise<Project> {
    throw new Error('unused');
  }
  async saveProject(_id: string, project: Project) {
    this.saved.push(structuredClone(project));
  }
  async deleteProject() {}
  async importFromFile(): Promise<Project> {
    throw new Error('unused');
  }
  async exportToFile(project: Project) {
    this.exported.push(project);
  }
  async exportHtml() {}
}

let root: HTMLElement;
let storage: FakeStorage;
let project: Project;

beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement('div');
  storage = new FakeStorage();
  project = createEmptyProject('Judul Awal');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('renderEditor', () => {
  it('shows the project name and the Phase 1 placeholder', () => {
    renderEditor(root, { id: 'p1', project, storage, onBack: vi.fn() });
    expect(root.querySelector<HTMLInputElement>('[data-name]')!.value).toBe('Judul Awal');
    expect(root.textContent).toContain('Area kerja akan diisi pada Fase 1.');
  });

  it('editing the name autosaves (debounced) with a bumped updatedAt', () => {
    renderEditor(root, { id: 'p1', project, storage, onBack: vi.fn() });
    const input = root.querySelector<HTMLInputElement>('[data-name]')!;
    input.value = 'Judul Baru';
    input.dispatchEvent(new Event('change'));
    expect(storage.saved).toHaveLength(0); // debounced
    vi.advanceTimersByTime(300);
    expect(storage.saved.at(-1)!.meta.name).toBe('Judul Baru');
  });

  it('the mode toggle updates activeMode and pressed state', () => {
    renderEditor(root, { id: 'p1', project, storage, onBack: vi.fn() });
    root.querySelector<HTMLButtonElement>('[data-mode="html"]')!.click();
    expect(root.querySelector('[data-mode="html"]')!.getAttribute('aria-pressed')).toBe('true');
    vi.advanceTimersByTime(300);
    expect(storage.saved.at(-1)!.activeMode).toBe('html');
  });

  it('Save writes immediately; Ekspor calls exportToFile; Kembali calls onBack', () => {
    const onBack = vi.fn();
    renderEditor(root, { id: 'p1', project, storage, onBack });
    root.querySelector<HTMLButtonElement>('[data-save]')!.click();
    expect(storage.saved).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('[data-export]')!.click();
    expect(storage.exported).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('[data-back]')!.click();
    expect(onBack).toHaveBeenCalledOnce();
  });
});
