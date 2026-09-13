import './editor.css';
import type { Project } from '../../core/project';
import type { Storage } from '../../core/storage';
import { renderHeader } from './header';
import { renderHtmlMode } from './html-mode/html-mode';
import { renderHelpPanel } from '../help/help-panel';

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
      <div class="editor__workspace" data-workspace></div>
    </div>
  `;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const scheduleSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void storage.saveProject(id, project).catch((err) => console.error(err));
    }, AUTOSAVE_MS);
  };

  const helpPanel = renderHelpPanel(root);

  const workspaceEl = root.querySelector<HTMLElement>('[data-workspace]')!;
  const cleanupMode = renderHtmlMode(workspaceEl, {
    project,
    storage,
    markDirty: scheduleSave,
  });

  const cleanupHeader = renderHeader(root.querySelector<HTMLElement>('[data-header]')!, {
    name: project.meta.name,
    onNameChange: (name) => {
      if (!name || name === project.meta.name) return;
      project.meta.name = name;
      project.meta.updatedAt = new Date().toISOString();
      scheduleSave();
    },
    onBack: deps.onBack,
    onSave: () => void storage.saveProject(id, project).catch((err) => console.error(err)),
    onOpen: () => console.info('Buka project dari editor: menyusul pada fase berikutnya.'),
    onExport: () => void storage.exportToFile(project).catch((err) => console.error(err)),
    onHelp: () => helpPanel.open(),
  });

  return () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
      void storage.saveProject(id, project).catch((err) => console.error(err));
    }
    cleanupMode();
    cleanupHeader();
    helpPanel.dispose();
    root.innerHTML = '';
  };
}
