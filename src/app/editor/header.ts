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
  onHelp: () => void;
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
      <div class="editor__modes" role="tablist" aria-label="${t('a11y.modeTablist')}">
        <button class="btn" role="tab" data-mode="sprite">${t('editor.mode.sprite')}</button>
        <button class="btn" role="tab" data-mode="html">${t('editor.mode.html')}</button>
      </div>
      <button class="btn" data-help>${t('help.open')}</button>
    </header>
  `;

  const nameInput = root.querySelector<HTMLInputElement>('[data-name]')!;
  nameInput.value = deps.name;

  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  const paintModes = (mode: EditorMode) => {
    modeButtons.forEach((b) => {
      const active = b.dataset.mode === mode;
      b.setAttribute('aria-pressed', String(active));
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1;
    });
  };
  paintModes(deps.mode);

  const onModeKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = modeButtons.indexOf(event.currentTarget as HTMLButtonElement);
    if (index === -1) return;
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = modeButtons[(index + delta + modeButtons.length) % modeButtons.length]!;
    const mode = next.dataset.mode as EditorMode;
    paintModes(mode);
    next.focus();
    deps.onModeChange(mode);
  };
  modeButtons.forEach((button) => button.addEventListener('keydown', onModeKeydown));

  const onChange = () => deps.onNameChange(nameInput.value.trim());
  const onClick = (ev: MouseEvent) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>(
      '[data-action],[data-back],[data-save],[data-open],[data-export],[data-help],[data-mode]',
    );
    if (!el) return;
    if (el.hasAttribute('data-back')) deps.onBack();
    else if (el.hasAttribute('data-save')) deps.onSave();
    else if (el.hasAttribute('data-open')) deps.onOpen();
    else if (el.hasAttribute('data-export')) deps.onExport();
    else if (el.hasAttribute('data-help')) deps.onHelp();
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
    modeButtons.forEach((button) => button.removeEventListener('keydown', onModeKeydown));
    root.innerHTML = '';
  };
}
