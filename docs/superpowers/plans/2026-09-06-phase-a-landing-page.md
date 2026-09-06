# Fase A — Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Kodako HTML landing page (`index.html`) as a playful, animated, kid-friendly page — vanilla HTML/CSS/TS, no framework — using 20 pre-made original SVG assets and one bundled rounded webfont.

**Architecture:** `index.html` gets a full markup rewrite (nav, hero with a JS-split animated title, a CSS-only demo loop band, six redesigned content sections, footer). `src/landing/landing.css` is rewritten around design tokens + `@keyframes` + `@font-face`. `src/landing/landing.ts` stays a thin orchestrator that reads `prefers-reduced-motion` once and calls two new small modules — `hero-letters.ts` (splits the title into per-letter spans, runs a staggered bouncy intro, wires hover-to-replay) and `parallax.ts` (rAF-throttled scroll listener that writes a `--parallax-y` custom property). Every module guards missing elements and never throws.

**Tech Stack:** Vite 6 multi-page, TypeScript strict, Vitest + jsdom, Playwright, Prettier + ESLint 9. No framework, no runtime network calls.

**Spec:** `docs/superpowers/specs/2026-09-06-phase-a-landing-page-design.md`

## Global Constraints

- **Vanilla only.** No React/Vue/etc. No new npm dependencies. No CDN / no runtime network requests — the page must work fully offline.
- **Brand string:** every visible "Game HTML" on the landing page becomes **`Kodako HTML`** (hero, nav, `<title>`, `<meta og:*>`, "Untuk Guru" copy, footer). Do NOT rename anything outside `index.html` / `public/favicon.svg` (editor, Tauri, README, docs stay "Game HTML").
- **Palette — use these hex values only, as `:root` custom properties:** `--brand-blue #4C97FF`, `--brand-purple #9966FF`, `--block-blue #1E88E5`, `--block-green #59C059`, `--block-amber #FFBF00`, `--block-orange #FFAB19`, `--block-magenta #CF63CF`, `--block-sky #5CB1D6`, `--ink #2B2B38`, `--bg-tint #F5F7FF`, `--paper #FFFFFF`.
- **Motion:** all animation must be disabled under `@media (prefers-reduced-motion: reduce)`, and the two TS modules must no-op when `matchMedia('(prefers-reduced-motion: reduce)').matches` is true.
- **CTA targets:** `[data-cta-editor]` and the nav "Buka Editor" button → `/editor.html`. `[data-cta-download]` → `https://github.com/Pratametheus/Kodako-HTML/releases`.
- **Assets** live in `src/landing/assets/` (20 SVG + README) and `src/landing/fonts/` (`fredoka-semibold.woff2` + `OFL.txt`); they arrive via the branch merge in Task 1 — do not recreate them.
- **Commit trailers:** every commit message ends with these two lines:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
  ```
- **Full gate (must be green before the PR):** `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`.
- **Formatting:** the code blocks in this plan are not guaranteed Prettier-clean. After creating/editing any file in a task, run `npm run format` before that task's lint/commit step; a Prettier-only `lint` failure is fixed with `npm run format`, never by hand.

---

### Task 1: Branch setup, HTML skeleton, brand rename

**Files:**
- Create branch `phase-a-landing-page` from `origin/main`, merge `origin/phase-a-landing-assets` into it
- Modify: `index.html` (full body rewrite)
- Modify: `public/favicon.svg` (replace with the logo mark)
- Modify: `tests/unit/landing.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `index.html` DOM contract for later tasks —
  - `<h1 class="hero__title" data-hero-title>Kodako HTML</h1>` (Task 2 splits this)
  - `img.float-block[data-parallax][data-parallax-depth]` elements in `.hero__decor` (Task 3 reads these)
  - `<section class="demo" data-demo>` with `.demo__stage` containing `.demo__block--1/2/3` and `.demo__sprite` (Task 6 animates these)
  - `[data-year]` span in the footer (Task 4 fills this)
  - anchor ids `#apa-ini`, `#cara-pakai`, `#guru`

- [ ] **Step 1: Create the working branch and pull in the assets**

```bash
cd "C:/Users/Predator/orca/projects/Game HTML"   # or the assigned worktree
git fetch origin
git checkout -b phase-a-landing-page origin/main
git merge --no-edit origin/phase-a-landing-assets
```

Expected: a merge commit; `ls src/landing/assets` shows 20 files, `ls src/landing/fonts` shows `fredoka-semibold.woff2` and `OFL.txt`.

- [ ] **Step 2: Replace the favicon with the logo mark**

```bash
cp src/landing/assets/logo-kodako.svg public/favicon.svg
```

- [ ] **Step 3: Rewrite `index.html`**

