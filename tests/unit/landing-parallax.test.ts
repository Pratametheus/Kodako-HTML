import { afterEach, describe, expect, it, vi } from 'vitest';
import { initParallax } from '../../src/landing/parallax';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  window.scrollY = 0;
});

function nodes(): HTMLElement[] {
  document.body.innerHTML = `
    <img class="float-block" data-parallax data-parallax-depth="0.2" />
    <img class="float-block" data-parallax />`;
  return [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
}

describe('initParallax', () => {
  it('no-ops under reduced motion (no scroll listener added)', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const stop = initParallax(nodes(), { reducedMotion: true });
    expect(add).not.toHaveBeenCalledWith('scroll', expect.anything(), expect.anything());
    expect(typeof stop).toBe('function');
    stop();
  });

  it('no-ops on an empty node list', () => {
    const add = vi.spyOn(window, 'addEventListener');
    initParallax([], { reducedMotion: false });
    expect(add).not.toHaveBeenCalledWith('scroll', expect.anything(), expect.anything());
  });

  it('writes --parallax-y per node on scroll, scaled by depth (default 0.1)', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const list = nodes();
    initParallax(list, { reducedMotion: false });
    window.scrollY = 100;
    window.dispatchEvent(new Event('scroll'));
    expect(list[0].style.getPropertyValue('--parallax-y')).toBe('-20.0px');
    expect(list[1].style.getPropertyValue('--parallax-y')).toBe('-10.0px');
  });

  it('cleanup removes the scroll listener', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const stop = initParallax(nodes(), { reducedMotion: false });
    stop();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
