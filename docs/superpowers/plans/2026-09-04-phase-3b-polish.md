# Fase 3b — Poles: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the editor feel finished for a real SD classroom: blocks that read as "Scratch-ish" (rounded, roomier, category-coloured toolbox), cleaner built-in artwork, a global error boundary that shows a friendly Bahasa Indonesia recovery screen instead of a blank page, every user-facing error routed to a visible toast/dialog (no silent `console.error`), an accessibility pass (accessible names, focus-visible, ≥44 px targets, keyboard operability), and a performance pass (Blockly split out of the entry chunk, `menyentuh warna?` scene-cache, no per-frame allocation storms).

**Architecture:** Additive polish over the merged Phase 0–3a codebase. The Blockly theme gains rounded geometry + component styles + a small injected CSS; both the sprite and HTML workspaces already share one theme object. A new `src/app/error-boundary.ts` installs `window` `error`/`unhandledrejection` listeners and paints an overlay; `src/app/toast.ts` (new, tiny) gives the shell/editor a visible error channel; the existing unused `error.loadProject`/`error.importFile` keys get wired. `stage.ts` caches the scene-minus-self raster for colour sensing. `vite.config.ts` gains `manualChunks` to move `blockly` / `highlight.js` / `js-interpreter` into vendor chunks. Nothing changes about how blocks run, how projects serialize, or the HTML/sprite feature set.

**Tech Stack:** Blockly theme + CSS, vanilla TS, Vite `manualChunks`, Vitest/jsdom, Playwright. No new npm deps.

**Spec:** `docs/Design.md` §4.2 (theme "rasa Scratch"), §12 (error handling — friendly toast, error boundary, corrupt-file dialog), §7/§11 non-functional (Bahasa Indonesia, aksesibilitas dasar, performa laptop sekolah); `docs/ROADMAP.md` → "Fase 3 — Poles & paket desktop" (theme, error boundary, a11y, perf lines). `docs/PRD.md` §7 (perf target: 60 fps stage for ≤10 sprites; interaksi < 100 ms; layar 1366×768).

## Global Constraints

Every task's requirements implicitly include this section.

