import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearToasts, showToast } from '../../src/app/toast';
import { t } from '../../src/app/i18n';

beforeEach(() => {
  vi.useFakeTimers();
  clearToasts();
  document.body.innerHTML = '';
});

afterEach(() => {
  clearToasts();
  vi.useRealTimers();
});

describe('showToast', () => {
  it('appends one polite live region containing the message and a labelled close button', () => {
    showToast('halo');

    const regions = document.querySelectorAll('[role="status"]');
    expect(regions).toHaveLength(1);
    const region = regions[0]!;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toContain('halo');
    const close = region.querySelector('button');
    expect(close).not.toBeNull();
    expect(close?.getAttribute('aria-label')).toBe(t('toast.close'));
  });

  it('reuses the same live region for further toasts', () => {
    showToast('satu');
    showToast('dua');
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(2);
  });

  it('adds an error class for kind "error"', () => {
    showToast('rusak', { kind: 'error' });
    const toast = document.querySelector('[data-toast]')!;
    expect(toast.className).toMatch(/error/);
  });

  it('auto-dismisses after the timeout', () => {
    showToast('sebentar', { timeoutMs: 4000 });
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(0);
  });

  it('closes when the close button is clicked', () => {
    showToast('tutup aku');
    document.querySelector<HTMLButtonElement>('[data-toast] button')!.click();
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(0);
  });

  it('clearToasts empties the region', () => {
    showToast('a');
    showToast('b');
    clearToasts();
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(0);
  });

  it('keeps at most three toasts, dropping the oldest', () => {
    showToast('satu');
    showToast('dua');
    showToast('tiga');
    showToast('empat');
    const toasts = [...document.querySelectorAll('[data-toast]')];
    expect(toasts).toHaveLength(3);
    expect(document.body.textContent).not.toContain('satu');
    expect(document.body.textContent).toContain('empat');
  });
});