Replace the entire file with:

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Kodako HTML — editor blok berbahasa Indonesia untuk belajar membuat animasi dan halaman web, ala Scratch. Gratis, bisa dipakai offline."
    />
    <meta property="og:title" content="Kodako HTML" />
    <meta
      property="og:description"
      content="Belajar membuat animasi dan halaman web dengan blok, berbahasa Indonesia."
    />
    <meta property="og:image" content="/favicon.svg" />
    <title>Kodako HTML — Belajar coding dengan blok</title>
    <link rel="stylesheet" href="/src/landing/landing.css" />
  </head>
  <body>
    <nav class="nav" data-nav>
      <a class="nav__brand" href="/">
        <img
          class="nav__logo"
          src="/src/landing/assets/logo-kodako.svg"
          alt=""
          width="32"
          height="32"
        />
        <span>Kodako HTML</span>
      </a>
      <div class="nav__links">
        <a href="#apa-ini">Apa ini?</a>
        <a href="#cara-pakai">Cara pakai</a>
        <a href="#guru">Untuk Guru</a>
      </div>
      <a class="btn btn--nav" href="/editor.html">Buka Editor</a>
    </nav>

    <header class="hero">
      <div class="hero__decor" aria-hidden="true">
        <img
          class="float-block"
          data-parallax
          data-parallax-depth="0.12"
          style="--x: 6%; --y: 12%; --r: -10deg"
          src="/src/landing/assets/block-amber.svg"
          alt=""
        />
        <img
          class="float-block"
          data-parallax
          data-parallax-depth="0.2"
          style="--x: 83%; --y: 8%; --r: 8deg"
          src="/src/landing/assets/block-sky.svg"
          alt=""
        />
        <img
          class="float-block"
          data-parallax
          data-parallax-depth="0.08"
          style="--x: 10%; --y: 68%; --r: 6deg"
          src="/src/landing/assets/block-green.svg"
          alt=""
        />
        <img
          class="float-block"
          data-parallax
          data-parallax-depth="0.16"
          style="--x: 80%; --y: 64%; --r: -8deg"
          src="/src/landing/assets/block-magenta.svg"
          alt=""
        />
        <img
          class="hero__tool"
          style="--x: 28%; --y: 6%; --r: -18deg"
          src="/src/landing/assets/tool-sparkle.svg"
          alt=""
        />
        <img
          class="hero__tool"
          style="--x: 66%; --y: 80%; --r: 12deg"
          src="/src/landing/assets/tool-paintbrush.svg"
          alt=""
        />
        <img class="hero__mascot" src="/src/landing/assets/mascot-peek.svg" alt="" />
      </div>
      <h1 class="hero__title" data-hero-title>Kodako HTML</h1>
      <p class="hero__tagline">
        Susun blok, buat animasi dan halaman web sendiri. Berbahasa Indonesia, bisa dipakai tanpa
        internet.
      </p>
      <div class="hero__cta">
        <a class="btn btn--primary" data-cta-editor href="/editor.html">▶ Mulai Buat</a>
        <a class="btn" data-cta-download href="https://github.com/Pratametheus/Kodako-HTML/releases"
          >Unduh Aplikasi</a
        >
      </div>
    </header>

    <section class="demo" data-demo aria-label="Contoh blok bekerja">
      <div class="demo__stage" aria-hidden="true">
        <span class="demo__block demo__block--1"></span>
        <span class="demo__block demo__block--2"></span>
        <span class="demo__block demo__block--3"></span>
        <span class="demo__sprite"></span>
      </div>
      <p class="demo__caption">Seret blok, sambungkan, lalu lihat tokohnya bergerak.</p>
    </section>

    <main class="landing">
      <section id="apa-ini" class="sec sec--apa">
        <div class="sec__body">
          <h2>Apa ini?</h2>
          <p>
            Kodako HTML adalah alat belajar pemrograman berbasis blok, mirip Scratch. Ada dua mode:
            <strong>Mode Sprite</strong> untuk membuat animasi dan permainan sederhana, dan
            <strong>Mode HTML</strong> untuk menyusun halaman web dan melihat kodenya.
          </p>
        </div>
        <div class="sec__decor" aria-hidden="true">
          <img src="/src/landing/assets/block-blue.svg" alt="" />
          <img src="/src/landing/assets/block-orange.svg" alt="" />
          <img class="sec__mascot" src="/src/landing/assets/mascot-point.svg" alt="" />
        </div>
      </section>

      <section id="cara-pakai" class="sec sec--steps">
        <h2>Cara pakai</h2>
        <ol class="steps">
          <li class="step">
            <span class="step__badge">1</span><span class="step__icon" aria-hidden="true">📂</span>
            Buka editor dan buat project baru.
          </li>
          <li class="step">
            <span class="step__badge">2</span><span class="step__icon" aria-hidden="true">🧩</span>
            Seret blok dari palet, susun jadi program.
          </li>
          <li class="step">
            <span class="step__badge">3</span><span class="step__icon" aria-hidden="true">▶️</span>
            Klik bendera hijau atau lihat pratinjau, lalu simpan project-mu.
          </li>
        </ol>
      </section>

      <section class="sec sec--modes">
        <article class="mode mode--sprite">
          <div class="mode__art" aria-hidden="true">
            <img src="/src/landing/assets/mascot-point.svg" alt="" />
            <img class="mode__chip" src="/src/landing/assets/block-blue.svg" alt="" />
          </div>
          <h3>Mode Sprite</h3>
          <p>
            Gerakkan tokoh di panggung dengan blok: gerak, ulangi, jika, dan kejadian "saat bendera
            hijau diklik".
          </p>
        </article>
        <article class="mode mode--html">
          <div class="mode__art" aria-hidden="true">
            <img src="/src/landing/assets/block-green.svg" alt="" />
            <img src="/src/landing/assets/block-magenta.svg" alt="" />
          </div>
          <h3>Mode HTML</h3>
          <p>
            Susun judul, paragraf, gambar, dan warna. Lihat halaman jadi sungguhan lengkap dengan
            panel "Lihat Kode".
          </p>
        </article>
      </section>

      <section id="guru" class="sec sec--guru">
        <h2>Untuk Guru</h2>
        <p>
          Kodako HTML adalah alat editor blok untuk mengajar animasi dan HTML dasar — bisa langsung
          dipakai di kelas, gratis, dan tanpa internet. Panduan singkat cara pakainya ada di tombol
          "Bantuan" di dalam editor.
        </p>
        <p>
          Untuk rencana pembelajaran, RPP, dan jurnal mengajar, kunjungi
          <a href="https://jurnal-mengajar-blond.vercel.app/">Jurnal Mengajar</a>.
        </p>
      </section>
    </main>

    <footer class="foot">
      <p>&copy; <span data-year>2026</span> Kodako HTML. Kode sumber terbuka.</p>
      <p>Aset ilustrasi buatan sendiri (CC0). Judul memakai font Fredoka (SIL OFL 1.1).</p>
    </footer>

    <script type="module" src="/src/landing/landing.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Rewrite the landing structure test**

