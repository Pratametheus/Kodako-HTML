import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHelpPanel } from '../../src/app/help/help-panel';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  root.remove();
});

describe('renderHelpPanel', () => {
  it('initially renders a hidden dialog', () => {
    const panel = renderHelpPanel(root);
    const dialog = root.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.hasAttribute('hidden')).toBe(true);
    panel.dispose();
  });

  it('open() shows the dialog with all section headings present', () => {
    const panel = renderHelpPanel(root);
    panel.open();
    const dialog = root.querySelector('[role="dialog"]')!;
    expect(dialog.hasAttribute('hidden')).toBe(false);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.hasAttribute('aria-labelledby')).toBe(true);

    const headings = [...dialog.querySelectorAll('h3')].map((h) => h.textContent);
    expect(headings.length).toBe(5);
    panel.dispose();
  });

  it('Escape key closes the dialog', () => {
    const panel = renderHelpPanel(root);
    panel.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const dialog = root.querySelector('[role="dialog"]')!;
    expect(dialog.hasAttribute('hidden')).toBe(true);
    panel.dispose();
  });

  it('clicking the backdrop closes the dialog', () => {
    const panel = renderHelpPanel(root);
    panel.open();
    const backdrop = root.querySelector<HTMLElement>('[data-backdrop]')!;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const dialog = root.querySelector('[role="dialog"]')!;
    expect(dialog.hasAttribute('hidden')).toBe(true);
    panel.dispose();
  });

  it('clicking inside the panel content does not close the dialog', () => {
    const panel = renderHelpPanel(root);
    panel.open();
    const content = root.querySelector<HTMLElement>('[data-panel-content]')!;
    content.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const dialog = root.querySelector('[role="dialog"]')!;
    expect(dialog.hasAttribute('hidden')).toBe(false);
    panel.dispose();
  });

  it('dispose() removes all listeners and DOM', () => {
    const panel = renderHelpPanel(root);
    panel.open();
    panel.dispose();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    // Escape after dispose should not throw or resurrect anything
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });
});
