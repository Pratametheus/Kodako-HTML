import './editor.css';
import type { Project } from '../../core/project';
import type { Storage } from '../../core/storage';
import { renderHeader, type EditorMode } from './header';
import { renderHtmlMode } from './html-mode/html-mode';
import { renderSpriteMode } from './sprite-mode/sprite-mode';
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
  const getThumbnail: { current: (() => string | undefined) | null } = { current: null };
  const scheduleSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void storage
        .saveProject(id, project, getThumbnail.current?.())
        .catch((err) => console.error(err));
    }, AUTOSAVE_MS);
  };

  const helpPanel = renderHelpPanel(root);

  const workspaceEl = root.querySelector<HTMLElement>('[data-workspace]')!;
  let cleanupMode: (() => void) | undefined;
  const renderMode = (): void => {
    cleanupMode?.();
    cleanupMode = undefined;
    if (project.activeMode === 'sprite') {
      workspaceEl.textContent = '';
      cleanupMode = renderSpriteMode(workspaceEl, {
        project,
        markDirty: scheduleSave,
        getThumbnail,
      });
    } else {
      workspaceEl.textContent = '';
      cleanupMode = renderHtmlMode(workspaceEl, {
        project,
        storage,
        markDirty: scheduleSave,
      });
    }
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
      cleanupMode?.();
      cleanupMode = undefined;
      project.activeMode = mode;
      project.meta.updatedAt = new Date().toISOString();
      renderMode();
      scheduleSave();
    },
    onBack: deps.onBack,
    onSave: () =>
      void storage
        .saveProject(id, project, getThumbnail.current?.())
        .catch((err) => console.error(err)),
    onOpen: () => console.info('Buka project dari editor: menyusul pada fase berikutnya.'),
    onExport: () => void storage.exportToFile(project).catch((err) => console.error(err)),
    onHelp: () => helpPanel.open(),
  });

  renderMode();

  return () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
      void storage
        .saveProject(id, project, getThumbnail.current?.())
        .catch((err) => console.error(err));
    }
    cleanupMode?.();
    cleanupHeader();
    helpPanel.dispose();
    root.innerHTML = '';
  };
}
