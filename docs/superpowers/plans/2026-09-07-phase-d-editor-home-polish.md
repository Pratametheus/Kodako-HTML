# Fase D — Poles Home & panel kanan editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Home screen up to the landing page's playful visual identity, tidy the messy HTML-mode right panel, add hover states to editor buttons, fix the empty-canvas hint that never hides, and wrap the HTML preview in a fake browser window with a title tab.

**Architecture:** Almost entirely CSS. Two PRs. **PR-D1** = Home: a shared Fredoka `@font-face` in `src/styles/base.css` + a token block and playful restyle in `src/app/home/home.css` (no markup change). **PR-D2** = editor: a one-line CSS specificity fix for the hint bug; one tiny pure module `src/runtime/html/page-title.ts` (`extractTitle` + `slugifyTitle`); a restructure of the HTML-mode output panel markup + CSS (action bar / segmented tabs / bottom info status bar / browser chrome around the preview iframe); and a restrained hover system across `editor.css` + `html-mode.css` + `sprite-mode.css`. Blockly blocks, the Zelos renderer, and `spriteTheme` are untouched.

**Tech Stack:** Vite 6 multi-page (`index.html` landing, `editor.html` app), TypeScript strict (`noUncheckedIndexedAccess` on), Blockly 11.2.2 (`zelos`), Vitest + jsdom, Playwright, Prettier + ESLint 9. No new npm deps, no CDN.

**Spec:** `docs/superpowers/specs/2026-09-07-phase-d-editor-home-polish-design.md`

## Global Constraints

- **No new npm dependencies. No CDN / no runtime network calls.**
- **Blockly blocks, the `zelos` renderer, and `spriteTheme` (`src/blocks/theme.ts`) are NOT changed.** Only surrounding chrome / CSS / one pure helper module.
- **HTML block field names are frozen.** No generator or block-definition changes.
- **`src/landing/landing.css` is NOT touched** — the deployed landing page must not regress.
- **Preserve every DOM hook the tests use.** Unit (`tests/unit/html-mode-view.test.ts`): `#htmlBlocklyDiv`, `[data-block-info]`, `iframe` (with `sandbox="allow-same-origin"`), `[data-tab="preview"]`, `[data-tab="code"]`, `[data-export-html]`, `[data-run-html]`, `[data-panel="code"]`, `[data-panel="preview"]`. E2E (`tests/e2e/html-mode.spec.ts`): `getByRole('button', { name: 'Jalankan' })`, `getByRole('tab', { name: 'Pratinjau' })`, `getByRole('tab', { name: 'Lihat Kode' })`, `getByRole('button', { name: 'Ekspor HTML' })`, `.html-mode iframe`, `[data-panel="code"]`, `.html-mode__code`, `[data-block-info]`, `.blocklyDraggable`. Home (`tests/unit/home-view.test.ts`, `tests/unit/a11y-smoke.test.ts`): `[data-action]`, `.card`, `.card__name`, `.card__date`, `[data-list]`, `.home__empty`.
- **i18n:** any new string in `src/app/i18n/id.json` must be pure Bahasa Indonesia and must NOT contain any of the substrings `tests/unit/i18n.test.ts` blocks: `Run ` `Stop` `Costume` `Upload` `Delete` `Backdrop` `Preview` `View Code` `Export` `Image too large` `File is not an image` `Reload` `Copy` `Close`.
- **Run buttons stay icon-only** (`▶`), keeping `aria-label` + `title` = `t('editor.html.run')` ("Jalankan").
- **All `transform`-based hover motion is gated** behind `@media (prefers-reduced-motion: reduce)`.
- **Formatting:** code blocks here are not guaranteed Prettier-clean. After editing any file in a task, run `npm run format` before that task's lint/commit step; a Prettier-only `lint` failure is fixed with `npm run format`, never by hand.
- **Commit trailers** — every commit message ends with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
  ```
- **Full gate (green before each PR):** `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`.
- **Branches:** PR-D1 on `phase-d1-home-polish`, PR-D2 on `phase-d2-editor-panel-polish`, both off `main`. `gh pr merge` is blocked in this environment — open the PR and stop; the user merges.

---

# PR-D1 — Home page polish

Branch: `phase-d1-home-polish` off `main`.

### Task 1: Fredoka font + Home restyle (CSS only)

**Files:**
- Modify: `src/styles/base.css` (add one `@font-face`)
- Modify: `src/app/home/home.css` (full restyle)
- Test: `tests/unit/home-view.test.ts`, `tests/unit/a11y-smoke.test.ts` (must stay green — no new assertions needed; Home change is presentational)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a `Fredoka` font family available app-wide via `src/styles/base.css` (imported by `src/main.ts`); no JS API.

- [ ] **Step 1: Confirm the baseline is green**

Run: `npx vitest run tests/unit/home-view.test.ts tests/unit/a11y-smoke.test.ts`
Expected: PASS (this is the regression guard for Home markup).

- [ ] **Step 2: Add the shared Fredoka `@font-face` to `src/styles/base.css`**

Insert at the very top of `src/styles/base.css`, before the `*` reset:

```css
@font-face {
  font-family: 'Fredoka';
  src: url('/src/landing/fonts/fredoka-semibold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
```

This is the identical `url()` `src/landing/landing.css` already ships in production — do not move or rename the file, and do not edit `landing.css`.

- [ ] **Step 3: Rewrite `src/app/home/home.css`**

Replace the entire file with:

```css
.home {
  --home-ink: #2b2b38;
  --home-ground: #f5f7ff;
  --home-paper: #ffffff;
  --home-edge: #2b2b38;
  --home-soft: rgb(43 43 56 / 14%);
  --home-radius: 16px;
  --home-accent: #ffbf00;
  --home-accent-shadow: #b98a00;
  --home-blue: #4c97ff;

  max-width: 1040px;
  margin: 0 auto;
  padding: clamp(20px, 4vw, 40px);
  min-height: 100%;
  background: var(--home-ground);
}

.home > h1 {
  margin: 0 0 20px;
  font-family: 'Fredoka', system-ui, 'Segoe UI', sans-serif;
  font-weight: 600;
  font-size: clamp(1.6rem, 4vw, 2rem);
  letter-spacing: 0.01em;
  color: var(--home-ink);
}

.home > h1::before {
  content: '📁 ';
}

.home__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 28px;
}

.home__actions .btn {
  border: 2px solid var(--home-edge);
  border-radius: 999px;
  padding: 10px 20px;
  font-weight: 700;
  color: var(--home-ink);
  background: var(--home-paper);
  box-shadow: 0 4px 0 var(--home-edge);
  transition:
    transform 0.08s ease,
    box-shadow 0.08s ease;
}

.home__actions .btn:hover {
  background: #f4f7ff;
}

.home__actions .btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--home-edge);
}

