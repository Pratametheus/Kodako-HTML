import { initHeroLetters } from './hero-letters';
import { initParallax } from './parallax';

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

initHeroLetters(document.querySelector<HTMLElement>('[data-hero-title]'), { reducedMotion });

initParallax(document.querySelectorAll<HTMLElement>('[data-parallax]'), { reducedMotion });
