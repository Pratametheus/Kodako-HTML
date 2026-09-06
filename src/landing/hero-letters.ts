export interface HeroLettersOptions {
  reducedMotion: boolean;
}

const DANCE_COUNT = 8;

/**
 * Split the text of `container` into per-character spans. Non-space characters
 * become `.hero-title__letter` (with `--i` = running index and `data-dance` =
 * index % 8); each run of spaces becomes one `.hero-title__space`. Unless
 * reduced motion is requested, a staggered CSS intro runs (via the
 * `hero-title--intro` class) and each letter replays its dance on
 * `pointerenter` (toggled with the `is-dancing` class, cleared on the matching
 * `animationend`). No-op when `container` is null; never throws.
 */
export function initHeroLetters(
  container: HTMLElement | null,
  options: HeroLettersOptions,
): void {
  if (!container) return;

  const text = container.textContent ?? '';
  container.textContent = '';
  container.classList.add('hero-title--split');

  let index = 0;
  for (const char of text) {
    if (char === ' ') {
      const space = document.createElement('span');
      space.className = 'hero-title__space';
      space.textContent = '\u00A0';
      container.appendChild(space);
      continue;
    }
    const letter = document.createElement('span');
    letter.className = 'hero-title__letter';
    letter.textContent = char;
    letter.style.setProperty('--i', String(index));
    letter.dataset.dance = String(index % DANCE_COUNT);
    container.appendChild(letter);
    index += 1;
  }

  if (options.reducedMotion) {
    container.classList.add('hero-title--static');
    return;
  }

  container.classList.add('hero-title--intro');

  for (const letter of container.querySelectorAll<HTMLElement>('.hero-title__letter')) {
    letter.addEventListener('pointerenter', () => {
      letter.classList.add('is-dancing');
    });
    letter.addEventListener('animationend', (event) => {
      const name = (event as AnimationEvent).animationName;
      if (name.startsWith('hero-dance')) {
        letter.classList.remove('is-dancing');
      }
    });
  }
}