.home__actions .btn-primary {
  background: var(--home-accent);
  border-color: var(--home-edge);
  color: var(--home-ink);
  box-shadow: 0 4px 0 var(--home-accent-shadow);
}

.home__actions .btn-primary:hover {
  filter: brightness(0.97);
}

.home__actions .btn-primary:active {
  box-shadow: 0 1px 0 var(--home-accent-shadow);
}

.home__list {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

.card {
  border: 2px solid var(--home-soft);
  border-radius: var(--home-radius);
  padding: 16px;
  background: var(--home-paper);
  box-shadow:
    0 1px 2px rgb(30 41 80 / 6%),
    0 8px 20px rgb(30 41 80 / 5%);
  transition:
    transform 0.12s ease,
    border-color 0.12s ease;
}

.card:hover {
  border-color: var(--home-blue);
  transform: translateY(-2px);
}

.card__name {
  font-weight: 700;
  font-size: 1rem;
  margin: 0 0 4px;
}

.card__date {
  color: #6b7280;
  font-size: 12px;
  margin: 0 0 12px;
}

.card__date::before {
  content: '📅 ';
}

.card__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.card__buttons .btn {
  padding: 5px 12px;
  font-size: 12px;
  border: 2px solid var(--home-soft);
  border-radius: 999px;
  background: var(--home-paper);
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease;
}

.card__buttons .btn:hover {
  background: #eef4ff;
  border-color: var(--home-blue);
}

.home__empty {
  border: 2px dashed var(--home-soft);
  border-radius: var(--home-radius);
  padding: 28px;
  text-align: center;
  color: #5b6472;
}

.home__empty::before {
  content: '✨ ';
}

@media (prefers-reduced-motion: reduce) {
  .home__actions .btn,
  .home__actions .btn:active,
  .card,
  .card:hover {
    transition: none;
    transform: none;
  }
}
```

- [ ] **Step 4: Format**

Run: `npm run format`

- [ ] **Step 5: Re-run the Home regression tests + typecheck + build**

Run: `npx vitest run tests/unit/home-view.test.ts tests/unit/a11y-smoke.test.ts && npm run typecheck && npm run build`
Expected: PASS. The build must succeed with the new `@font-face` (Vite resolves the `/src/landing/fonts/...` URL to the real file and hashes it).

- [ ] **Step 6: Visual check (manual note for the reviewer)**

Load `editor.html#/` (Home). Confirm: Fredoka heading with the folder emoji; "Project Baru" is an amber sticker button with a hard drop shadow that presses down on `:active`; project cards lift and gain a blue border on hover; empty state is a dashed friendly card. Compare side-by-side with `index.html` — the button/però and colour language should read as the same family.

- [ ] **Step 7: Commit**

```bash
git add src/styles/base.css src/app/home/home.css
git commit -m "$(cat <<'EOF'
feat(home): match landing page's playful visual identity

Fredoka display heading, amber "sticker" primary button with a hard
drop-shadow, rounded cards with a hover lift, and a friendly dashed
empty state. CSS-only; Home markup and every test hook unchanged.
landing.css is untouched.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

### Task 2: PR-D1 docs + gate + open PR

**Files:**
- Modify: `docs/ROADMAP.md` (add a Fase D / PR-D1 line under the Fase C paragraph)

- [ ] **Step 1: Add the ROADMAP note**

Append after the Fase C paragraph in `docs/ROADMAP.md`:

```markdown
Fase D (2026-09-07) — poles pasca-Fase C, dua PR. **PR-D1:** Home
("Project Saya") disamakan rasanya dengan landing page (font Fredoka,
tombol "stiker" amber, kartu membulat + hover, empty state ramah).
Lihat `docs/superpowers/specs/2026-09-07-phase-d-editor-home-polish-design.md`.
```

- [ ] **Step 2: Full gate**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`
Expected: all green.

- [ ] **Step 3: Commit + push + open PR**

```bash
git add docs/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: ROADMAP note for Fase D PR-D1 (Home polish)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
git push -u origin phase-d1-home-polish
gh pr create --base main --title "Fase D · PR-D1 — Home page playful polish" --body "$(cat <<'EOF'
## Ringkasan

Home ("Project Saya") disamakan rasa visualnya dengan landing page.

- `@font-face` Fredoka bersama di `src/styles/base.css` (path berkas
  yang sama dengan landing; `landing.css` tidak disentuh).
- `home.css`: token `.home`, judul Fredoka, tombol "stiker" amber
  dengan drop-shadow keras + `:active` press, kartu membulat dengan
  hover lift (digating `prefers-reduced-motion`), empty state kartu
  putus-putus yang ramah.
- **CSS-only** — markup Home dan semua hook tes tidak berubah.

Spec: `docs/superpowers/specs/2026-09-07-phase-d-editor-home-polish-design.md`

## Tes

- `home-view.test.ts` + `a11y-smoke` hijau (regression guard markup).
- Gate penuh hijau.
- QA visual: Home vs landing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

Stop after `gh pr create`. The user merges.

---

# PR-D2 — Editor panel polish

Branch: `phase-d2-editor-panel-polish` off `main` (after PR-D1 merges, or off `main` independently — the two PRs do not touch the same files).

## File structure (PR-D2)

| File | Responsibility |
|---|---|
| `src/app/editor/html-mode/html-mode.css` | **new:** `.html-mode__hint[hidden]` fix; output panel grid rows; `.html-mode__actionbar` / `.html-mode__tabs` / `.html-mode__infobar`; `.html-mode__browser*` chrome; neutral+primary button `:hover` |
| `src/app/editor/html-mode/html-mode.ts` | **modify:** `host.innerHTML` restructure (action bar, segmented tabs, bottom info bar, browser chrome around the iframe); `refresh()` sets the preview tab label + URL slug |
| `src/runtime/html/page-title.ts` | **new pure module:** `extractTitle(headHtml, fallback)`, `slugifyTitle(title)` |
| `src/app/editor/editor.css` | **modify:** `.editor .btn:hover` + reduced-motion gate |
| `src/app/editor/sprite-mode/sprite-mode.css` | **modify:** neutral + primary button `:hover` |
| `src/app/i18n/id.json` | **modify:** add `a11y.previewChrome` |
| `tests/unit/html-page-title.test.ts` | **new:** unit tests for the pure module |
| `tests/e2e/html-mode.spec.ts` | **modify:** assert hint hides; assert preview tab shows the `<title>` |

### Task 1: Fix the empty-canvas hint bug

**Files:**
- Modify: `src/app/editor/html-mode/html-mode.css` (one rule)
- Test: `tests/e2e/html-mode.spec.ts` (add one assertion to the first test)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (behavioural fix only).

**Why:** `syncHint()` correctly sets `hint.hidden`, but the author rule `.html-mode__hint { display: grid }` overrides the user-agent `[hidden] { display: none }` rule (author beats UA regardless of specificity), so the `hidden` attribute has no visible effect.

- [ ] **Step 1: Add the failing E2E assertion**

In `tests/e2e/html-mode.spec.ts`, in the first test (`'HTML mode previews, highlights, exports, and preserves a page'`), immediately after the `await page.evaluate(() => { ... B.serialization.workspaces.load(...) })` block that loads the fixture blocks (currently ends at line ~59, before `await expect(page.getByRole('button', { name: 'Jalankan' })).toBeVisible();`), insert:

```ts
  // Bug fix (Fase D): the empty-canvas hint must disappear once blocks exist.
  await expect(page.locator('.html-mode__hint')).toBeHidden();
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx playwright test tests/e2e/html-mode.spec.ts -g "previews, highlights"`
Expected: FAIL — the hint is still visible because `.html-mode__hint { display: grid }` wins over `[hidden]`.

- [ ] **Step 3: Add the CSS fix**

In `src/app/editor/html-mode/html-mode.css`, immediately after the `.html-mode__hint { ... }` rule block, add:

```css
.html-mode__hint[hidden] {
  display: none;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx playwright test tests/e2e/html-mode.spec.ts -g "previews, highlights"`
Expected: PASS.

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/app/editor/html-mode/html-mode.css tests/e2e/html-mode.spec.ts
git commit -m "$(cat <<'EOF'
fix(html-mode): empty-canvas hint now hides once a block is on the canvas

`.html-mode__hint { display: grid }` (author) was overriding the UA
`[hidden] { display: none }`, so syncHint()'s `hint.hidden = true` had
no visible effect. Add an explicit `.html-mode__hint[hidden]` rule.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

### Task 2: `page-title.ts` — pure title + slug helpers

**Files:**
- Create: `src/runtime/html/page-title.ts`
- Test: `tests/unit/html-page-title.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export function extractTitle(headHtml: string, fallback: string): string`
  - `export function slugifyTitle(title: string): string` — always returns a string ending in `.html`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/html-page-title.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { extractTitle, slugifyTitle } from '../../src/runtime/html/page-title';

describe('extractTitle', () => {
  it('reads the text of a <title> tag', () => {
    expect(extractTitle('<title>Halaman Saya</title>', 'x')).toBe('Halaman Saya');
  });
  it('trims surrounding whitespace and newlines', () => {
    expect(extractTitle('<title>\n  Halo  \n</title>', 'x')).toBe('Halo');
  });
  it('tolerates attributes on the tag', () => {
    expect(extractTitle('<title data-x="1">Judul</title>', 'x')).toBe('Judul');
  });
  it('decodes the basic HTML entities', () => {
    expect(extractTitle('<title>Aku &amp; Kamu</title>', 'x')).toBe('Aku & Kamu');
  });
  it('falls back when there is no <title>', () => {
    expect(extractTitle('<meta charset="utf-8">', 'Tanpa Judul')).toBe('Tanpa Judul');
  });
  it('falls back when the <title> is empty', () => {
    expect(extractTitle('<title></title>', 'Tanpa Judul')).toBe('Tanpa Judul');
  });
});

describe('slugifyTitle', () => {
  it('lowercases and hyphenates spaces, always ending in .html', () => {
    expect(slugifyTitle('Halaman Saya')).toBe('halaman-saya.html');
  });
  it('drops punctuation and collapses repeats', () => {
    expect(slugifyTitle('Aku & Kamu!!!  (v2)')).toBe('aku-kamu-v2.html');
  });
  it('returns halaman.html for an empty title', () => {
    expect(slugifyTitle('   ')).toBe('halaman.html');
  });
  it('truncates very long titles to 40 chars of slug', () => {
    const slug = slugifyTitle('a'.repeat(120));
    expect(slug).toBe(`${'a'.repeat(40)}.html`);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/html-page-title.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/runtime/html/page-title.ts`**

```ts
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** Read the text content of the first `<title>` in `headHtml`; `fallback` if absent or empty. */
export function extractTitle(headHtml: string, fallback: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(headHtml);
  const raw = (match?.[1] ?? '').replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
  const text = raw.trim();
  return text.length > 0 ? text : fallback;
}

/** A friendly file-name slug for the fake address bar. Always ends in `.html`. */
export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `${slug.length > 0 ? slug : 'halaman'}.html`;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/unit/html-page-title.test.ts`
Expected: PASS (all 10).

- [ ] **Step 5: Format + commit**

```bash
npm run format
git add src/runtime/html/page-title.ts tests/unit/html-page-title.test.ts
git commit -m "$(cat <<'EOF'
feat(html): pure extractTitle + slugifyTitle helpers for the preview tab

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

### Task 3: Restructure the HTML-mode output panel + browser chrome

**Files:**
- Modify: `src/app/i18n/id.json` (add `a11y.previewChrome`)
- Modify: `src/app/editor/html-mode/html-mode.ts` (`host.innerHTML` + `refresh()`)
- Modify: `src/app/editor/html-mode/html-mode.css` (grid rows, action bar, tabs, info bar, browser chrome)
- Test: `tests/unit/html-mode-view.test.ts` (stays green), `tests/e2e/html-mode.spec.ts` (add preview-tab assertion)

**Interfaces:**
- Consumes: `extractTitle`, `slugifyTitle` from `src/runtime/html/page-title.ts` (Task 2).
- Produces: DOM with `[data-preview-tab]` (span, page title) and `[data-preview-url]` (span, slug) inside `#html-panel-preview`; `[data-block-info]` relocated into `.html-mode__infobar` at the bottom of `.html-mode__output`.

- [ ] **Step 1: Add the i18n key**

In `src/app/i18n/id.json`, after the `"a11y.previewTablist"` line, add:

```json
  "a11y.previewChrome": "Jendela pratinjau halaman",
```

(Check the trailing comma on the previous line and JSON validity.)

- [ ] **Step 2: Verify i18n tests still pass**

Run: `npx vitest run tests/unit/i18n.test.ts`
Expected: PASS — `"Jendela pratinjau halaman"` contains none of the blocked English substrings.

- [ ] **Step 3: Rewrite the `host.innerHTML` template in `html-mode.ts`**

At the top of the file add the import (next to the other `../../../runtime/html/*` imports):

```ts
import { extractTitle, slugifyTitle } from '../../../runtime/html/page-title';
```

Replace the entire `host.innerHTML = \`...\`;` block (currently lines ~69–98) with:

```ts
  host.innerHTML = `
    <div class="html-mode">
      <section class="html-mode__blocks" aria-label="Area blok HTML">
        <div id="htmlBlocklyDiv"></div>
        <p class="html-mode__hint" data-html-hint>${t('editor.html.canvasHint')}</p>
      </section>
      <aside class="html-mode__output" aria-label="Hasil halaman HTML">
        <div class="html-mode__actionbar">
          <button type="button" class="html-mode__run" data-run-html aria-label="${t('editor.html.run')}" title="${t('editor.html.run')}">▶</button>
          <div class="html-mode__actions">
            <label class="html-mode__upload">
              ${t('editor.html.uploadImage')}
              <input type="file" accept="image/*" data-upload-image>
            </label>
            <button type="button" data-export-html>${t('editor.html.exportHtml')}</button>
          </div>
        </div>
        <div class="html-mode__tabs" role="tablist" aria-label="${t('a11y.previewTablist')}">
          <button type="button" role="tab" id="html-tab-preview" data-tab="preview" aria-selected="true" aria-controls="html-panel-preview">${t('editor.html.tabPreview')}</button>
          <button type="button" role="tab" id="html-tab-code" data-tab="code" aria-selected="false" aria-controls="html-panel-code">${t('editor.html.tabCode')}</button>
        </div>
        <p class="html-mode__error" data-html-error hidden></p>
        <div class="html-mode__panel" id="html-panel-preview" data-panel="preview" role="tabpanel" aria-labelledby="html-tab-preview">
          <div class="html-mode__browser" aria-label="${t('a11y.previewChrome')}">
            <div class="html-mode__browserbar" aria-hidden="true">
              <span class="html-mode__dots"><i></i><i></i><i></i></span>
              <span class="html-mode__browsertab">
                <span class="html-mode__fav"></span>
                <span data-preview-tab>${t('editor.html.previewTitle')}</span>
              </span>
              <span class="html-mode__browseraddr"><span data-preview-url></span></span>
            </div>
            <div class="html-mode__viewport">
              <iframe title="${t('editor.html.previewTitle')}"></iframe>
            </div>
          </div>
        </div>
        <div class="html-mode__panel html-mode__code" id="html-panel-code" data-panel="code" role="tabpanel" aria-labelledby="html-tab-code" hidden></div>
        <p class="html-mode__infobar"><span class="html-mode__blockinfo" data-block-info></span></p>
      </aside>
    </div>
  `;
```

Notes: the `iframe` is unchanged (still the only `iframe`, still gets `sandbox="allow-same-origin"` from `createHtmlPreview`, still matched by `.html-mode iframe`). `[data-block-info]` moved into `.html-mode__infobar`; `attachBlockInfo(...)` still finds it via `host.querySelector('[data-block-info]')`. `.html-mode__toolbar` no longer exists.

- [ ] **Step 4: Wire `refresh()` to update the preview tab + URL**

In `renderHtmlMode`, just after `const errorElement = host.querySelector<HTMLElement>('[data-html-error]')!;` add:

```ts
  const previewTabLabel = host.querySelector<HTMLElement>('[data-preview-tab]')!;
  const previewUrlLabel = host.querySelector<HTMLElement>('[data-preview-url]')!;
  previewUrlLabel.textContent = slugifyTitle(project.meta.name);
```

Then in `refresh()`, which currently reads:

```ts
  const refresh = (): void => {
    const { headHtml, bodyHtml } = generateHtml(workspace);
    preview.update(bodyHtml, headHtml);
    codePanel.setCode(
      composeDisplayDocument({ headHtml, bodyHtml, fallbackTitle: project.meta.name }),
    );
  };
```

replace with:

```ts
  const refresh = (): void => {
    const { headHtml, bodyHtml } = generateHtml(workspace);
    preview.update(bodyHtml, headHtml);
    codePanel.setCode(
      composeDisplayDocument({ headHtml, bodyHtml, fallbackTitle: project.meta.name }),
    );
    const title = extractTitle(headHtml, project.meta.name);
    previewTabLabel.textContent = title;
    previewUrlLabel.textContent = slugifyTitle(title);
  };
```

- [ ] **Step 5: Replace the layout CSS in `html-mode.css`**

In `src/app/editor/html-mode/html-mode.css`:

(a) Replace the `.html-mode__output` rule and the following `.html-mode__toolbar` rule and the `.html-mode__tabs, .html-mode__actions { display: flex; gap: 6px; }` rule with:

```css
.html-mode__output {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  margin-left: 5px;
}

.html-mode__actionbar {
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px;
  border-bottom: 1px solid var(--html-line);
  background: #f4f8fa;
}

.html-mode__actions {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.html-mode__tabs {
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--html-line);
  background: #f4f8fa;
}

.html-mode__error {
  grid-row: 3;
}

.html-mode__panel {
  grid-row: 4;
}

.html-mode__infobar {
  grid-row: 5;
  margin: 0;
  padding: 4px 10px;
  border-top: 1px solid var(--html-line);
  background: var(--ed-ground);
}
```

(b) Keep the existing `.html-mode__tabs button, .html-mode__actions button, .html-mode__upload { ... }` rule as-is. Keep `.html-mode__tabs button[aria-selected='true'] { ... }` as-is. The `.html-mode__actions { justify-content: flex-end; }` rule is now redundant (superseded by `margin-left: auto`) — delete it.

(c) Replace the trailing `.html-mode__blockinfo { grid-column: 1 / -1; margin: 0; padding: 2px 4px; font-size: 0.8rem; color: #5c7784; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }` block (end of file) with:

```css
.html-mode__blockinfo {
  display: block;
  margin: 0;
  font-size: 0.8rem;
  color: #5c7784;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 6: Add the browser-chrome CSS to `html-mode.css`**

Append (before the `@media (max-width: 900px)` block):

```css
#html-panel-preview {
  display: flex;
  overflow: hidden;
  padding: 10px;
  background: var(--ed-ground);
}

.html-mode__browser {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 2px solid var(--html-line);
  border-radius: var(--ed-radius);
  background: #fff;
  box-shadow: var(--ed-shadow);
}

.html-mode__browserbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--html-line);
  background: var(--ed-ground);
}

