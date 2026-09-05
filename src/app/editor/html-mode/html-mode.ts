import './html-mode.css';
import {
  Blockly,
  generateHtml,
  htmlToolbox,
  installHtmlBlockly,
  setHtmlAssetOptionsProvider,
  spriteTheme,
} from '../../../blocks';
import {
  htmlWorkspaceJson,
  migrateHtmlWorkspaceJson,
  withHtmlWorkspace,
} from '../../../core/html-project';
import { newId } from '../../../core/ids';
import type { Project } from '../../../core/project';
import type { Storage } from '../../../core/storage';
import { exportHtmlProject } from '../../../runtime/html/export';
import { createHtmlPreview } from '../../../runtime/html/preview';
import { BUILTIN_COSTUMES, loadUploadedImage } from '../../../runtime/sprite/assets';
import { t } from '../../i18n';
import { showToast } from '../../toast';
import { renderCodePanel } from './code-panel';

export type HtmlModeDeps = {
  project: Project;
  storage: Storage;
  markDirty: () => void;
};

type WorkspaceFactory = (
  host: HTMLElement,
  options: Parameters<typeof Blockly.inject>[1],
) => Blockly.WorkspaceSvg;

let testWorkspaceFactory: WorkspaceFactory | null = null;

export function setHtmlWorkspaceFactoryForTests(factory: WorkspaceFactory | null): void {
  testWorkspaceFactory = factory;
}

export const __htmlModeHandle: {
  current: { workspace: Blockly.WorkspaceSvg } | null;
} = { current: null };

function replaceProject(target: Project, next: Project): void {
  Object.assign(target, next);
}