Replace `tests/unit/landing.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const css = readFileSync(resolve(__dirname, '../../src/landing/landing.css'), 'utf8');

describe('landing page (index.html)', () => {
  it('is Indonesian and branded "Kodako HTML", not "Game HTML"', () => {
    expect(html).toContain('lang="id"');
    expect(html).toContain('<title>Kodako HTML');
    expect(html).not.toMatch(/Game HTML/);
    expect(html).toMatch(/data-hero-title[^>]*>Kodako HTML</);
  });

  it('points both editor CTAs at /editor.html and keeps the download CTA', () => {
    expect(html).toMatch(/data-cta-editor[^>]*href="\/editor\.html"/);
    expect(html).toMatch(/class="btn btn--nav" href="\/editor\.html"/);
    expect(html).toMatch(/data-cta-download[^>]*href="https:\/\/github\.com\/Pratametheus\/Kodako-HTML\/releases"/);
  });

  it('has every section, the demo band, and the year placeholder', () => {
    expect(html).toContain('data-demo');
    expect(html).toContain('id="apa-ini"');
    expect(html).toContain('id="cara-pakai"');
    expect(html).toContain('class="sec sec--modes"');
    expect(html).toContain('id="guru"');
    expect(html).toContain('data-year');
    expect(html).toContain('Jurnal Mengajar');
  });

  it('declares the bundled Fredoka font and a reduced-motion block', () => {
    expect(css).toMatch(/@font-face\s*\{[^}]*Fredoka/);
    expect(css).toContain('fredoka-semibold.woff2');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
```

- [ ] **Step 5: Run the test — it must fail on the CSS assertions only**

Run: `npm test -- landing.test`
Expected: the first three tests PASS; the fourth FAILS (`landing.css` still the old file). This confirms the HTML is right and the CSS work is real. (If an earlier test fails, fix the HTML.)

- [ ] **Step 6: Commit**

```bash
git add index.html public/favicon.svg tests/unit/landing.test.ts
git commit -m "feat(landing): new markup skeleton + Kodako HTML brand

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 2: `hero-letters.ts` — split + animate the hero title

**Files:**
- Create: `src/landing/hero-letters.ts`
- Test: `tests/unit/landing-hero.test.ts`

**Interfaces:**
- Consumes: `index.html`'s `<h1 data-hero-title>Kodako HTML</h1>`
- Produces:
  - `export interface HeroLettersOptions { reducedMotion: boolean }`
  - `export function initHeroLetters(container: HTMLElement | null, options: HeroLettersOptions): void`
  - After a normal call the container holds `span.hero-title__letter[data-dance]` per non-space char (with `--i` set) and `span.hero-title__space` per space; classes `hero-title--split` always, plus `hero-title--intro` (motion) or `hero-title--static` (reduced). Task 5's CSS targets exactly these.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- landing-hero`
Expected: FAIL — `Cannot find module '../../src/landing/hero-letters'`.

- [ ] **Step 3: Write the implementation**

Create `src/landing/hero-letters.ts`:

```ts
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
```

- [ ] **Step 4: Run the test — it must pass**