1. **Bahasa Indonesia** for every user-facing string incl. new error-boundary / toast / a11y `aria-label` text. New strings → `src/app/i18n/id.json` via `t()`. Dev-console strings exempt.
2. **No new npm deps, no CDN, no runtime network.** Icons/artwork are hand-authored inline SVG committed to the repo. Theme CSS is a local file imported by the editor.
3. **TypeScript strict** (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`); `import type` / inline `type`; **no `any` in product code**. `npm run typecheck` passes.
4. **No behaviour regressions.** All existing unit + E2E stay green. The block set, generators, interpreter, scheduler, project schema (`formatVersion` 1), autosave, mode switch, HTML preview/export are untouched. Theme/CSS changes must not break Blockly `inject` in jsdom (the stub-factory tests) or in the real browser (E2E).
5. **Error boundary must not eat useful errors in tests.** It installs only when `installErrorBoundary()` is called (from `src/main.ts`); unit tests that expect a thrown error do not call it. It re-`console.error`s the original before painting the overlay.
6. **Perf budget (measured, not vibes):** after Task 7, `npm run build` reports the **editor entry chunk < 400 kB** (Blockly moved to its own vendor chunk); after Task 6, a `forever { jika (menyentuh warna …) … }` loop does **one** scene raster per frame, not one per block evaluation (asserted by a spy on the offscreen render).
7. **Conventional Commits**, one focused commit per task's final step. `.gitattributes` → `eol=lf`; `npm run format` before commit if needed. `git add` every new file; `git status --porcelain` clean before "done".
8. **Deferred to 3c:** Tauri Windows build, GitHub Actions release job, in-app Help page, README quickstart. Real CC0 third-party art (this phase only polishes the hand-authored SVGs). Pixel-perfect collision. Custom Blockly renderer.

---

## Task 1: Blockly theme polish — rounded, roomier, "rasa Scratch"

**Files:**
- Modify: `src/blocks/theme.ts`
- Create: `src/blocks/theme.css`
- Modify: `src/app/editor/sprite-mode/sprite-mode.ts`, `src/app/editor/html-mode/html-mode.ts` (import `theme.css`; pass the enriched theme — already shared)
- Test: `tests/unit/blocks-theme.test.ts`

**Interfaces:**
- Consumes: `Blockly` from `blockly/core`.
- Produces (all additive to the existing `spriteTheme` object):
  - keep `export const spriteTheme` and `CATEGORY_COLORS`; also `export { spriteTheme as blocklyTheme }` for a clearer name in new code.
  - `blockStyles.*` gain `colourSecondary` (a ~12% lighter tint) + `colourTertiary` (a ~20% darker border) per category, and `hat: 'cap'` on the event style so hats read as hats.
  - `componentStyles`: `workspaceBackgroundColour: '#f7f8fb'`, `toolboxBackgroundColour: '#ffffff'`, `toolboxForegroundColour: '#3b3b48'`, `flyoutBackgroundColour: '#eef0f5'`, `flyoutForegroundColour: '#3b3b48'`, `flyoutOpacity: 1`, `scrollbarColour: '#c8ccd8'`, `scrollbarOpacity: 0.6`, `insertionMarkerColour: '#1e88e5'`, `insertionMarkerOpacity: 0.4`, `cursorColour: '#1e88e5'`.
  - `fontStyle`: `family: 'system-ui, "Segoe UI", Roboto, sans-serif'`, `size: 12`, `weight: '600'`.
  - `startHats: true` in the inject options (do this at the `Blockly.inject` call sites, not the theme).
  - `src/blocks/theme.css` — injected by `import './theme.css'` from `theme.ts` (Vite bundles it): rounder blocks + comfortable hit areas via `.blocklyPath { rx: 6px; }`-equivalent isn't CSS-able, so instead style the *editor chrome*: `.blocklyFlyout`, `.blocklyToolboxDiv` padding/rounded corners, `.blocklyTreeRow { min-height: 40px; border-radius: 8px; }`, `.blocklyText { font-weight: 600; }`, bigger `.blocklyFlyoutButton`, a soft drop-shadow on `.blocklyToolboxDiv`. Also `.blocklyMainBackground { stroke: none; }`.
    - For actual block corner rounding use Blockly's renderer constant override: in `theme.ts` add `Blockly.blockRendering` isn't overridable without a renderer subclass — instead set the inject option `renderer: 'zelos'` **only if** all existing blocks still render correctly in the E2E; otherwise keep `'geras'` and accept CSS-chrome polish only. **Try `zelos` first** (it is the Scratch-like renderer shipped with Blockly and needs no custom code); if any Task-4 E2E fails under `zelos`, fall back to `geras` and note it.

- [ ] **Step 1: Write the failing test** — `spriteTheme` is registered; every `blockStyles.<cat>_blocks` has `colourPrimary`, `colourSecondary`, `colourTertiary`; `componentStyles.workspaceBackgroundColour` set; `blocklyTheme` alias exports the same object; importing `theme.ts` does not throw (CSS import is virtual in Vitest).

- [ ] **Step 2: FAIL → implement theme.ts + theme.css + set `renderer`/`startHats` at both inject sites → PASS.**

- [ ] **Step 3: Manual/E2E smoke** — `npm run build`; then in Task 10's E2E the sprite + html workspaces still inject and blocks still connect. If `zelos` misrenders, revert to `geras`, keep the CSS + component styles, note it in the report.

- [ ] **Step 4: Commit** — `feat(blocks): Scratch-ish theme — rounded chrome, hats, component styles`

---

## Task 2: Polished built-in costumes + backdrops

**Files:**
- Modify: `src/runtime/sprite/assets/*.svg` (redraw the 9 costumes + 4 backdrops), add `src/runtime/sprite/assets/{robot,cloud,flower,fish,rocket,apple}.svg` (6 new costumes) + `src/runtime/sprite/assets/{bg-room,bg-space}.svg` (2 new backdrops)
- Modify: `src/runtime/sprite/assets.ts` (catalog entries for the 6+2 new)
- Test: extend `tests/unit/sprite-assets.test.ts`

**Interfaces:**
- Produces: `BUILTIN_COSTUMES` length 15, `BUILTIN_BACKDROPS` length 6; all ids `builtin:*`, Bahasa Indonesia `name` (`Robot`, `Awan`, `Bunga`, `Ikan`, `Roket`, `Apel`; `Ruangan`, `Antariksa`). `BUILTIN_BY_ID` covers them. Each SVG: `viewBox="0 0 100 100"` (costume) / `"0 0 480 360"` (backdrop), single clean shape or simple scene, distinct palette, < 3 KB, no external refs, no `<script>`.

- [ ] **Step 1: Redraw the existing 9 costume SVGs** cleaner (consistent stroke weight, centred ~76×76 drawing, friendlier shapes — the "cat" gets a rounder head + clearer ears/eyes/tail; keep ids/filenames). Redraw the 4 backdrops with a soft gradient or simple horizon. Author the 8 new files.

- [ ] **Step 2: Extend the test** — counts 15 / 6; new ids resolve via `BUILTIN_BY_ID` and `resolveAssetUrl(id, {})`; every builtin SVG file on disk is `< 3072` bytes and contains neither `<script` nor `http://` / `https://`.

- [ ] **Step 3: Run — PASS**, `npm run build` (assets bundle).

- [ ] **Step 4: Commit** — `feat(assets): polish built-in costumes + backdrops, add 8 more`

---

## Task 3: Global error boundary (`src/app/error-boundary.ts`)

**Files:**
- Create: `src/app/error-boundary.ts`, `src/app/error-boundary.css`
- Modify: `src/main.ts`
- Test: `tests/unit/error-boundary.test.ts`

**Interfaces:**
- Produces:
  - `export function installErrorBoundary(mountInto?: HTMLElement): () => void` — adds `window` listeners for `'error'` and `'unhandledrejection'`; on the first uncaught error it (a) `console.error`s the original, (b) renders an overlay into `mountInto ?? document.body`: heading `t('boundary.title')` ("Maaf, ada yang salah"), body `t('boundary.body')` ("Pekerjaanmu yang terakhir sudah tersimpan. Coba muat ulang halaman."), a **Muat ulang** button (`location.reload()`), and a **Salin detail** button (writes `name: message\n stack` to the clipboard via `navigator.clipboard?.writeText`, fallback: select a hidden `<textarea>`). Subsequent errors are swallowed (overlay already shown) but still `console.error`d. Returns a teardown fn that removes the listeners + overlay.
  - `export const __ERROR_BOUNDARY_TESTID = 'kodako-error-boundary'` (the overlay root `data-testid`).
- `src/main.ts`: call `installErrorBoundary()` right after `startApp(...)`.

- [ ] **Step 1: Write the failing test** (jsdom): `installErrorBoundary(root)`; dispatch `new ErrorEvent('error', { error: new Error('boom'), message: 'boom' })` on `window` → `root` contains `[data-testid="kodako-error-boundary"]` with the Indonesian title + a `[data-action="reload"]` + `[data-action="copy"]`; `console.error` was called with the original error; a second error does not add a second overlay; the teardown fn removes the overlay and further errors do nothing. Also handle `unhandledrejection` (`new PromiseRejectionEvent('unhandledrejection', { reason: new Error('x'), promise: Promise.reject().catch(()=>{}) })` — construct carefully to avoid an actual unhandled rejection in the test).

- [ ] **Step 2: FAIL → implement → PASS.**

- [ ] **Step 3: Commit** — `feat(app): global error boundary with Bahasa Indonesia recovery screen`

---

## Task 4: Visible error channel — toast + wire the unused error keys

**Files:**
- Create: `src/app/toast.ts`, `src/app/toast.css`
- Modify: `src/app/shell.ts` (load/import failures → toast, not just `console.error`), `src/app/home/home-view.ts` (open-file failure → toast), `src/app/editor/sprite-mode/sprite-mode.ts` (`error.spriteRunFailed` / `error.audioUnavailable` → toast), `src/app/editor/html-mode/html-mode.ts` (`error.htmlExportFailed` → toast)
- Test: `tests/unit/toast.test.ts`, extend `tests/unit/shell.test.ts`

**Interfaces:**
- Produces:
  - `src/app/toast.ts` → `export function showToast(message: string, opts?: { kind?: 'error' | 'info'; timeoutMs?: number }): void` and `export function clearToasts(): void`. Renders a live-region container (`role="status"`, `aria-live="polite"`) appended to `document.body` once; each toast auto-dismisses after `timeoutMs ?? 4000`, has a close button (`aria-label` = `t('toast.close')`), and stacks (max 3, oldest drops).
- Wiring: replace the bare `console.error(err)` in `shell.ts`'s editor-load `catch` with `console.error(err); showToast(t('error.loadProject'), { kind: 'error' })` **then** `navigate({ name: 'home' })` (keep the redirect). `home-view.ts` `open-file` catch → `showToast(t('error.importFile'), { kind: 'error' })`. `sprite-mode.ts`: when an interpreter thread reports an error (the scheduler already stops that thread) → `showToast(t('error.spriteRunFailed'), { kind: 'error' })` once per run; when `createAudioEngine()` returns the no-op fallback AND a sound block is used → `showToast(t('error.audioUnavailable'))` once. `html-mode.ts` `exportHtmlProject` catch → `showToast(t('error.htmlExportFailed'), { kind: 'error' })`.

- [ ] **Step 1: Write the failing tests** — `showToast('halo')` appends one `[role="status"]` region containing "halo" + a close button with an `aria-label`; `kind:'error'` adds an error class; auto-dismiss after fake-timer advance; `clearToasts()` empties it; 4th toast drops the 1st. `shell.test.ts`: a missing-project editor route now also calls `showToast` with the `error.loadProject` text (spy `showToast` via module mock) before redirecting.

- [ ] **Step 2: FAIL → implement → PASS.**

- [ ] **Step 3: Commit** — `feat(app): toast channel; route load/import/run/export errors to it`

---

## Task 5: Accessibility pass

**Files:**
- Modify: `src/app/editor/header.ts`, `src/app/editor/sprite-mode/*.ts`, `src/app/editor/html-mode/*.ts`, `src/app/home/home-view.ts`, `src/styles/base.css` (+ mode CSS files)
- Test: `tests/unit/a11y-smoke.test.ts`

**Checklist (each is a concrete fix, not "improve a11y"):**
- Every icon-only / symbol-only button gets an `aria-label` via `t()`: the green-flag (`▶`) → `t('editor.sprite.run')`, Stop (`⏹`) → `t('editor.sprite.stop')`, tab buttons keep visible text (ok), the toast close (done in Task 4), sprite chip delete `×` → `t('home.delete')`, costume/sound tile buttons → their name.
- `:focus-visible` outline (2px solid `#1e88e5`, 2px offset) on all `button`, `a`, `input`, `select`, `[tabindex]` in `base.css` — and NOT suppressed anywhere.
- Interactive tap targets `min-height: 40px; min-width: 40px` (or adequate padding) for header buttons, tab buttons, sprite chips, costume/sound tiles, panel number inputs' steppers area.
- The mode toggle (`[data-mode]`) is a real `role="tablist"` / `role="tab"` set with `aria-selected` mirroring `aria-pressed`; arrow-key navigation between the two.
- The Pratinjau / Lihat Kode tabs and the Sprite / Kostum / Suara tabs: `role="tab"` + `aria-selected` + `aria-controls`; the panels `role="tabpanel"`.
- The stage `<canvas>` gets an `aria-label` (`t('editor.sprite.stageLabel')` = "Panggung tempat sprite bergerak") and `role="img"`.
- The ask overlay `<input>` gets a real `<label>` (the question text) associated via `for`/`id`.
- Colour contrast: verify the category colours as *text on white* are only used where there's also a shape/label (they are — categories have text). No fix expected; document the check.
- `home-view.ts` project cards: the card is a group; the primary action ("Buka") is a real button; card has an accessible name = project name.

**Interfaces:** add i18n keys `editor.sprite.stageLabel`, `a11y.modeTablist` ("Pilih mode editor"), `a11y.previewTablist` ("Pratinjau atau kode"), `toast.close` ("Tutup pesan").

- [ ] **Step 1: Write `tests/unit/a11y-smoke.test.ts`** — render the editor (sprite mode, stubbed Blockly) into jsdom and assert: no `<button>` without either visible text content or an `aria-label`; the mode toggle container has `role="tablist"` and each `[data-mode]` has `role="tab"` + `aria-selected`; the `<canvas>` has an `aria-label`; every `<input>` in the sprite panel has an associated label or `aria-label`. Render Home and assert each project card exposes an accessible name.

- [ ] **Step 2: FAIL → apply the checklist fixes → PASS**, then `npm run typecheck && npm run lint`.

- [ ] **Step 3: Commit** — `feat(a11y): accessible names, focus-visible, tab semantics, 44px targets`

---

## Task 6: Perf — colour-sensing scene cache

**Files:**
- Modify: `src/runtime/sprite/stage.ts`
- Test: extend `tests/unit/sprite-stage.test.ts`

**Interfaces:**
- `colorUnderSprite(spriteId, hex, tol?)` currently rebuilds a 480×360 offscreen canvas and re-rasterizes the whole scene on every call. Change to: keep one persistent offscreen canvas; a `sceneRasterVersion` counter bumped whenever `render()` runs; `colorUnderSprite` re-rasterizes the scene-minus-**nothing** (full scene) into the offscreen **once per version**, caches the `ImageData`, and for each call masks out the calling sprite's bbox region logically (subtract by testing "is the matching pixel outside the sprite's own bounds OR the sprite is transparent there" — the existing scene-minus-self intent, but computed from the cached full raster + the sprite's bounds rather than a fresh per-call render). If exact scene-minus-self is infeasible from a cached full raster, the acceptable simplification is: cache the **backdrop-only** raster (backdrop changes rarely) + walk other sprites' bounds analytically for the colour test. Pick whichever is simpler and document it.
- Add `export` nothing new; behaviour is identical, cost is O(bbox) after the first call per frame.

- [ ] **Step 1: Extend the test** — spy on the offscreen `drawImage`/scene-raster path; in one simulated frame call `colorUnderSprite` 5 times → the scene is rasterized **once**; after a `render()` (version bump) the next `colorUnderSprite` rasterizes again (once). Correctness cases from 3a still pass (matching pixel → true; all-transparent → false).

- [ ] **Step 2: FAIL → implement cache → PASS.**

- [ ] **Step 3: Commit** — `perf(runtime): cache scene raster for colour sensing (1 per frame)`

---

## Task 7: Perf — split Blockly / highlight.js / interpreter into vendor chunks

**Files:**
- Modify: `vite.config.ts`
- Test: `tests/unit/build-chunks.test.ts` (a build-output assertion) OR a documented check in Task 11

**Interfaces:**
- `vite.config.ts` `build.rollupOptions.output.manualChunks`: a function that returns `'vendor-blockly'` for ids containing `/node_modules/blockly/`, `'vendor-hljs'` for `/node_modules/highlight.js/`, `'vendor-interpreter'` for `/node_modules/js-interpreter/`, else undefined. Also bump `build.chunkSizeWarningLimit` to `700` (the vendor-blockly chunk is legitimately large and pre-split).

- [ ] **Step 1: Write `tests/unit/build-chunks.test.ts`** — `vitest` test that spawns `npm run build` (or imports and runs Vite's `build` API) into a tmp `outDir`, then asserts: a `vendor-blockly-*.js` file exists, the `editor-*.js` entry chunk is `< 400 * 1024` bytes, and `dist` still has `index.html` + `landing.html`. (If spawning a full build in a unit test is too slow/flaky, instead write a plain assertion script `scripts/check-chunks.mjs` invoked in Task 11's gate and skip the vitest test — note which.)

- [ ] **Step 2: FAIL → add manualChunks → PASS** (`npm run build` shows `vendor-blockly` split out, editor entry shrinks).

- [ ] **Step 3: Confirm E2E still green** (`npm run test:e2e`) — chunk splitting must not break lazy/eager loading; everything here is still eagerly imported so load order is preserved.

- [ ] **Step 4: Commit** — `perf(build): split blockly / highlight.js / js-interpreter into vendor chunks`

---

## Task 8: Perf — stage/scheduler per-frame allocation sweep

**Files:**
- Modify: `src/runtime/sprite/stage.ts`, `src/runtime/sprite/scheduler.ts` (only if a hotspot is found)
- Test: extend `tests/unit/sprite-scheduler.test.ts` (a "no unbounded growth" style check)

**Interfaces:** no API change. Targeted fixes only:
- `stage.render()`: hoist any `new Path2D` / array/object literals created per sprite per frame to reusable buffers; reuse a single gradient/`ImageData` where possible; avoid `getImageData` outside `colorUnderSprite`.
- `scheduler.tick()`: ensure the thread list isn't rebuilt with `.filter()` creating a fresh array every frame when nothing changed — mutate in place or only rebuild on membership change.
- Document a manual profile: load a project with 10 sprites each running `ulangi terus { gerak 3; putar 7 }`, run 5 s, confirm the frame callback stays well under 16 ms on a mid laptop (DevTools Performance) — record the observed ms in the task report.

- [ ] **Step 1: Add a guard test** — run the scheduler 300 simulated frames with 5 threads doing `forever { move }`; assert `scheduler.threads.length` stays constant and no exception; (optionally) assert a monkey-patched `Array.prototype.filter` call-count in `tick` is 0 or bounded.

- [ ] **Step 2: Apply only the fixes a quick read reveals; if the code is already tight, the task is the guard test + the documented profile.** Run — PASS.

- [ ] **Step 3: Commit** — `perf(runtime): reduce per-frame allocations in stage + scheduler`

---

## Task 9: i18n keys + audit

**Files:** Modify `src/app/i18n/id.json`; extend `tests/unit/i18n.test.ts`.

**Keys added across Tasks 3–5** (collect here if any were placeholdered): `boundary.title` = "Maaf, ada yang salah", `boundary.body` = "Pekerjaanmu yang terakhir sudah tersimpan. Coba muat ulang halaman.", `boundary.reload` = "Muat ulang", `boundary.copy` = "Salin detail", `toast.close` = "Tutup pesan", `editor.sprite.stageLabel` = "Panggung tempat sprite bergerak", `a11y.modeTablist` = "Pilih mode editor", `a11y.previewTablist` = "Pratinjau atau kode".

- [ ] **Step 1: Test** — each new key returns its exact Indonesian value; the English-leak scan still passes (extend the blocklist with `Reload`, `Copy`, `Close`).
- [ ] **Step 2: FAIL → add → PASS.**
- [ ] **Step 3: Commit** — `feat(i18n): strings for error boundary, toast, a11y labels`

---

## Task 10: E2E — error boundary + keyboard + theme smoke

**Files:** Create `tests/e2e/polish.spec.ts`; modify `src/app/editor/sprite-mode/sprite-mode.ts` only if a test hook is needed (a `window.__kodakoThrow = () => { throw new Error('e2e boom') }` guarded dev hook is acceptable, mirroring existing `__kodako*` hooks).

- [ ] **Step 1: Write `tests/e2e/polish.spec.ts`:**
  - **Error boundary:** open the editor, `page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { error: new Error('e2e boom'), message: 'e2e boom' })))` → the overlay with `[data-testid="kodako-error-boundary"]` appears containing "Maaf, ada yang salah" and a "Muat ulang" button.
  - **Keyboard:** on Home, `page.keyboard.press('Tab')` a handful of times and assert focus lands on the "Project Baru" button (has a visible focus ring — assert `:focus-visible` matched via `page.evaluate` on `document.activeElement`); open a project, Tab reaches the mode `role="tab"` and `ArrowRight` switches `aria-selected`.
  - **Theme smoke:** the injected `.blocklyToolboxDiv` exists and the workspace still accepts a dragged/loaded block (reuse the Phase-1 load-workspace-via-evaluate trick) and the green flag still runs it (sprite moves) — proves the theme/renderer change didn't break execution.

- [ ] **Step 2: Run `npm run test:e2e`** — expect 7 passing (6 existing + this). Fix flakes with `waitFor*`.

- [ ] **Step 3: Commit** — `test(e2e): error boundary, keyboard nav, themed workspace still runs`

---

## Task 11: Final gate + ROADMAP

- [ ] **Step 1: Full gate** — `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e` all green; `git status --porcelain` clean. Confirm the build log shows `vendor-blockly` split and editor entry `< 400 kB` (run `scripts/check-chunks.mjs` if that path was chosen).
- [ ] **Step 2: Tick `docs/ROADMAP.md`** Fase 3 lines for theme / error boundary / a11y / perf; leave a note "3c: Tauri build, CI rilis, halaman Bantuan, README quickstart."
- [ ] **Step 3: Commit** — `chore: mark Fase 3b polish items complete`

---

## Self-Review

**1. Spec coverage — ROADMAP "Fase 3" polish deliverables → tasks**

| Deliverable | Task(s) |
|---|---|
| Tema Scratch (rounded/roomier/coloured) | 1 |
| Aset kostum/latar dipoles | 2 |
| Error boundary global + pesan ramah Bahasa Indonesia | 3 |
| Semua jalur error → toast/dialog (tak lagi `console.error` diam), wire `error.loadProject`/`error.importFile` | 4 |
| Aksesibilitas dasar (nama, fokus, target, keyboard) | 5 |
| Performa laptop sekolah (chunk, colour-sense cache, alloc) | 6, 7, 8 |
| i18n | 9 |
| Test: unit per area + E2E boundary/keyboard/theme | each task + 10 |

**Design.md §12 mapping:** friendly runtime-error toast → Task 4; error boundary "Maaf, ada yang salah" + Muat ulang + salin detail → Task 3; corrupt-file dialog — **partially**: Task 4 routes `error.loadProject`/`error.importFile` to a toast, but the "coba perbaiki (muat sebisanya) vs batal" dialog from §12 is NOT built here (the parser already returns structured errors; the recovery dialog is deferred — noted below). PRD §7 perf targets → Tasks 6–8 (editor entry < 400 kB is the concrete proxy for "loads fast on a school laptop"; the 60 fps target is a documented manual profile in Task 8).

**Gaps accepted / noted:**
- The §12 "coba perbaiki vs batal" corrupt-project **dialog** is not built; a plain error toast + redirect is used. Flag for a later polish pass if teachers hit corrupt files often.
- Block *corner* rounding depends on the `zelos` renderer working with every existing block; if it doesn't, Task 1 falls back to `geras` + chrome-only CSS polish (documented in the task report). "Rasa Scratch" is then "close, not identical" — consistent with the user's "poles menengah" decision.
- Task 8 perf is partly a documented manual profile (frame ms in DevTools), not a CI-enforced budget — CI can't reliably measure frame time. The allocation guard test is the automated part.
- Artwork stays hand-authored SVG (no third-party CC0) per the user's decision; "polished" = cleaner shapes + 8 more, not a professional art pack.

**2. Placeholder scan** — no "TBD"/"add error handling"/"improve X"/"similar to Task N". Task 5 is an *enumerated* checklist of concrete DOM/attribute/CSS changes, not "do an a11y pass". Task 1 and 7 carry an explicit try-`zelos`-else-`geras` / spawn-build-else-script fallback with "note which in the report" — a real instruction. Tasks 3, 4, 6, 9, 10 have full interface contracts + enumerated test cases.

**3. Type/name consistency**
- `installErrorBoundary(mountInto?)` + `__ERROR_BOUNDARY_TESTID` (Task 3) — consumed by `main.ts` (Task 3) and `tests/e2e/polish.spec.ts` (Task 10, via the `data-testid`).
- `showToast(message, opts?)` / `clearToasts()` (Task 4) — consumed by `shell.ts`, `home-view.ts`, `sprite-mode.ts`, `html-mode.ts` (Task 4) and asserted in `toast.test.ts` + `shell.test.ts` (Task 4) + `a11y-smoke.test.ts` (Task 5, close button label).
- `spriteTheme` / `blocklyTheme` alias / `CATEGORY_COLORS` (Task 1) — the alias is additive; existing importers of `spriteTheme` (sprite-mode, html-mode) unchanged.
- i18n keys added in Task 9 are exactly those referenced in Tasks 3 (`boundary.*`), 4 (`toast.close`), 5 (`editor.sprite.stageLabel`, `a11y.*`) — one list.
- `colorUnderSprite` signature unchanged (Task 6) — `api.ts` / `event-bus.ts` callers untouched.
- `vite.config.ts` `manualChunks` (Task 7) is build-only; no source imports change.

Fixes applied inline: Task 1 keeps `spriteTheme` as the exported name (adds a `blocklyTheme` alias) so no import churn; Task 4's shell change keeps the existing `navigate({name:'home'})` redirect and only *adds* the toast; Task 6 keeps `colorUnderSprite` behaviour identical (cache is transparent) so 3a's tests need no change beyond the new spy assertion.

---

## Deferred to Fase 3c

- Tauri Windows installer build + `npm run tauri icon` real icons.
- GitHub Actions release job (build desktop on tag `v*`, attach to Releases).
- In-app **Bantuan** (Help) page + first-run tips.
- `README.md` quickstart for teachers (install, open, collect student `.ghtml.json`).
- The §12 "coba perbaiki vs batal" corrupt-project recovery dialog (currently a toast + redirect).
- Real third-party CC0 art pack; custom Blockly renderer; pixel-perfect collision.