export function renderHtmlMode(host: HTMLElement, deps: HtmlModeDeps): () => void {
  installHtmlBlockly();
  const project = deps.project;
  let loadingWorkspace = true;
  let disposed = false;

  const assetOptions = (): [string, string][] => {
    const builtins: [string, string][] = BUILTIN_COSTUMES.map((asset) => [asset.name, asset.id]);
    const uploaded: [string, string][] = Object.entries(project.assets)
      .filter(([id, asset]) => asset.kind === 'image' && !id.startsWith('builtin:'))
      .map(([id, asset]) => [asset.name, id]);
    return [...builtins, ...uploaded];
  };
  setHtmlAssetOptionsProvider(assetOptions);

  host.innerHTML = `
    <div class="html-mode">
      <section class="html-mode__blocks" aria-label="Area blok HTML">
        <div id="htmlBlocklyDiv"></div>
        <p class="html-mode__hint" data-html-hint>${t('editor.html.canvasHint')}</p>
      </section>
      <aside class="html-mode__output" aria-label="Hasil halaman HTML">
        <div class="html-mode__toolbar">
          <button type="button" class="html-mode__run" data-run-html>▶ ${t('editor.html.run')}</button>
          <div class="html-mode__tabs" role="tablist" aria-label="${t('a11y.previewTablist')}">
            <button type="button" role="tab" id="html-tab-preview" data-tab="preview" aria-selected="true" aria-controls="html-panel-preview">${t('editor.html.tabPreview')}</button>
            <button type="button" role="tab" id="html-tab-code" data-tab="code" aria-selected="false" aria-controls="html-panel-code">${t('editor.html.tabCode')}</button>
          </div>
          <div class="html-mode__actions">
            <label class="html-mode__upload">
              ${t('editor.html.uploadImage')}
              <input type="file" accept="image/*" data-upload-image>
            </label>
            <button type="button" data-export-html>${t('editor.html.exportHtml')}</button>
          </div>
        </div>
        <p class="html-mode__error" data-html-error hidden></p>
        <div class="html-mode__panel" id="html-panel-preview" data-panel="preview" role="tabpanel" aria-labelledby="html-tab-preview">
          <iframe title="${t('editor.html.previewTitle')}"></iframe>
        </div>
        <div class="html-mode__panel html-mode__code" id="html-panel-code" data-panel="code" role="tabpanel" aria-labelledby="html-tab-code" hidden></div>
      </aside>
    </div>
  `;

  const blocklyHost = host.querySelector<HTMLElement>('#htmlBlocklyDiv')!;
  const workspace = (
    testWorkspaceFactory ?? ((element, options) => Blockly.inject(element, options))
  )(blocklyHost, {
    toolbox: htmlToolbox,
    theme: spriteTheme,
    renderer: 'zelos',
    trashcan: true,
    zoom: { controls: true, wheel: true },
    move: { scrollbars: true },
  });

  const savedWorkspace = migrateHtmlWorkspaceJson(htmlWorkspaceJson(project));
  if (Object.keys(savedWorkspace).length > 0) {
    Blockly.serialization.workspaces.load(savedWorkspace, workspace);
  }
  // No starter block — an empty canvas is valid now; the top-level block stack is the <body>.
  loadingWorkspace = false;

  const iframe = host.querySelector<HTMLIFrameElement>('iframe')!;
  const preview = createHtmlPreview(iframe, { getAssets: () => project.assets });
  const codeHost = host.querySelector<HTMLElement>('[data-panel="code"]')!;
  const codePanel = renderCodePanel(codeHost);
  const errorElement = host.querySelector<HTMLElement>('[data-html-error]')!;

  const hint = host.querySelector<HTMLElement>('[data-html-hint]')!;
  const syncHint = (): void => {
    hint.hidden = workspace.getTopBlocks(false).length > 0;
  };
  syncHint();

  const persist = (markDirty = true): void => {
    if (loadingWorkspace || disposed) return;
    const json = Blockly.serialization.workspaces.save(workspace) as Record<string, unknown>;
    replaceProject(project, withHtmlWorkspace(project, json));
    if (markDirty) deps.markDirty();
  };

  const refresh = (): void => {
    const { bodyHtml } = generateHtml(workspace);
    preview.update(bodyHtml);
    codePanel.setCode(bodyHtml);
  };

  const onWorkspaceChange = (event: Blockly.Events.Abstract): void => {
    if (event.isUiEvent || loadingWorkspace) return;
    persist();
    syncHint();
  };
  workspace.addChangeListener(onWorkspaceChange);

  const tabButtons = [...host.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  const panels = [...host.querySelectorAll<HTMLElement>('[data-panel]')];
  const activateTab = (tab: 'preview' | 'code'): void => {
    for (const button of tabButtons) {
      button.setAttribute('aria-selected', String(button.dataset.tab === tab));
    }
    for (const panel of panels) panel.hidden = panel.dataset.panel !== tab;
  };
  const onTabClick = (event: Event): void => {
    const selected = event.currentTarget as HTMLButtonElement;
    activateTab(selected.dataset.tab as 'preview' | 'code');
  };
  for (const button of tabButtons) button.addEventListener('click', onTabClick);

  const runButton = host.querySelector<HTMLButtonElement>('[data-run-html]')!;
  const onRun = (): void => {
    refresh();
    activateTab('preview');
  };
  runButton.addEventListener('click', onRun);

  const exportButton = host.querySelector<HTMLButtonElement>('[data-export-html]')!;
  const onExport = (): void => {
    persist(false);
    preview.flush();
    void exportHtmlProject(project, deps.storage).catch((error: unknown) => {
      console.error(error);
      errorElement.textContent = t('error.htmlExportFailed');
      errorElement.hidden = false;
      showToast(t('error.htmlExportFailed'), { kind: 'error' });
    });
  };
  exportButton.addEventListener('click', onExport);

  const uploadInput = host.querySelector<HTMLInputElement>('[data-upload-image]')!;
  const onUpload = async (): Promise<void> => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    errorElement.hidden = true;
    try {
      const uploaded = await loadUploadedImage(file);
      const assetId = newId('asset');
      project.assets[assetId] = {
        kind: 'image',
        name: uploaded.name,
        source: 'embedded',
        ref: uploaded.dataUrl,
      };
      project.meta.updatedAt = new Date().toISOString();
      deps.markDirty();
      refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errorElement.textContent = message.includes('terlalu besar')
        ? t('editor.html.uploadTooBig')
        : message.includes('bukan gambar')
          ? t('editor.html.uploadNotImage')
          : message;
      errorElement.hidden = false;
    } finally {
      uploadInput.value = '';
    }
  };
  uploadInput.addEventListener('change', onUpload);

  const debugWindow = window as Window & {
    Blockly?: Partial<typeof Blockly> & { getMainWorkspace?: () => Blockly.WorkspaceSvg };
    __kodakoBlockly?: typeof Blockly & { getMainWorkspace: () => Blockly.WorkspaceSvg };
    __kodakoHtml?: { bodyHtml: () => string };
  };
  debugWindow.__kodakoBlockly = { ...Blockly, getMainWorkspace: () => workspace };
  debugWindow.Blockly = Object.assign(debugWindow.Blockly ?? {}, debugWindow.__kodakoBlockly);
  debugWindow.__kodakoHtml = { bodyHtml: () => generateHtml(workspace).bodyHtml };
  __htmlModeHandle.current = { workspace };
  refresh();

  return () => {
    persist(false);
    disposed = true;
    workspace.removeChangeListener(onWorkspaceChange);
    for (const button of tabButtons) button.removeEventListener('click', onTabClick);
    runButton.removeEventListener('click', onRun);
    exportButton.removeEventListener('click', onExport);
    uploadInput.removeEventListener('change', onUpload);
    preview.dispose();
    codePanel.dispose();
    workspace.dispose();
    setHtmlAssetOptionsProvider(() => [['(tidak ada gambar)', '']]);
    delete debugWindow.__kodakoHtml;
    __htmlModeHandle.current = null;
    host.replaceChildren();
  };
}