Run: `npm test -- landing-hero`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/landing/hero-letters.ts tests/unit/landing-hero.test.ts
git commit -m "feat(landing): hero-letters module — split + dance the title

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 3: `parallax.ts` — scroll parallax for the floating blocks

**Files:**
- Create: `src/landing/parallax.ts`
- Test: `tests/unit/landing-parallax.test.ts`

**Interfaces:**
- Consumes: `img.float-block[data-parallax][data-parallax-depth]` from `index.html`
- Produces:
  - `export interface ParallaxOptions { reducedMotion: boolean }`
  - `export function initParallax(nodes: Iterable<HTMLElement>, options: ParallaxOptions): () => void` — returns a cleanup function. On scroll it sets `style["--parallax-y"]` on each node to `${(-scrollY * depth).toFixed(1)}px` where `depth = Number(node.dataset.parallaxDepth ?? '0.1')`.

- [ ] **Step 1: Write the failing test**

```ts
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
    // non-null assertions: this repo's tsconfig has noUncheckedIndexedAccess
    expect(list[0]!.style.getPropertyValue('--parallax-y')).toBe('-20.0px');
    expect(list[1]!.style.getPropertyValue('--parallax-y')).toBe('-10.0px');
  });

  it('cleanup removes the scroll listener', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const stop = initParallax(nodes(), { reducedMotion: false });
    stop();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- landing-parallax`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/landing/parallax.ts`:

```ts
export interface ParallaxOptions {
  reducedMotion: boolean;
}

/**
 * Attach an rAF-throttled `scroll` listener that writes a `--parallax-y` custom
 * property onto each node — a small negative fraction of `window.scrollY`,
 * scaled by the node's `data-parallax-depth` (default `0.1`). No-op under
 * reduced motion or with no nodes. Returns a cleanup function that removes the
 * listener.
 */
export function initParallax(
  nodes: Iterable<HTMLElement>,
  options: ParallaxOptions,
): () => void {
  const list = Array.from(nodes);
  if (options.reducedMotion || list.length === 0) {
    return () => {};
  }

  let frame = 0;

  const apply = (): void => {
    frame = 0;
    const y = window.scrollY;
    for (const node of list) {
      const depth = Number(node.dataset.parallaxDepth ?? '0.1');
      node.style.setProperty('--parallax-y', `${(-y * depth).toFixed(1)}px`);
    }
  };

  const onScroll = (): void => {
    if (frame) return;
    frame = window.requestAnimationFrame(apply);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  apply();

  return () => {
    window.removeEventListener('scroll', onScroll);
    if (frame) window.cancelAnimationFrame(frame);
  };
}
```

- [ ] **Step 4: Run the test — it must pass**

Run: `npm test -- landing-parallax`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/landing/parallax.ts tests/unit/landing-parallax.test.ts
git commit -m "feat(landing): parallax module for the hero decor

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 4: `landing.ts` — wire it together

**Files:**
- Modify: `src/landing/landing.ts` (currently 2 lines)
- Test: covered by `tests/e2e/smoke.spec.ts` in Task 7; no new unit test (this file is pure wiring)

**Interfaces:**
- Consumes: `initHeroLetters` (Task 2), `initParallax` (Task 3), `index.html` DOM (Task 1)
- Produces: nothing importable — it is the page entry point

- [ ] **Step 1: Replace `src/landing/landing.ts`**

```ts
import { initHeroLetters } from './hero-letters';
import { initParallax } from './parallax';

const reducedMotion =
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

initHeroLetters(document.querySelector<HTMLElement>('[data-hero-title]'), { reducedMotion });

initParallax(document.querySelectorAll<HTMLElement>('[data-parallax]'), { reducedMotion });
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no output).

- [ ] **Step 3: Commit**

```bash
git add src/landing/landing.ts
git commit -m "feat(landing): wire hero-letters + parallax into the entry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 5: `landing.css` — full visual build

**Files:**
- Modify: `src/landing/landing.css` (full rewrite — currently 73 lines)

**Interfaces:**
- Consumes: DOM classes/attrs from Task 1 (`.nav`, `.hero`, `.float-block` with `--x/--y/--r/--parallax-y`, `.hero__title` with `.hero-title__letter[data-dance]` / `--i` from Task 2, `.demo` with `.demo__block--1/2/3` + `.demo__sprite`, `.sec*`, `.mode*`, `.step*`, `.foot`), and `src/landing/fonts/fredoka-semibold.woff2`
- Produces: the finished look; the `@font-face` + `@media (prefers-reduced-motion: reduce)` that `landing.test.ts` (Task 1) asserts

- [ ] **Step 1: Replace `src/landing/landing.css` with the full stylesheet**

```css
/* ============================================================
   Kodako HTML landing — "Blocky Playground"
   Vanilla CSS. All motion gated behind prefers-reduced-motion.
   ============================================================ */

