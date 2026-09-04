import './help.css';
import { t } from '../i18n';

export type HelpPanel = {
  open(): void;
  close(): void;
  dispose(): void;
};

type Section = { key: 'start' | 'sprite' | 'html' | 'save' | 'trouble' };

const SECTIONS: Section[] = [
  { key: 'start' },
  { key: 'sprite' },
  { key: 'html' },
  { key: 'save' },
  { key: 'trouble' },
];

export function renderHelpPanel(host: HTMLElement): HelpPanel {
  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'help-title');
  overlay.dataset.backdrop = '';
  overlay.hidden = true;

  const sectionsHtml = SECTIONS.map(
    ({ key }) => `
      <section>
        <h3>${t(`help.${key}`)}</h3>
      </section>
    `,
  ).join('');

  overlay.innerHTML = `
    <div class="help-panel" data-panel-content>
      <div class="help-panel__header">
        <h2 id="help-title">${t('help.title')}</h2>
        <button type="button" class="btn" data-close aria-label="${t('help.close')}">×</button>
      </div>
      ${sectionsHtml}
    </div>
  `;

  host.append(overlay);

  const closeButton = overlay.querySelector<HTMLButtonElement>('[data-close]')!;

  const close = (): void => {
    overlay.hidden = true;
  };

  const open = (): void => {
    overlay.hidden = false;
    closeButton.focus();
  };

  const onOverlayClick = (event: MouseEvent): void => {
    if (event.target === overlay) close();
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || overlay.hidden) return;
    close();
  };

  overlay.addEventListener('click', onOverlayClick);
  closeButton.addEventListener('click', close);
  document.addEventListener('keydown', onKeydown);

  const dispose = (): void => {
    overlay.removeEventListener('click', onOverlayClick);
    closeButton.removeEventListener('click', close);
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };

  return { open, close, dispose };
}
