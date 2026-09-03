import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentRoute, navigate, onRouteChange, parseHash } from '../../src/app/router';

afterEach(() => {
  window.location.hash = '';
});

describe('parseHash', () => {
  it.each([
    ['', 'home'],
    ['#', 'home'],
    ['#/', 'home'],
    ['#/editor/abc123', 'editor'],
    ['#/nonsense', 'notFound'],
    ['#/editor/', 'notFound'],
  ])('%s -> %s', (hash, name) => {
    expect(parseHash(hash).name).toBe(name);
  });

  it('extracts the editor id', () => {
    const r = parseHash('#/editor/xyz');
    expect(r).toEqual({ name: 'editor', id: 'xyz' });
  });
});

describe('navigate + currentRoute', () => {
  it('navigates home', () => {
    navigate({ name: 'home' });
    expect(currentRoute()).toEqual({ name: 'home' });
  });
  it('navigates to an editor route', () => {
    navigate({ name: 'editor', id: 'p1' });
    expect(window.location.hash).toBe('#/editor/p1');
  });
});

describe('onRouteChange', () => {
  it('fires on hashchange until unsubscribed', () => {
    const fn = vi.fn();
    const off = onRouteChange(fn);
    window.location.hash = '#/editor/p9';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(fn).toHaveBeenLastCalledWith({ name: 'editor', id: 'p9' });
    off();
    window.location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