.html-mode__dots {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 5px;
}

.html-mode__dots i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #cbd3e1;
}

.html-mode__browsertab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 55%;
  padding: 4px 10px;
  border: 1px solid var(--html-line);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: #fff;
  font-size: 0.78rem;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
}

.html-mode__browsertab [data-preview-tab] {
  overflow: hidden;
  text-overflow: ellipsis;
}

.html-mode__fav {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--html-blue);
}

.html-mode__browseraddr {
  flex: 1;
  min-width: 0;
  padding: 4px 12px;
  border: 1px solid var(--html-line);
  border-radius: 999px;
  background: #fff;
  font-size: 0.75rem;
  color: #8494a3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.html-mode__viewport {
  flex: 1;
  min-height: 0;
}
```

- [ ] **Step 7: Compress the chrome on narrow screens**

Inside the existing `@media (max-width: 900px) { ... }` block in `html-mode.css`, add:

```css
  .html-mode__browseraddr {
    display: none;
  }
```

- [ ] **Step 8: Run the HTML-mode unit tests**

Run: `npx vitest run tests/unit/html-mode-view.test.ts tests/unit/html-mode-persistence.test.ts tests/unit/a11y-smoke.test.ts`
Expected: PASS. All queried hooks (`[data-run-html]`, `[data-tab="preview"]`, `[data-tab="code"]`, `[data-export-html]`, `[data-panel="code"]`, `[data-panel="preview"]`, `[data-block-info]`, `iframe`) still resolve.

- [ ] **Step 9: Add the preview-tab E2E assertion**

In `tests/e2e/html-mode.spec.ts`, in the SECOND test (`'document skeleton blocks drive the head + the code panel shows the full page'`), after `await page.getByRole('button', { name: 'Jalankan' }).click();` (line ~182), add:

```ts
  await expect(page.locator('[data-preview-tab]')).toHaveText('Halaman Saya');
  await expect(page.locator('[data-preview-url]')).toHaveText('halaman-saya.html');
