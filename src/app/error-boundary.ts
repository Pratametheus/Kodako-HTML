import './error-boundary.css';
import { t } from './i18n';

export const __ERROR_BOUNDARY_TESTID = 'kodako-error-boundary';

function asError(value: unknown, fallback = 'Kesalahan tidak diketahui'): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' && value ? value : fallback);
}

function errorDetail(error: Error): string {
  return `${error.name}: ${error.message}\n${error.stack ?? ''}`;
}

function fallbackCopy(detail: string, overlay: HTMLElement): void {
  const textarea = document.createElement('textarea');
  textarea.value = detail;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.className = 'error-boundary__copy-source';
  overlay.append(textarea);
  textarea.select();
  document.execCommand?.('copy');
  textarea.remove();
}

export function installErrorBoundary(mountInto: HTMLElement = document.body): () => void {
  let overlay: HTMLElement | null = null;

  const show = (original: unknown): void => {
    const error = asError(original);
    console.error(original);
    if (overlay) return;

    overlay = document.createElement('section');
    overlay.className = 'error-boundary';
    overlay.dataset.testid = __ERROR_BOUNDARY_TESTID;
    overlay.setAttribute('role', 'alert');
    overlay.innerHTML = `
      <div class="error-boundary__card">
        <h1>${t('boundary.title')}</h1>
        <p>${t('boundary.body')}</p>
        <div class="error-boundary__actions">
          <button type="button" data-action="reload">${t('boundary.reload')}</button>
          <button type="button" data-action="copy">${t('boundary.copy')}</button>
        </div>
      </div>
    `;
    overlay
      .querySelector<HTMLButtonElement>('[data-action="reload"]')
      ?.addEventListener('click', () => window.location.reload());
    overlay
      .querySelector<HTMLButtonElement>('[data-action="copy"]')
      ?.addEventListener('click', () => {
        const detail = errorDetail(error);
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(detail).catch(() => fallbackCopy(detail, overlay!));
        } else {
          fallbackCopy(detail, overlay!);
        }
      });
    mountInto.append(overlay);
  };

  const onError = (event: ErrorEvent): void => {
    event.preventDefault();
    show(event.error ?? event.message);
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    event.preventDefault();
    show(event.reason);
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    overlay?.remove();
    overlay = null;
  };
}
