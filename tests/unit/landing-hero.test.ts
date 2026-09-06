import { beforeEach, describe, expect, it } from 'vitest';
import { initHeroLetters } from '../../src/landing/hero-letters';

function makeTitle(text = 'Kodako HTML'): HTMLElement {
  document.body.innerHTML = `<h1 data-hero-title>${text}</h1>`;
  return document.querySelector<HTMLElement>('[data-hero-title]')!;
}

describe('initHeroLetters', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does nothing and does not throw when the container is null', () => {
    expect(() => initHeroLetters(null, { reducedMotion: false })).not.toThrow();
  });

  it('splits into one letter span per non-space char plus a space span', () => {
    const el = makeTitle('Ko do');
    initHeroLetters(el, { reducedMotion: false });
    expect(el.querySelectorAll('.hero-title__letter')).toHaveLength(4);
    expect(el.querySelectorAll('.hero-title__space')).toHaveLength(1);
    expect(el.textContent?.replace(/\u00a0/g, ' ')).toBe('Ko do');
    const first = el.querySelector<HTMLElement>('.hero-title__letter')!;
    expect(first.style.getPropertyValue('--i')).toBe('0');
    expect(first.dataset.dance).toBe('0');
    expect(el.classList.contains('hero-title--split')).toBe(true);
    expect(el.classList.contains('hero-title--intro')).toBe(true);
  });

  it('cycles data-dance 0..7 across the letters', () => {
    const el = makeTitle('ABCDEFGHIJ'); // 10 letters
    initHeroLetters(el, { reducedMotion: false });
    const dances = [...el.querySelectorAll<HTMLElement>('.hero-title__letter')].map(
      (s) => s.dataset.dance,
    );
    expect(dances).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '0', '1']);
  });

  it('under reduced motion: static class, no intro, hover does not add is-dancing', () => {
    const el = makeTitle('Ko');
    initHeroLetters(el, { reducedMotion: true });
    expect(el.classList.contains('hero-title--static')).toBe(true);
    expect(el.classList.contains('hero-title--intro')).toBe(false);
    const letter = el.querySelector<HTMLElement>('.hero-title__letter')!;
    letter.dispatchEvent(new Event('pointerenter'));
    expect(letter.classList.contains('is-dancing')).toBe(false);
  });

  it('with motion: pointerenter adds is-dancing, matching animationend removes it', () => {
    const el = makeTitle('Ko');
    initHeroLetters(el, { reducedMotion: false });
    const letter = el.querySelector<HTMLElement>('.hero-title__letter')!;
    letter.dispatchEvent(new Event('pointerenter'));
    expect(letter.classList.contains('is-dancing')).toBe(true);
    const ev = new Event('animationend') as AnimationEvent;
    Object.defineProperty(ev, 'animationName', { value: 'hero-dance-0' });
    letter.dispatchEvent(ev);
    expect(letter.classList.contains('is-dancing')).toBe(false);
  });
});