```

- [ ] **Step 10: Run the HTML-mode E2E**

Run: `npx playwright test tests/e2e/html-mode.spec.ts`
Expected: PASS (both tests, including the hint assertion from Task 1 and the new tab assertions).

- [ ] **Step 11: Format + commit**

```bash
npm run format
git add src/app/i18n/id.json src/app/editor/html-mode/html-mode.ts src/app/editor/html-mode/html-mode.css tests/unit/html-page-title.test.ts tests/e2e/html-mode.spec.ts
git commit -m "$(cat <<'EOF'
feat(html-mode): tidy the right panel and wrap the preview in browser chrome

- Output panel is now four clean rows: action bar (Run · Unggah gambar ·
  Ekspor HTML), a full-width segmented tab strip, the panel, and a
  bottom IDE-style status bar that hosts the Fase C "Info blok" text.
- The Pratinjau panel is wrapped in a fake browser window: traffic-light
  dots, a tab showing the page <title> (from the <head> block, via
  extractTitle), and a non-interactive address bar with a slug.
- All ARIA roles/names and data-* test hooks unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

### Task 4: Editor button hover system

**Files:**
- Modify: `src/app/editor/editor.css`
- Modify: `src/app/editor/html-mode/html-mode.css`
- Modify: `src/app/editor/sprite-mode/sprite-mode.css`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (presentational).

