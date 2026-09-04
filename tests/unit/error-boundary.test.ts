import { afterEach, describe, expect, it, vi } from 'vitest';
import { __ERROR_BOUNDARY_TESTID, installErrorBoundary } from '../../src/app/error-boundary';
import { t } from '../../src/app/i18n';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('global error boundary', () => {
  it('logs the original error and paints one recoverable overlay', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const teardown = installErrorBoundary(root);
    const boom = new Error('boom');

    window.dispatchEvent(new ErrorEvent('error', { error: boom, message: 'boom' }));

    const overlay = root.querySelector(`[data-testid="${__ERROR_BOUNDARY_TESTID}"]`);
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain(t('boundary.title'));
    expect(overlay?.textContent).toContain(t('boundary.body'));
    expect(overlay?.querySelector('[data-action="reload"]')).not.toBeNull();
    const copy = overlay?.querySelector<HTMLButtonElement>('[data-action="copy"]');
    expect(copy).not.toBeNull();
    expect(log).toHaveBeenCalledWith(boom);

    copy?.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Error: boom'));

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('kedua'), message: 'kedua' }));
    expect(root.querySelectorAll(`[data-testid="${__ERROR_BOUNDARY_TESTID}"]`)).toHaveLength(1);
    expect(log).toHaveBeenCalledTimes(2);

    teardown();
    expect(root.querySelector(`[data-testid="${__ERROR_BOUNDARY_TESTID}"]`)).toBeNull();
    window.addEventListener('error', (event) => event.preventDefault(), { once: true });
    window.dispatchEvent(new ErrorEvent('error', { cancelable: true, error: new Error('akhir') }));
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('falls back to manual copy when clipboard.writeText rejects, without an unhandled rejection', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    const writeText = vi.fn(() => Promise.reject(new Error('denied')));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const execCommand = vi.fn();
    // jsdom does not implement execCommand; the fallback calls it optionally.
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    const teardown = installErrorBoundary(root);

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom'), message: 'boom' }));
    const copy = root.querySelector<HTMLButtonElement>('[data-action="copy"]');
    copy?.click();

    // Let the rejected writeText() promise settle and its .catch() fallback run.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Error: boom'));
    // The manual-copy fallback (hidden textarea + execCommand) ran instead of
    // the rejection surfacing as an unhandled promise rejection.
    expect(execCommand).toHaveBeenCalledWith('copy');

    teardown();
  });

  it('handles an unhandled rejection without creating a real rejected promise', () => {
    const root = document.createElement('div');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const teardown = installErrorBoundary(root);
    const reason = new Error('janji gagal');
    const event = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperties(event, {
      reason: { value: reason },
      promise: { value: Promise.resolve() },
    });

    window.dispatchEvent(event);

    expect(root.querySelector(`[data-testid="${__ERROR_BOUNDARY_TESTID}"]`)).not.toBeNull();
    expect(log).toHaveBeenCalledWith(reason);
    teardown();
  });
});
