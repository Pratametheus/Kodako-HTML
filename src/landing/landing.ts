import { initHeroLetters } from './hero-letters';
import { initParallax } from './parallax';

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

initHeroLetters(document.querySelector<HTMLElement>('[data-hero-title]'), { reducedMotion });

initParallax(document.querySelectorAll<HTMLElement>('[data-parallax]'), { reducedMotion });

// Demo band: the blocks assemble once, when the band first scrolls into view.
// Under reduced motion we never add `is-playing`, so the CSS resting state (all
// blocks stacked, sprite mid-stage) shows immediately. Without IntersectionObserver
// support we start it right away.
const demo = document.querySelector<HTMLElement>('[data-demo]');
if (demo && !reducedMotion) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            demo.classList.add('is-playing');
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(demo);
  } else {
    demo.classList.add('is-playing');
  }
}
