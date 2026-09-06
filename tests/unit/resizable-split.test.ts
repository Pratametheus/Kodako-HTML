import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeResizableSplit } from '../../src/app/editor/resizable-split';

const KEY = 'kodako:split:test';

function twoPane(width = 1000): HTMLElement {
  document.body.innerHTML =
    '<div class="split"><section class="a"></section><aside class="b"></aside></div>';
  const el = document.querySelector<HTMLElement>('.split')!;
  Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: width, bottom: 600, width, height: 600, x: 0, y: 0 }) as DOMRect;
  return el;
}

const opts = {
  storageKey: KEY,
  minLeft: 200,
  minRight: 200,
  defaultFraction: 0.6,
  gutter: 6,
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('makeResizableSplit', () => {
  it('is a no-op (fn disposer, no throw) with a null or single-child container', () => {
    expect(typeof makeResizableSplit(null, opts)).toBe('function');
    document.body.innerHTML = '<div class="split"><section></section></div>';
    const one = document.querySelector<HTMLElement>('.split')!;
    expect(() => makeResizableSplit(one, opts)()).not.toThrow();
    expect(one.querySelector('.ed-split-gutter')).toBeNull();
  });

  it('inserts a separator gutter between the two panes', () => {
    const el = twoPane();
    makeResizableSplit(el, opts);
    const gutter = el.querySelector('.ed-split-gutter');
    expect(gutter).not.toBeNull();
    expect(gutter?.getAttribute('role')).toBe('separator');
    expect(gutter?.getAttribute('aria-orientation')).toBe('vertical');
    expect([...el.children].indexOf(gutter as Element)).toBe(1);
  });

  it('applies the stored fraction (clamped) as --split-left on mount', () => {
    localStorage.setItem(KEY, '0.4');
    const el = twoPane(1000);
    makeResizableSplit(el, opts);
    // 0.4 * 1000 = 400, within [200, 1000 - 6 - 200 = 794]
    expect(el.style.getPropertyValue('--split-left')).toBe('400px');
  });

  it('falls back to defaultFraction for missing / junk storage', () => {
    const el = twoPane(1000);
    makeResizableSplit(el, opts); // no stored value -> 0.6 -> 600px
    expect(el.style.getPropertyValue('--split-left')).toBe('600px');
    localStorage.setItem(KEY, 'nonsense');
    const el2 = twoPane(1000);
    makeResizableSplit(el2, opts);
    expect(el2.style.getPropertyValue('--split-left')).toBe('600px');
  });

  it('drag: pointer move sets a clamped --split-left, pointer up persists the fraction', () => {
    const el = twoPane(1000);
    makeResizableSplit(el, opts);
    const g = el.querySelector<HTMLElement>('.ed-split-gutter')!;
    g.setPointerCapture = vi.fn();
    g.releasePointerCapture = vi.fn();

    g.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    g.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 720 }));
    expect(el.style.getPropertyValue('--split-left')).toBe('720px');

    // beyond the max clamp
    g.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 999 }));
    expect(el.style.getPropertyValue('--split-left')).toBe('794px'); // 1000 - 6 - 200

    g.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(localStorage.getItem(KEY)).toBe(String(794 / 1000));
  });

  it('keyboard: ArrowRight/ArrowLeft nudge and persist', () => {
    localStorage.setItem(KEY, '0.5');
    const el = twoPane(1000);
    makeResizableSplit(el, opts); // 500px
    const g = el.querySelector<HTMLElement>('.ed-split-gutter')!;

    g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(el.style.getPropertyValue('--split-left')).toBe('516px');
    g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(el.style.getPropertyValue('--split-left')).toBe('500px');
    expect(localStorage.getItem(KEY)).toBe(String(500 / 1000));
  });

  it('double-click resets to defaultFraction and persists', () => {
    localStorage.setItem(KEY, '0.3');
    const el = twoPane(1000);
    makeResizableSplit(el, opts);
    expect(el.style.getPropertyValue('--split-left')).toBe('300px');
    el.querySelector<HTMLElement>('.ed-split-gutter')!.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true }),
    );
    expect(el.style.getPropertyValue('--split-left')).toBe('600px');
    expect(localStorage.getItem(KEY)).toBe('0.6');
  });

  it('disposer removes the gutter and stops reacting to window resize', () => {
    const el = twoPane(1000);
    const dispose = makeResizableSplit(el, opts);
    dispose();
    expect(el.querySelector('.ed-split-gutter')).toBeNull();
    el.style.setProperty('--split-left', 'SENTINEL');
    window.dispatchEvent(new Event('resize'));
    expect(el.style.getPropertyValue('--split-left')).toBe('SENTINEL');
  });

  it('survives a throwing localStorage (private mode)', () => {
    const el = twoPane(1000);
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => {
      const d = makeResizableSplit(el, opts);
      el.querySelector<HTMLElement>('.ed-split-gutter')!.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true }),
      );
      d();
    }).not.toThrow();
    expect(el.style.getPropertyValue('--split-left')).toBe('600px'); // defaultFraction still applied
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
