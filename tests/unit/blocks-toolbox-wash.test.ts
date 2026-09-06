import { afterEach, describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
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

function harness(item: unknown) {
  document.body.innerHTML =
    '<div class="injectionDiv"><div class="kodako-cat kodako-cat--events"></div></div>';
  const root = document.querySelector<HTMLElement>('.injectionDiv')!;
  const catDiv = document.querySelector<HTMLElement>('.kodako-cat')!;
  let listener: ((e: { type: string }) => void) | null = null;
  const ws = {
    getInjectionDiv: () => root,
    getToolbox: () => (item === null ? null : { getSelectedItem: () => item }),
    addChangeListener: (fn: (e: { type: string }) => void) => {
      listener = fn;
    },
    removeChangeListener: () => {
      listener = null;
    },
  } as unknown as Blockly.WorkspaceSvg;
  return { root, catDiv, ws, fire: (type: string) => listener?.({ type }) };
}

describe('attachToolboxWash', () => {
  it('sets data-open + --kodako-wash + open class on a category select', () => {
    const item = {
      getColour: () => '#FFBF00',
      getDiv: () => document.querySelector('.kodako-cat'),
    };
    const h = harness(item);
    const dispose = attachToolboxWash(h.ws);

    h.fire(Blockly.Events.TOOLBOX_ITEM_SELECT);
    expect(h.root.getAttribute('data-open')).toBe('true');
    expect(h.root.style.getPropertyValue('--kodako-wash')).toBe('rgba(255, 191, 0, 0.12)');
    expect(h.catDiv.classList.contains('kodako-cat--open')).toBe(true);

    dispose();
    expect(h.root.hasAttribute('data-open')).toBe(false);
    expect(h.catDiv.classList.contains('kodako-cat--open')).toBe(false);
  });

  it('ignores non-select events', () => {
    const item = {
      getColour: () => '#FFBF00',
      getDiv: () => document.querySelector('.kodako-cat'),
    };
    const h = harness(item);
    attachToolboxWash(h.ws);
    h.fire('move');
    expect(h.root.hasAttribute('data-open')).toBe(false);
  });

  it('is a no-op and does not throw when the workspace has no toolbox', () => {
    const h = harness(null);
    expect(() => attachToolboxWash(h.ws)()).not.toThrow();
  });
});