@font-face {
  font-family: 'Fredoka';
  src: url('/src/landing/fonts/fredoka-semibold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

:root {
  --brand-blue: #4c97ff;
  --brand-purple: #9966ff;
  --block-blue: #1e88e5;
  --block-green: #59c059;
  --block-amber: #ffbf00;
  --block-orange: #ffab19;
  --block-magenta: #cf63cf;
  --block-sky: #5cb1d6;
  --ink: #2b2b38;
  --bg-tint: #f5f7ff;
  --paper: #ffffff;

  --font-display: 'Fredoka', system-ui, 'Segoe UI', sans-serif;
  --font-body:
    system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --radius: 16px;
  --wrap: 960px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--font-body);
  color: var(--ink);
  line-height: 1.55;
  background: var(--paper);
}

h1,
h2,
h3,
.nav__brand span {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 0.01em;
}

img {
  max-width: 100%;
}

/* ---------- buttons ---------- */
.btn {
  display: inline-block;
  text-decoration: none;
  font-weight: 700;
  font-size: 1rem;
  color: var(--ink);
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 999px;
  padding: 12px 22px;
  box-shadow: 0 4px 0 var(--ink);
  transition:
    transform 0.08s ease,
    box-shadow 0.08s ease;
}
.btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--ink);
}
.btn--primary {
  background: var(--block-amber);
  box-shadow: 0 4px 0 #b98a00;
}
.btn--primary:active {
  box-shadow: 0 1px 0 #b98a00;
}
.btn--nav {
  padding: 8px 16px;
  font-size: 0.9rem;
  box-shadow: 0 3px 0 var(--ink);
}

/* ---------- nav ---------- */
.nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px clamp(14px, 4vw, 32px);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(8px);
  border-bottom: 2px solid rgba(43, 43, 56, 0.12);
}
.nav__brand {
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  color: var(--ink);
  font-size: 1.1rem;
}
.nav__logo {
  width: 32px;
  height: 32px;
}
.nav__links {
  display: flex;
  gap: 18px;
  margin-left: auto;
}
.nav__links a {
  text-decoration: none;
  color: var(--ink);
  font-weight: 600;
  opacity: 0.8;
}
.nav__links a:hover {
  opacity: 1;
}
.nav .btn--nav {
  margin-left: 18px;
}
.nav__links + .btn--nav {
  margin-left: 0;
}

/* ---------- hero ---------- */
.hero {
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: clamp(48px, 9vw, 96px) 20px clamp(64px, 11vw, 120px);
  background: linear-gradient(165deg, var(--brand-blue), var(--brand-purple));
  color: var(--paper);
  border-bottom-left-radius: 44px;
  border-bottom-right-radius: 44px;
}
.hero__decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.float-block,
.hero__tool {
  position: absolute;
  left: var(--x);
  top: var(--y);
  transform: translateY(var(--parallax-y, 0)) rotate(var(--r, 0deg));
  width: clamp(70px, 12vw, 120px);
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.15));
  animation: drift 9s ease-in-out infinite;
}
.float-block:nth-of-type(2) {
  animation-duration: 11s;
  animation-direction: reverse;
}
.float-block:nth-of-type(3) {
  animation-duration: 10s;
}
.float-block:nth-of-type(4) {
  animation-duration: 12s;
  animation-direction: reverse;
}
.hero__tool {
  width: clamp(34px, 5vw, 52px);
  animation-name: bob;
  animation-duration: 6s;
}
.hero__mascot {
  position: absolute;
  right: clamp(-10px, 3vw, 40px);
  bottom: 0;
  width: clamp(120px, 20vw, 190px);
  animation: bob 5s ease-in-out infinite;
}

@keyframes drift {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -14px;
  }
}
@keyframes bob {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -8px;
  }
}