- [ ] **Step 1: `editor.css` — pill button hover + reduced-motion gate**

Append to `src/app/editor/editor.css`:

```css
.editor .btn {
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    border-color 0.12s ease,
    background-color 0.12s ease;
}

.editor .btn:hover {
  border-color: #c3cce0;
  background: #f4f7ff;
  transform: translateY(-1px);
  box-shadow:
    0 2px 6px rgb(30 41 80 / 12%),
    0 10px 22px rgb(30 41 80 / 8%);
}

.editor__modes .btn[aria-pressed='true']:hover {
  background: #3f86ec;
  border-color: #3f86ec;
  color: #fff;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .editor .btn,
  .editor .btn:hover {
    transition: none;
    transform: none;
  }
}
```

- [ ] **Step 2: `html-mode.css` — neutral + primary button hover**

Append to `src/app/editor/html-mode/html-mode.css` (before the `@media (max-width: 900px)` block):

```css
.html-mode__tabs button,
.html-mode__actions button,
.html-mode__upload,
.html-mode__run {
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    filter 0.12s ease;
}

.html-mode__tabs button:not([aria-selected='true']):hover,
.html-mode__actions button:not([data-export-html]):hover,
.html-mode__upload:hover {
  background: #eef4ff;
  border-color: #4c97ff;
}

.html-mode__tabs button[aria-selected='true']:hover {
  background: #e0efff;
}

.html-mode__run:hover,
.html-mode__actions [data-export-html]:hover {
  filter: brightness(0.95);
}
```

