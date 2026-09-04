import './toast.css';
import { t } from './i18n';

export type ToastKind = 'error' | 'info';

export type ToastOptions = {
  kind?: ToastKind;
  timeoutMs?: number;
};

const MAX_TOASTS = 3;
const DEFAULT_TIMEOUT_MS = 4000;

let container: HTMLElement | null = null;
const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

function ensureContainer(): HTMLElement {
  if (container && container.isConnected) return container;
  container = document.createElement('div');
  container.className = 'toast-region';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'false');
  document.body.append(container);
  return container;
}

function dismiss(toast: HTMLElement): void {
  const timer = timers.get(toast);
  if (timer !== undefined) clearTimeout(timer);
  timers.delete(toast);
  toast.remove();
}

export function showToast(message: string, opts: ToastOptions = {}): void {
  const region = ensureContainer();
  const kind: ToastKind = opts.kind ?? 'info';

  const toast = document.createElement('div');
  toast.className = `toast toast--${kind}`;
  toast.dataset.toast = kind;

  const text = document.createElement('span');
  text.className = 'toast__message';
  text.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast__close';
  close.setAttribute('aria-label', t('toast.close'));
  close.textContent = '×';
  close.addEventListener('click', () => dismiss(toast));

  toast.append(text, close);
  region.append(toast);

  while (region.querySelectorAll('[data-toast]').length > MAX_TOASTS) {
    const oldest = region.querySelector<HTMLElement>('[data-toast]');
    if (!oldest) break;
    dismiss(oldest);
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  timers.set(
    toast,
    setTimeout(() => dismiss(toast), timeoutMs),
  );
}

export function clearToasts(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  container?.replaceChildren();
}
