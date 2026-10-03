import { t } from '../i18n';

export type HeaderDeps = {
  name: string;
  onNameChange: (name: string) => void;
  onBack: () => void;
  onSave: () => void;
  onOpen: () => void;
  onExport: () => void;
  onHelp: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
};

export function renderHeader(root: HTMLElement, deps: HeaderDeps): () => void {
  root.innerHTML = `
    <header class="editor__header">
      <button class="btn" data-back>${t('editor.back')}</button>
      <input class="editor__name" data-name aria-label="${t('home.rename')}" />
      <button class="btn btn--icon" data-undo aria-label="${t('editor.undo')}" title="${t('editor.undo')} (Ctrl+Z)">↩</button>
      <button class="btn btn--icon" data-redo aria-label="${t('editor.redo')}" title="${t('editor.redo')} (Ctrl+Y)">↪</button>
      <button class="btn" data-save>${t('editor.save')}</button>
      <button class="btn" data-open>${t('editor.open')}</button>
      <button class="btn" data-export>${t('editor.export')}</button>
      <span class="editor__spacer"></span>
      <button class="btn" data-help>${t('help.open')}</button>
    </header>
  `;

  const nameInput = root.querySelector<HTMLInputElement>('[data-name]')!;
  nameInput.value = deps.name;

  const onChange = () => deps.onNameChange(nameInput.value.trim());
  const onClick = (ev: MouseEvent) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>(
      '[data-back],[data-save],[data-open],[data-export],[data-help],[data-undo],[data-redo]',
    );
    if (!el) return;
    if (el.hasAttribute('data-back')) deps.onBack();
    else if (el.hasAttribute('data-undo')) deps.onUndo?.();
    else if (el.hasAttribute('data-redo')) deps.onRedo?.();
    else if (el.hasAttribute('data-save')) deps.onSave();
    else if (el.hasAttribute('data-open')) deps.onOpen();
    else if (el.hasAttribute('data-export')) deps.onExport();
    else if (el.hasAttribute('data-help')) deps.onHelp();
  };

  nameInput.addEventListener('change', onChange);
  root.addEventListener('click', onClick);

  return () => {
    nameInput.removeEventListener('change', onChange);
    root.removeEventListener('click', onClick);
    root.innerHTML = '';
  };
}