- [ ] **Step 3: `sprite-mode.css` — neutral + primary button hover**

Append to `src/app/editor/sprite-mode/sprite-mode.css` (before the `@media (max-width: 850px)` block):

```css
.sprite-stage-toolbar button,
.sprite-tabs button,
.sprite-panel__add,
.sprite-chip,
.costume-tile,
.sound-tile {
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    filter 0.12s ease;
}

.sprite-tabs button:not([aria-selected='true']):hover,
.sprite-panel__add:hover,
.sprite-chip:not([aria-pressed='true']):hover,
.costume-tile:not([aria-pressed='true']):hover,
.sound-tile:hover,
.sprite-stage-toolbar [data-stop]:hover {
  background: #eef4ff;
  border-color: #4c97ff;
}

.sprite-tabs button[aria-selected='true']:hover,
.sprite-chip[aria-pressed='true']:hover,
.costume-tile[aria-pressed='true']:hover {
  background: #e0efff;
}

.sprite-stage-toolbar [data-green-flag]:hover,
.sprite-ask button:hover {
  filter: brightness(0.95);
}
```

- [ ] **Step 4: Format + typecheck + build**

Run: `npm run format && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Visual check (manual note for the reviewer)**

In both modes, hover every button class: `.editor .btn` (header + modes) lifts 1px with a slightly stronger shadow; neutral mode buttons (tabs, upload, chips, tiles) get a pale blue wash + blue border; the green Run / green-flag / export buttons darken slightly; selected tabs/chips don't lose their selected styling on hover. With OS "reduce motion" on, no `transform` occurs.

- [ ] **Step 6: Commit**

```bash
git add src/app/editor/editor.css src/app/editor/html-mode/html-mode.css src/app/editor/sprite-mode/sprite-mode.css
git commit -m "$(cat <<'EOF'
feat(editor): restrained hover states for every editor button