.hero__title {
  position: relative;
  margin: 0 0 12px;
  font-size: clamp(2.4rem, 8vw, 4.2rem);
}
.hero-title__letter {
  display: inline-block;
  will-change: transform;
}
.hero-title__space {
  display: inline-block;
  width: 0.3em;
}
.hero-title--intro .hero-title__letter {
  animation: hero-in 0.62s cubic-bezier(0.2, 1.5, 0.35, 1) both;
  animation-delay: calc(var(--i) * 45ms);
}
@keyframes hero-in {
  0% {
    opacity: 0;
    transform: translateY(28px) rotate(-8deg) scale(0.7);
  }
  60% {
    opacity: 1;
    transform: translateY(-6px) rotate(3deg) scale(1.08);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}

/* 8 hover dances, chosen per data-dance */
.hero-title__letter[data-dance='0'].is-dancing {
  animation: hero-dance-0 0.7s ease;
}
.hero-title__letter[data-dance='1'].is-dancing {
  animation: hero-dance-1 0.9s cubic-bezier(0.25, 0.9, 0.3, 1.3);
}
.hero-title__letter[data-dance='2'].is-dancing {
  animation: hero-dance-2 0.6s ease-out;
}
.hero-title__letter[data-dance='3'].is-dancing {
  animation: hero-dance-3 0.55s ease;
}
.hero-title__letter[data-dance='4'].is-dancing {
  animation: hero-dance-4 0.7s ease-in-out;
}
.hero-title__letter[data-dance='5'].is-dancing {
  animation: hero-dance-5 0.5s linear;
}
.hero-title__letter[data-dance='6'].is-dancing {
  animation: hero-dance-6 0.8s ease-in-out;
}
.hero-title__letter[data-dance='7'].is-dancing {
  animation: hero-dance-7 0.75s ease;
}
@keyframes hero-dance-0 {
  30% {
    transform: scale(1.25, 0.75);
  }
  55% {
    transform: scale(0.8, 1.2);
  }
  75% {
    transform: scale(1.1, 0.9);
  }
  100% {
    transform: none;
  }
}
@keyframes hero-dance-1 {
  0% {
    transform: rotate(0);
    transform-origin: bottom left;
  }
  40% {
    transform: rotate(22deg);
    transform-origin: bottom left;
  }
  70% {
    transform: rotate(-12deg);
  }
  100% {
    transform: none;
  }
}
@keyframes hero-dance-2 {
  25% {
    transform: translateY(6px) scaleY(0.7);
  }
  55% {
    transform: translateY(-22px) scaleY(1.12);
  }
  100% {
    transform: none;
  }
}
@keyframes hero-dance-3 {
  40% {
    transform: scale(1.4);
  }
  100% {
    transform: none;
  }
}
@keyframes hero-dance-4 {
  20% {
    transform: translateX(-9px);
  }
  50% {
    transform: translateX(7px);
  }
  75% {
    transform: translateX(-4px);
  }
  100% {
    transform: none;
  }
}
@keyframes hero-dance-5 {
  10%,
  30%,
  50%,
  70% {
    transform: translate(-2px, 1px) rotate(-4deg);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translate(2px, -1px) rotate(4deg);
  }
  100% {
    transform: none;
  }
}
@keyframes hero-dance-6 {
  50% {
    transform: translateY(-16px) scale(1.1);
    text-shadow: 0 14px 14px rgba(0, 0, 0, 0.25);
  }
  100% {
    transform: none;
  }
}
@keyframes hero-dance-7 {
  100% {
    transform: rotate(360deg);
  }
}

.hero__tagline {
  max-width: 30ch;
  margin: 0 auto 22px;
  font-size: clamp(0.95rem, 2.4vw, 1.15rem);
  opacity: 0.95;
}
.hero__cta {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}
.hero__cta .btn {
  color: var(--ink);
}

/* ---------- demo band ---------- */
.demo {
  max-width: var(--wrap);
  margin: -40px auto 0;
  padding: 22px;
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: var(--radius);
  box-shadow: 0 10px 30px rgba(43, 43, 56, 0.12);
  text-align: center;
}
.demo__stage {
  position: relative;
  height: 150px;
  margin: 0 auto 10px;
  max-width: 520px;
  background: var(--bg-tint);
  border-radius: 12px;
  overflow: hidden;
}
.demo__block {
  position: absolute;
  left: 60px;
  width: 200px;
  height: 34px;
  border: 2px solid var(--ink);
  border-radius: 8px;
}
.demo__block--1 {
  top: 24px;
  background: var(--block-blue);
  animation: demo-slide 7s ease-in-out infinite;
}
.demo__block--2 {
  top: 60px;
  background: var(--block-green);
  animation: demo-slide 7s ease-in-out infinite 0.5s;
}
.demo__block--3 {
  top: 96px;
  background: var(--block-amber);
  animation: demo-slide 7s ease-in-out infinite 1s;
}
@keyframes demo-slide {
  0% {
    transform: translateX(-320px);
  }
  18%,
  82% {
    transform: translateX(0);
  }
  22% {
    transform: translateX(0) scaleX(1.06);
  }
  100% {
    transform: translateX(-320px);
  }
}
.demo__sprite {
  position: absolute;
  top: 54px;
  left: 300px;
  width: 34px;
  height: 34px;
  background: var(--block-magenta);
  border: 2px solid var(--ink);
  border-radius: 10px;
  animation: demo-hop 7s ease-in-out infinite 1.4s;
}
.demo__sprite::before,
.demo__sprite::after {
  content: '';
  position: absolute;
  top: 11px;
  width: 5px;
  height: 5px;
  background: var(--paper);
  border-radius: 50%;
}
.demo__sprite::before {
  left: 8px;
}
.demo__sprite::after {
  right: 8px;
}
@keyframes demo-hop {
  0%,
  100% {
    transform: translate(0, 0);
  }
  20% {
    transform: translate(40px, -22px);
  }
  40% {
    transform: translate(80px, 0);
  }
  60% {
    transform: translate(120px, -22px);
  }
  80% {
    transform: translate(150px, 0);
  }
}
.demo__caption {
  margin: 4px 0 0;
  font-weight: 600;
  color: rgba(43, 43, 56, 0.75);
}

/* ---------- content sections ---------- */
.landing {
  max-width: var(--wrap);
  margin: 0 auto;
  padding: 20px;
}
.sec {
  padding: clamp(36px, 7vw, 64px) 0;
  border-bottom: 2px dashed rgba(43, 43, 56, 0.12);
}
.sec:last-child {
  border-bottom: 0;
}
.sec h2 {
  font-size: clamp(1.5rem, 4vw, 2rem);
  margin: 0 0 14px;
}
.sec--apa {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 24px;
  align-items: center;
}
.sec__decor {
  position: relative;
  min-height: 150px;
}
.sec__decor img {
  position: absolute;
  width: 120px;
}
.sec__decor img:nth-child(1) {
  left: 0;
  top: 10px;
  transform: rotate(-8deg);
}
.sec__decor img:nth-child(2) {
  left: 40px;
  top: 54px;
  transform: rotate(6deg);
}
.sec__mascot {
  right: 0;
  top: 0;
  width: 130px !important;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}
.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: var(--radius);
  box-shadow: 0 4px 0 rgba(43, 43, 56, 0.18);
  font-weight: 600;
}
.step__badge {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--brand-blue);
  color: var(--paper);
  font-family: var(--font-display);
}
.step:nth-child(2) .step__badge {
  background: var(--block-green);
}
.step:nth-child(3) .step__badge {
  background: var(--block-orange);
}
.step__icon {
  font-size: 1.3rem;
}

