import { afterEach, describe, expect, it } from 'vitest';
import type * as Blockly from 'blockly/core';
import { attachBlockInfo, BLOCK_INFO_HINT } from '../../src/app/editor/html-mode/block-info';

afterEach(() => {
  document.body.innerHTML = '';
});

function harness(selected: { tooltip: string | (() => string) } | null) {
  document.body.innerHTML = '<div id="htmlBlocklyDiv"></div><p data-block-info></p>';
  const el = document.querySelector<HTMLElement>('[data-block-info]')!;
  const host = document.querySelector<HTMLElement>('#htmlBlocklyDiv')!;
  const ws = {
    getInjectionDiv: () => document.body,
    addChangeListener: () => {},
    removeChangeListener: () => {},
  } as unknown as Blockly.WorkspaceSvg;
  return { el, host, ws, selected };
}

describe('attachBlockInfo', () => {
  it('shows the hint when nothing is selected', () => {
    const h = harness(null);
    attachBlockInfo(h.ws, h.el);
    expect(h.el.textContent).toBe(BLOCK_INFO_HINT);
  });

  it('shows the selected block tooltip on a click in the workspace', async () => {
    const h = harness({ tooltip: () => 'Satu paragraf teks (<p>).' });
    attachBlockInfo(h.ws, h.el, () => h.selected as unknown as Blockly.Block);
    h.host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => queueMicrotask(() => r(null)));
    expect(h.el.textContent).toContain('Satu paragraf teks');
  });

  it('returns to the hint when the click resolves to no block', async () => {
    const h = harness(null);
    attachBlockInfo(h.ws, h.el, () => null);
    h.host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => queueMicrotask(() => r(null)));
    expect(h.el.textContent).toBe(BLOCK_INFO_HINT);
  });

  it('disposer removes the listener; el null is a no-op', () => {
    const h = harness(null);
    const stop = attachBlockInfo(h.ws, h.el, () => null);
    stop();
    h.host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(h.el.textContent).toBe(BLOCK_INFO_HINT);
    expect(() => attachBlockInfo(h.ws, null)()).not.toThrow();
  });
});