Pill buttons lift 1px; neutral mode buttons get a pale-blue wash and
blue border; coloured primary buttons darken slightly; selected
tabs/chips keep their selected look. All transform motion is gated
behind prefers-reduced-motion.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

### Task 5: PR-D2 docs + full gate + open PR

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/superpowers/specs/2026-09-07-phase-d-editor-home-polish-design.md` (Status line → merged state after the fact is optional; at minimum flip "Draft (menunggu review user)" to "Disetujui" once the user approves — do this only if the user has approved by execution time)

- [ ] **Step 1: Extend the ROADMAP note**

Append to the Fase D paragraph in `docs/ROADMAP.md`:

```markdown
**PR-D2:** panel kanan Mode HTML dirapikan (bar aksi / strip tab
segmented / status bar "Info blok" di bawah), pratinjau dibungkus
"bingkai browser" dengan tab judul halaman (`src/runtime/html/page-title.ts`),
efek hover untuk semua tombol editor, dan perbaikan bug hint kanvas
kosong yang tidak hilang (`.html-mode__hint[hidden]`).
```

- [ ] **Step 2: Full gate**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`
Expected: all green. `check:chunks` — the editor entry chunk stays well under 400 kB (added: ~1 small pure module + CSS).

- [ ] **Step 3: Commit + push + open PR**