.sec--modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.mode {
  padding: 22px;
  border: 2px solid var(--ink);
  border-radius: var(--radius);
  background: var(--paper);
  box-shadow: 0 6px 0 rgba(43, 43, 56, 0.15);
}
.mode--sprite {
  border-bottom: 8px solid var(--brand-blue);
}
.mode--html {
  border-bottom: 8px solid var(--block-green);
}
.mode__art {
  position: relative;
  height: 110px;
  margin-bottom: 8px;
}
.mode__art img {
  position: absolute;
  height: 96px;
}
.mode__art img:first-child {
  left: 8px;
  top: 0;
}
.mode__chip,
.mode__art img:nth-child(2) {
  height: 44px !important;
  left: 90px;
  top: 30px;
}
.mode h3 {
  margin: 0 0 6px;
}
.mode p {
  margin: 0;
}

.sec--guru p {
  max-width: 62ch;
}
.sec--guru a {
  color: var(--brand-blue);
  font-weight: 700;
}

/* ---------- footer ---------- */
.foot {
  text-align: center;
  padding: 28px 20px 40px;
  background: var(--bg-tint);
  color: rgba(43, 43, 56, 0.7);
  font-size: 0.9rem;
}
.foot p {
  margin: 4px 0;
}

/* ---------- responsive ---------- */
@media (max-width: 760px) {
  .nav__links {
    display: none;
  }
  .nav .btn--nav {
    margin-left: auto;
  }
  .sec--apa,
  .sec--modes {
    grid-template-columns: 1fr;
  }
  .hero__mascot {
    width: 110px;
  }
  .float-block:nth-of-type(3),
  .float-block:nth-of-type(4) {
    display: none;
  }
}

