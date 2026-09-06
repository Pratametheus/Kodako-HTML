import { afterEach, describe, expect, it } from 'vitest';
import type * as Blockly from 'blockly/core';
import { attachToolboxWash, paleWash } from '../../src/blocks/toolbox-wash';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('paleWash', () => {
  it('converts #RRGGBB to rgba at the given alpha', () => {
    expect(paleWash('#4C97FF', 0.12)).toBe('rgba(76, 151, 255, 0.12)');
    expect(paleWash('4c97ff', 0.5)).toBe('rgba(76, 151, 255, 0.5)');
  });
  it('falls back to a neutral wash for junk input', () => {
    expect(paleWash('nope', 0.1)).toBe('rgba(120, 130, 150, 0.1)');
  });
});

const flush = (): Promise<void> => new Promise((resolve) => queueMicrotask(() => resolve()));

/**
 * `item`:
 *  - an object → `getToolbox().getSelectedItem()` returns it
 *  - `null`    → toolbox present, nothing selected
 *  - `'none'`  → `getToolbox()` returns null
 */
function harness(item: { getDiv: () => Element | null } | null | 'none') {
  document.body.innerHTML =
    '<div class="injectionDiv"><div class="blocklyToolboxDiv">' +
    '<div class="blocklyToolboxCategory kodako-cat kodako-cat--events">' +
    '<div class="blocklyTreeRow"></div></div></div></div>';
  const root = document.querySelector<HTMLElement>('.injectionDiv')!;
  const toolboxDiv = document.querySelector<HTMLElement>('.blocklyToolboxDiv')!;
  const catDiv = document.querySelector<HTMLElement>('.kodako-cat')!;
  const selected = item === 'none' ? null : item;
  const ws = {
    getInjectionDiv: () => root,
    getToolbox: () => (item === 'none' ? null : { getSelectedItem: () => selected }),
  } as unknown as Blockly.WorkspaceSvg;
  const click = () => toolboxDiv.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return { root, toolboxDiv, catDiv, ws, click };
}

describe('attachToolboxWash', () => {
  it('washes the flyout + marks the open category on a toolbox click', async () => {
    const h = harness({ getDiv: () => document.querySelector('.kodako-cat') });
    const dispose = attachToolboxWash(h.ws);

    h.click();
    await flush();
    expect(h.root.getAttribute('data-kodako-open')).toBe('true');
    expect(h.root.style.getPropertyValue('--kodako-wash')).toBe('rgba(255, 191, 0, 0.12)'); // events #FFBF00
    expect(h.catDiv.classList.contains('kodako-cat--open')).toBe(true);

    dispose();
    expect(h.root.hasAttribute('data-kodako-open')).toBe(false);
    expect(h.catDiv.classList.contains('kodako-cat--open')).toBe(false);
  });

  it('clears the marks when a click resolves to no selected category', async () => {
    const h = harness(null);
    attachToolboxWash(h.ws);
    h.click();
    await flush();
    expect(h.root.hasAttribute('data-kodako-open')).toBe(false);
    expect(h.root.style.getPropertyValue('--kodako-wash')).toBe('');
  });

  it('is a no-op and does not throw when the workspace has no toolbox', () => {
    const h = harness('none');
    expect(() => attachToolboxWash(h.ws)()).not.toThrow();
  });
});