```bash
git add docs/ROADMAP.md docs/superpowers/specs/2026-09-07-phase-d-editor-home-polish-design.md
git commit -m "$(cat <<'EOF'
docs: ROADMAP note for Fase D PR-D2 (editor panel polish)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
git push -u origin phase-d2-editor-panel-polish
gh pr create --base main --title "Fase D · PR-D2 — HTML panel tidy, hover, hint fix, browser preview" --body "$(cat <<'EOF'
## Ringkasan

Poles editor pasca-Fase C (4 item):

1. **Panel kanan Mode HTML** dirapikan — `.html-mode__output` jadi
   empat baris bersih: bar aksi (Run · Unggah gambar · Ekspor HTML),
   strip tab segmented full-width, panel, lalu status bar "Info blok"
   (Fase C) di bawah.
2. **Efek hover** tenang & konsisten untuk semua tombol editor
   (`editor.css` + `html-mode.css` + `sprite-mode.css`); motion
   digating `prefers-reduced-motion`.
3. **BUG diperbaiki** — hint kanvas kosong tidak hilang setelah blok
   pertama ditaruh. Akar: `.html-mode__hint { display: grid }`
   mengalahkan UA `[hidden]`. Perbaikan: `.html-mode__hint[hidden]`.
4. **Pratinjau = bingkai browser** — titik lampu, tab berisi `<title>`
   halaman (dari blok `<head>`, via `extractTitle`), address bar slug
   non-interaktif (`src/runtime/html/page-title.ts`, unit-tested).

Semua `role` / `aria-label` / `data-*` hook tes dipertahankan.
`landing.css` tidak disentuh.

Spec: `docs/superpowers/specs/2026-09-07-phase-d-editor-home-polish-design.md`

## Tes

- Unit baru: `tests/unit/html-page-title.test.ts` (10 kasus).
- E2E `html-mode.spec.ts` diperluas: hint tersembunyi setelah blok
  dimuat; tab pratinjau menampilkan "Halaman Saya" / "halaman-saya.html".
- `html-mode-view.test.ts` + `a11y-smoke` hijau (hook markup).
- Gate penuh hijau; `check:chunks` di bawah 400 kB.
- QA visual: panel kanan, hover semua tombol, bingkai browser.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

Stop after `gh pr create`. The user merges.

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|---|---|
| §1 Home — Fredoka `@font-face` in base.css | PR-D1 Task 1 Step 2 |
| §1 Home — token block, layout, sticker buttons, cards + hover, empty state, reduced-motion | PR-D1 Task 1 Step 3 |
| §1 Home — CSS-only, keep test hooks | PR-D1 Task 1 Steps 1/5 (regression run) |
| §1 Home — ambient decoration "optional / YAGNI-able" | Deliberately omitted from the plan (spec marks it skippable) |
| §2 Panel — action bar / segmented tabs / bottom info status bar / grid rows | PR-D2 Task 3 Steps 3, 5 |
| §2 Panel — keep tablist/tab roles, ids, aria-controls, button a11y names | PR-D2 Task 3 Step 3 (markup keeps them) + Step 8 (unit run) |
| §3 Hover — editor.css pill, mode-pressed, neutral, primary, selected, reduced-motion | PR-D2 Task 4 Steps 1–3 |
| §4 Bug — `.html-mode__hint[hidden]` + e2e | PR-D2 Task 1 |
| §5 Preview — browser chrome DOM, dots, tab, address bar | PR-D2 Task 3 Steps 3, 6, 7 |
| §5 Preview — `page-title.ts` (`extractTitle`, `slugifyTitle`) + unit tests | PR-D2 Task 2 |
| §5 Preview — wire `refresh()` to set tab + slug; initial fallback | PR-D2 Task 3 Step 4 |
| §5 Preview — `a11y.previewChrome` i18n, pure Indonesian | PR-D2 Task 3 Steps 1–2 |
| §5 Preview — responsive: hide address bar ≤900px | PR-D2 Task 3 Step 7 |
| §5 Preview — e2e: tab shows "Halaman Saya" | PR-D2 Task 3 Step 9 |
| Testing / gate | PR-D1 Task 2, PR-D2 Task 5 |
| ROADMAP update | PR-D1 Task 2 Step 1, PR-D2 Task 5 Step 1 |

No uncovered spec requirement. (Ambient Home decoration is explicitly optional in the spec and is intentionally left out; the user can ask for it during review.)

**2. Placeholder scan**

No "TBD" / "handle edge cases" / "similar to Task N" / "write tests for the above" without code. Every code step carries the literal content. Manual visual-check steps are labelled as reviewer notes, not code steps, and each names exactly what to look at.

**3. Type consistency**

- `extractTitle(headHtml: string, fallback: string): string` and `slugifyTitle(title: string): string` — defined identically in Task 2 (impl + tests) and consumed with the same signatures in Task 3 Step 4.
- `previewTabLabel` / `previewUrlLabel` — declared once in Task 3 Step 4, used in the same step's `refresh()`.
- DOM hooks `[data-preview-tab]` / `[data-preview-url]` — created in Task 3 Step 3, queried in Task 3 Step 4 and asserted in Task 3 Step 9.
- `.html-mode__toolbar` is fully removed (Task 3 Step 3 markup + Step 5 CSS delete) — no dangling reference.
- `.html-mode__actionbar` / `.html-mode__infobar` / `.html-mode__browser*` — introduced in markup (Step 3) and styled in CSS (Steps 5–7) with matching names.

No inconsistencies found.
