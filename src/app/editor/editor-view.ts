import './editor.css';
import { t } from '../i18n';
import type { Project } from '../../core/project';
import type { Storage } from '../../core/storage';
import { renderHeader, type EditorMode } from './header';

export type EditorDeps = {
  id: string;
  project: Project;
  storage: Storage;
  onBack: () => void;
};

const AUTOSAVE_MS = 300;

export function renderEditor(root: HTMLElement, deps: EditorDeps): () => void {
  const { id, project, storage } = deps;

  root.innerHTML = `
    <div class="editor">
      <div data-header></div>
      <div class="editor__workspace" data-workspace>${t('editor.workspacePlaceholder')}</div>
    </div>
  `;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const scheduleSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void storage.saveProject(id, project), AUTOSAVE_MS);
  };

  const cleanupHeader = renderHeader(root.querySelector<HTMLElement>('[data-header]')!, {
    name: project.meta.name,
    mode: project.activeMode,
    onNameChange: (name) => {
      if (!name || name === project.meta.name) return;
      project.meta.name = name;
      project.meta.updatedAt = new Date().toISOString();
      scheduleSave();
    },
    onModeChange: (mode: EditorMode) => {
      project.activeMode = mode;
      project.meta.updatedAt = new Date().toISOString();
      scheduleSave();
    },
    onBack: deps.onBack,
    onSave: () => void storage.saveProject(id, project),
    onOpen: () => console.info('Buka project dari editor: menyusul pada fase berikutnya.'),
    onExport: () => void storage.exportToFile(project),
  });

  return () => {
    if (timer) clearTimeout(timer);
    cleanupHeader();
    root.innerHTML = '';
  };
}
