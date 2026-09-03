import { t } from '../i18n';

export type EditorMode = 'sprite' | 'html';

export type HeaderDeps = {
  name: string;
  mode: EditorMode;
  onNameChange: (name: string) => void;
  onModeChange: (mode: EditorMode) => void;
  onBack: () => void;
  onSave: () => void;
  onOpen: () => void;
  onExport: () => void;
};

export function renderHeader(root: HTMLElement, deps: HeaderDeps): () => void {
  root.innerHTML = `
    <header class="editor__header">
      <button class="btn" data-back>${t('editor.back')}</button>
      <input class="editor__name" data-name aria-label="${t('home.rename')}" />
      <button class="btn" data-save>${t('editor.save')}</button>
      <button class="btn" data-open>${t('editor.open')}</button>
      <button class="btn" data-export>${t('editor.export')}</button>
      <span class="editor__spacer"></span>
      <div class="editor__modes">
        <button class="btn" data-mode="sprite">${t('editor.mode.sprite')}</button>
        <button class="btn" data-mode="html">${t('editor.mode.html')}</button>
      </div>
    </header>
  `;

  const nameInput = root.querySelector<HTMLInputElement>('[data-name]')!;
  nameInput.value = deps.name;

  const paintModes = (mode: EditorMode) => {
    root.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
  };
  paintModes(deps.mode);

  const onChange = () => deps.onNameChange(nameInput.value.trim());
  const onClick = (ev: MouseEvent) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>(
      '[data-action],[data-back],[data-save],[data-open],[data-export],[data-mode]',
    );
    if (!el) return;
    if (el.hasAttribute('data-back')) deps.onBack();
    else if (el.hasAttribute('data-save')) deps.onSave();
    else if (el.hasAttribute('data-open')) deps.onOpen();
    else if (el.hasAttribute('data-export')) deps.onExport();
    else if (el.dataset.mode === 'sprite' || el.dataset.mode === 'html') {
      paintModes(el.dataset.mode);
      deps.onModeChange(el.dataset.mode);
    }
  };

  nameInput.addEventListener('change', onChange);
  root.addEventListener('click', onClick);

  return () => {
    nameInput.removeEventListener('change', onChange);
    root.removeEventListener('click', onClick);
    root.innerHTML = '';
  };
}