/* ---------- reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
  .demo__block--1,
  .demo__block--2,
  .demo__block--3 {
    transform: translateX(0);
  }
  .demo__sprite {
    transform: translate(80px, 0);
  }
}
```

- [ ] **Step 2: Run the landing structure test**

Run: `npm test -- landing.test`
Expected: all 4 tests PASS (the `@font-face` / `fredoka-semibold.woff2` / reduced-motion assertions now match).

- [ ] **Step 3: Build and eyeball the output**

Run: `npm run build`
Expected: build succeeds; `dist/index.html`, `dist/editor.html`, and `dist/assets/fredoka-semibold-*.woff2` all present; no new errors (the pre-existing vendor-blockly ">700 kB" warning is unrelated).

- [ ] **Step 4: Manual browser check** (record the result in the commit body)

Run: `npm run dev`, open `http://localhost:5173/`. Confirm: hero letters pop in staggered and settle; hovering a letter replays a dance; floating blocks drift and shift slightly on scroll; mascot peeks and bobs; buttons depress on click; nav sticks on scroll; layout collapses to one column under ~760px. Then toggle OS "reduce motion" and reload — everything is static, the demo band shows the blocks stacked with the sprite mid-stage.

- [ ] **Step 5: Commit**

```bash
git add src/landing/landing.css
git commit -m "feat(landing): full Blocky Playground stylesheet

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 6: E2E, docs, and the full gate

**Files:**
- Modify: `tests/e2e/smoke.spec.ts` (the landing test)
- Modify: `docs/Design.md` (§10)

**Interfaces:**
- Consumes: the finished page from Tasks 1–5
- Produces: green full gate + a PR

- [ ] **Step 1: Update the E2E landing test**

In `tests/e2e/smoke.spec.ts`, replace the `test('landing page is served at the site root and links to the editor', …)` body with:

```ts
test('landing page is served at the site root and links to the editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kodako HTML');
  await expect(page.locator('[data-demo]')).toBeVisible();
  await page.getByRole('link', { name: 'Mulai Buat' }).click();
  await expect(page).toHaveURL(/editor\.html/);
});
```

Note: the `<h1>` text is split into spans by `hero-letters.ts`; `toHaveText` on the heading still returns the concatenated text `"Kodako HTML"` (the `\u00A0` in the space span renders as a normal space to Playwright's text matcher — if it fails on the non-breaking space, use `expect(page.getByRole('heading', { level: 1 })).toContainText('Kodako')` and a second `toContainText('HTML')`).

- [ ] **Step 2: Run E2E**

Run: `npm run test:e2e`
Expected: 10 passed.

- [ ] **Step 3: Update `docs/Design.md` §10**

Find the "## 10. Landing page" section and replace its body with:

```markdown
## 10. Landing page (`index.html`, di root situs)

- Statis, dibangun oleh Vite sebagai salah satu halaman (`build.rollupOptions.input`).
- Arah visual "Blocky Playground" (lihat
  `docs/superpowers/specs/2026-09-06-phase-a-landing-page-design.md`): nama merek
  "Kodako HTML", palet warna kategori editor, tombol tebal dengan bayangan solid.
- Bagian: nav sticky · Hero (judul kartu-huruf beranimasi, tagline, tombol
  "Mulai Buat" → `editor.html`, "Unduh Aplikasi" → GitHub Releases) · pita demo
  (loop SVG/CSS) · "Apa ini?" · 3 langkah cara pakai · dua kartu mode · bagian
  untuk guru (tautan Jurnal Mengajar) · footer.
- Aset ilustrasi orisinal CC0 di `src/landing/assets/`; judul memakai Fredoka
  (SIL OFL 1.1) yang di-*bundle* di `src/landing/fonts/` — tanpa CDN, jalan
  offline. Semua animasi mati di bawah `prefers-reduced-motion`.
```

- [ ] **Step 4: Run the full gate**

```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e
```

Expected: every step exit 0. Unit count = previous + ~13 (Task 1 rewrites 4, Task 2 adds 5, Task 3 adds 4). E2E = 10. `check:chunks` unchanged ("editor entry chunk … OK"). Record `du -sh dist` before/after in the PR body.

- [ ] **Step 5: Commit and open the PR**

```bash
git add tests/e2e/smoke.spec.ts docs/Design.md
git commit -m "test(landing): e2e for the redesigned page + Design.md update

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
git push -u origin phase-a-landing-page
gh pr create --base main --head phase-a-landing-page \
  --title "Fase A: landing page redesign (Blocky Playground)" \
  --body "Implements docs/superpowers/specs/2026-09-06-phase-a-landing-page-design.md. Vanilla rewrite of index.html + landing.css; new hero-letters.ts / parallax.ts; 20 original CC0 SVGs + bundled Fredoka (OFL); demo loop; brand → \"Kodako HTML\" on the landing page only. Full gate green. prefers-reduced-motion honoured.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
| --- | --- |
| §1 brand rename "Kodako HTML" + favicon | Task 1 (steps 2–3), test in Task 1 step 4 |
| §2 direction / palette tokens / chunky buttons | Task 5 |
| §3 structure: nav, hero, demo band, apa ini, cara pakai, dua mode, guru, footer | Task 1 (markup) + Task 5 (style) |
| §4 Fredoka bundled, headings only, offline | assets branch (font vendored) + Task 5 `@font-face` + Task 1 test |
| §5 demo loop SVG/CSS, frozen under reduced motion | Task 1 markup + Task 5 (`demo-*` keyframes + reduced-motion block) + Task 6 e2e |
| §6 asset integration via branch merge, `<img>` refs | Task 1 step 1 + markup |
| §7 hero-letters, parallax, drift/bob, reduced-motion guards | Task 2, Task 3, Task 4, Task 5 |
| Unit & boundary table | Tasks 2–5 create exactly those files |
| Testing section | Task 1 step 4, Task 2, Task 3, Task 6 |
| Out of scope | nothing here touches editor/Tauri/docs beyond Design.md §10 |

No gaps.

**2. Placeholder scan** — no "TBD"/"add error handling"/"write tests for the above"; every code step has real code; every test step has real assertions.

**3. Type consistency** — `initHeroLetters(container, options)` and `initParallax(nodes, options)` signatures match between their defining tasks (2, 3), the wiring task (4), and the interface blocks. `HeroLettersOptions` / `ParallaxOptions` both `{ reducedMotion: boolean }`. DOM contract names (`data-hero-title`, `hero-title__letter`, `data-dance`, `--i`, `float-block`, `data-parallax`, `data-parallax-depth`, `--parallax-y`, `data-demo`, `demo__block--1/2/3`, `demo__sprite`, `data-year`) are identical in Task 1 (producer), Tasks 2–3 (consumers), and Task 5 (CSS).
