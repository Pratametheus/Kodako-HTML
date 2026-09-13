# Fase E · PR-E1 — Remove Sprite Mode (code) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete Sprite mode entirely (blocks, runtime, editor UI, project-model fields) and make the editor HTML-only, while keeping the asset-upload infrastructure Sprite mode and HTML mode actually shared.

**Architecture:** Two small additive/repoint tasks first (Task 1 creates `src/runtime/asset-library.ts`, the HTML-relevant half of today's `runtime/sprite/assets.ts`, alongside the existing sprite code; Task 2 repoints HTML mode's three consumers to it), then one large task (Task 3) that deletes every Sprite-owned file and, in the same commit, fixes every remaining compile-time dependent (`core/project.ts`, `editor-view.ts`, `header.ts`, `editor.css`, `blocks/index.ts`, `blocks/theme.ts`, `blocks/theme.css`, `blocks/category-icons.ts`, `help-panel.ts`, `id.json`) and every test that referenced anything deleted. Task 3 is one task, not several, because `tsc --noEmit` checks the whole program — a partial deletion would leave dangling imports and simply fail to compile at every intermediate point. Task 4 is docs/gate/PR bookkeeping.

**Tech Stack:** Vite 6, TypeScript strict (`noUncheckedIndexedAccess` on), Blockly 11.2.2 (`zelos` renderer — HTML mode only after this plan), Vitest + jsdom, Playwright, Prettier + ESLint 9. No new npm deps; several npm deps become unused after this plan is out of scope to remove here (none are Sprite-specific — `blockly`/`highlight.js`/`js-interpreter` are still used, `js-interpreter` becomes HTML-mode-unused but its removal is a separate follow-up, not part of this plan; do not touch `package.json` dependencies in this plan).

**Spec:** `docs/superpowers/specs/2026-09-13-remove-sprite-mode-design.md`

## Global Constraints

- **No new npm dependencies. No dependency removal either** — `package.json`/`package-lock.json` are out of scope for this plan (a `js-interpreter` cleanup, if wanted, is a separate follow-up).
- **Do not change HTML block field names, the HTML generator's output format, or the CSP in `runtime/html/document.ts`.**
- **Do not rename the product** ("Game HTML" / "Kodako HTML") — out of scope.
- **`formatVersion` stays `1`.** This plan loosens previously-required `Project` fields (`activeMode`, `sprite`) to "ignored if present," which is backward compatible — it is NOT a schema version bump.
- **Old saved projects must still load** — a project JSON that still has `activeMode`/`sprite` keys from before this plan must pass `validate()` and open normally (its Sprite data is simply inert from then on; JS objects tolerate unrecognised extra properties).
- **Docs (`PRD.md`, `Design.md`, `README.md`, landing copy) are NOT touched by this plan** — that is PR-E2, done directly by the coordinator afterward (see spec). This plan only adds one line to `docs/ROADMAP.md` in Task 4.
- **Formatting:** run `npm run format` before each task's lint/commit step; a Prettier-only `lint` failure is fixed with `npm run format`, never by hand.
- **Commit trailers** — every commit message ends with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
  ```
- **Full gate (green before the PR):** `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`.
- **Branch:** `remove-sprite-mode` off `main`. `gh pr merge` is blocked in this environment — open the PR and stop; the user merges.

---

### Task 1: `src/runtime/asset-library.ts` — the shared image-asset module (additive only)

**Files:**
- Create: `src/runtime/asset-library.ts`
- Create: `src/runtime/asset-library/{apple,arrow,ball,bug,cat,circle,cloud,fish,flower,heart,robot,rocket,square,star,triangle}.svg` (15 files — byte-identical copies of the existing files at `src/runtime/sprite/assets/<name>.svg`)
- Test: `tests/unit/asset-library.test.ts`

**Interfaces:**
- Consumes: nothing new (the 15 SVG files, copied).
- Produces:
  - `export type BuiltinAsset = { id: string; name: string; url: string }`
  - `export const BUILTIN_IMAGES: readonly BuiltinAsset[]` (15 entries)
  - `export const BUILTIN_BY_ID: ReadonlyMap<string, BuiltinAsset>`
  - `export function isBuiltinAssetId(id: string): boolean`
  - `export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024`
  - `export function loadUploadedImage(file: File): Promise<{ dataUrl: string; name: string }>`
  - `export function resolveAssetUrl(assetId: string, projectAssets: Record<string, { ref: string }>): string | null`

This task does NOT touch `src/runtime/sprite/assets.ts`, `html-mode.ts`, `preview.ts`, or `export.ts` — Sprite mode keeps working unchanged, HTML mode keeps working unchanged. The new module and its 15 SVGs simply exist alongside the old ones for now (Task 3 deletes the old copies once nothing points at them).

- [ ] **Step 1: Copy the 15 SVG files into the new folder**

Run:
```bash
mkdir -p src/runtime/asset-library
for f in apple arrow ball bug cat circle cloud fish flower heart robot rocket square star triangle; do
  cp "src/runtime/sprite/assets/$f.svg" "src/runtime/asset-library/$f.svg"
done
```

- [ ] **Step 2: Write the failing test**

Create `tests/unit/asset-library.test.ts`:

```ts
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUILTIN_BY_ID,
  BUILTIN_IMAGES,
  loadUploadedImage,
  MAX_UPLOAD_BYTES,
  resolveAssetUrl,
} from '../../src/runtime/asset-library';

describe('built-in image library', () => {
  it('contains 15 unique builtin images', () => {
    expect(BUILTIN_IMAGES).toHaveLength(15);
    const ids = BUILTIN_IMAGES.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('builtin:'))).toBe(true);
    expect(BUILTIN_BY_ID.get('builtin:cat')?.name).toBe('Kucing');
  });

  it.each([
    ['builtin:robot', 'Robot'],
    ['builtin:cloud', 'Awan'],
    ['builtin:flower', 'Bunga'],
    ['builtin:fish', 'Ikan'],
    ['builtin:rocket', 'Roket'],
    ['builtin:apple', 'Apel'],
  ])('resolves %s', (id, name) => {
    expect(BUILTIN_BY_ID.get(id)?.name).toBe(name);
    expect(resolveAssetUrl(id, {})).toBeTruthy();
  });

  it('keeps every bundled SVG small and free of executable or external content', async () => {
    const names = [
      'cat', 'ball', 'arrow', 'square', 'star', 'circle', 'triangle', 'bug',
      'heart', 'robot', 'cloud', 'flower', 'fish', 'rocket', 'apple',
    ];
    for (const name of names) {
      const file = resolve(process.cwd(), 'src/runtime/asset-library', `${name}.svg`);
      const source = await readFile(file, 'utf8');
      expect((await stat(file)).size, name).toBeLessThan(3072);
      expect(source, name).toContain('viewBox="0 0 100 100"');
      expect(source.toLowerCase(), name).not.toContain('<script');
      const withoutSvgNamespace = source.replace('http://www.w3.org/2000/svg', '');
      expect(withoutSvgNamespace, name).not.toMatch(/https?:\/\//i);
    }
  });

  it('rejects oversized and non-image uploads in Bahasa Indonesia', async () => {
    const oversized = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'besar.png', {
      type: 'image/png',
    });
    const text = new File(['halo'], 'catatan.txt', { type: 'text/plain' });

    await expect(loadUploadedImage(oversized)).rejects.toThrow(/terlalu besar/i);
    await expect(loadUploadedImage(text)).rejects.toThrow(/bukan gambar/i);
  });

  it('loads a small image as a data URL', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'x.png', {
      type: 'image/png',
    });

    await expect(loadUploadedImage(file)).resolves.toEqual({
      dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
      name: 'x.png',
    });
  });

  it('resolves builtin, embedded, and missing asset URLs', () => {
    expect(resolveAssetUrl('builtin:cat', {})).toBeTruthy();
    expect(resolveAssetUrl('x', { x: { ref: 'data:image/png;base64,eA==' } })).toBe(
      'data:image/png;base64,eA==',
    );
    expect(resolveAssetUrl('missing', {})).toBeNull();
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run tests/unit/asset-library.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/runtime/asset-library.ts`**

```ts
import arrowUrl from './asset-library/arrow.svg?url';
import appleUrl from './asset-library/apple.svg?url';
import ballUrl from './asset-library/ball.svg?url';
import bugUrl from './asset-library/bug.svg?url';
import catUrl from './asset-library/cat.svg?url';
import circleUrl from './asset-library/circle.svg?url';
import cloudUrl from './asset-library/cloud.svg?url';
import fishUrl from './asset-library/fish.svg?url';
import flowerUrl from './asset-library/flower.svg?url';
import heartUrl from './asset-library/heart.svg?url';
import robotUrl from './asset-library/robot.svg?url';
import rocketUrl from './asset-library/rocket.svg?url';
import squareUrl from './asset-library/square.svg?url';
import starUrl from './asset-library/star.svg?url';
import triangleUrl from './asset-library/triangle.svg?url';

export type BuiltinAsset = { id: string; name: string; url: string };

export const BUILTIN_IMAGES: readonly BuiltinAsset[] = [
  { id: 'builtin:cat', name: 'Kucing', url: catUrl },
  { id: 'builtin:ball', name: 'Bola', url: ballUrl },
  { id: 'builtin:arrow', name: 'Panah', url: arrowUrl },
  { id: 'builtin:square', name: 'Kotak', url: squareUrl },
  { id: 'builtin:star', name: 'Bintang', url: starUrl },
  { id: 'builtin:circle', name: 'Lingkaran', url: circleUrl },
  { id: 'builtin:triangle', name: 'Segitiga', url: triangleUrl },
  { id: 'builtin:bug', name: 'Kumbang', url: bugUrl },
  { id: 'builtin:heart', name: 'Hati', url: heartUrl },
  { id: 'builtin:robot', name: 'Robot', url: robotUrl },
  { id: 'builtin:cloud', name: 'Awan', url: cloudUrl },
  { id: 'builtin:flower', name: 'Bunga', url: flowerUrl },
  { id: 'builtin:fish', name: 'Ikan', url: fishUrl },
  { id: 'builtin:rocket', name: 'Roket', url: rocketUrl },
  { id: 'builtin:apple', name: 'Apel', url: appleUrl },
];

export const BUILTIN_BY_ID: ReadonlyMap<string, BuiltinAsset> = new Map(
  BUILTIN_IMAGES.map((asset) => [asset.id, asset]),
);

export function isBuiltinAssetId(id: string): boolean {
  return id.startsWith('builtin:');
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export function loadUploadedImage(file: File): Promise<{ dataUrl: string; name: string }> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(new Error('Gambar terlalu besar (maks 2 MB).'));
  }
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('File itu bukan gambar.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve({ dataUrl: reader.result, name: file.name });
      else reject(new Error('Gambar tidak dapat dibaca.'));
    };
    reader.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
    reader.readAsDataURL(file);
  });
}

export function resolveAssetUrl(
  assetId: string,
  projectAssets: Record<string, { ref: string }>,
): string | null {
  if (isBuiltinAssetId(assetId)) return BUILTIN_BY_ID.get(assetId)?.url ?? null;
  return projectAssets[assetId]?.ref ?? null;
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npx vitest run tests/unit/asset-library.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/runtime/asset-library.ts src/runtime/asset-library/ tests/unit/asset-library.test.ts
git commit -m "feat(runtime): shared built-in image library + upload/resolve helpers

New src/runtime/asset-library.ts, extracted ahead of the Sprite-mode
removal — HTML mode's image upload and asset:<id> resolution will move
onto this in the next task. Sprite mode's own asset module is untouched
for now.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

### Task 2: Repoint HTML mode to the new asset library

**Files:**
- Modify: `src/app/editor/html-mode/html-mode.ts`
- Modify: `src/runtime/html/preview.ts`
- Modify: `src/runtime/html/export.ts`

**Interfaces:**
- Consumes: `BUILTIN_IMAGES`, `loadUploadedImage`, `resolveAssetUrl` from Task 1's `src/runtime/asset-library.ts`.
- Produces: nothing new — same runtime behaviour, different import source.

- [ ] **Step 1: `html-mode.ts` — swap the import and the one usage**

Change:
```ts
import { BUILTIN_COSTUMES, loadUploadedImage } from '../../../runtime/sprite/assets';
```
to:
```ts
import { BUILTIN_IMAGES, loadUploadedImage } from '../../../runtime/asset-library';
```

Then in `assetOptions()`, change:
```ts
    const builtins: [string, string][] = BUILTIN_COSTUMES.map((asset) => [asset.name, asset.id]);
```
to:
```ts
    const builtins: [string, string][] = BUILTIN_IMAGES.map((asset) => [asset.name, asset.id]);
```

- [ ] **Step 2: `preview.ts` and `export.ts` — swap the import**

In both `src/runtime/html/preview.ts` and `src/runtime/html/export.ts`, change:
```ts
import { resolveAssetUrl } from '../sprite/assets';
```
to:
```ts
import { resolveAssetUrl } from '../asset-library';
```

- [ ] **Step 3: Verify**

Run: `npx vitest run tests/unit/html-mode-view.test.ts tests/unit/html-preview.test.ts tests/unit/html-export.test.ts tests/unit/html-mode-persistence.test.ts && npm run typecheck`
Expected: PASS. (`html-mode-persistence.test.ts` still exists and still passes here — Task 3 deletes it, not this one.)

- [ ] **Step 4: Run the HTML-mode E2E**

Run: `npx playwright test tests/e2e/html-mode.spec.ts`
Expected: PASS (image upload / preview / export paths all still work, now via the shared module).

- [ ] **Step 5: Format, commit**

```bash
npm run format
git add src/app/editor/html-mode/html-mode.ts src/runtime/html/preview.ts src/runtime/html/export.ts
git commit -m "refactor(html): use the shared asset-library for image upload + resolution

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

### Task 3: Remove Sprite mode — blocks, runtime, UI, project model, and every test that referenced any of it

This is one task because TypeScript's `tsc --noEmit` checks the whole program: deleting a file and fixing every one of its dependents has to land together, or every intermediate point fails to compile. Work through the lettered steps in order; steps A–C are pure deletions (safe to do first, nothing left importing them will compile until steps D–H are also done — that's expected and fine, this task's own build/test verification happens at the end in step K).

**Files touched:** see each lettered step. High-level: everything in the spec's "Yang murni milik Sprite mode" list is deleted; `core/project.ts`, `app/editor/editor-view.ts`, `app/editor/header.ts`, `app/editor/editor.css`, `blocks/index.ts`, `blocks/theme.ts`, `blocks/theme.css`, `blocks/category-icons.ts`, `app/help/help-panel.ts`, `app/i18n/id.json` are edited; a set of test files are deleted or edited (listed in step I/J).

**Interfaces:**
- Consumes: `src/runtime/asset-library.ts` (Task 1/2, untouched by this task).
- Produces: `installBlockly()` (replaces `installSpriteBlockly`/`installHtmlBlockly`), `blocklyTheme` (replaces `spriteTheme`; already existed as an alias). `Project` no longer has `activeMode`/`sprite`. `HeaderDeps` no longer has `mode`/`onModeChange`.

- [ ] **Step A: Delete every Sprite-owned source file and asset**

```bash
git rm -r \
  src/blocks/sprite \
  src/runtime/sprite \
  src/app/editor/sprite-mode \
  src/core/sprite-project.ts \
  scripts/gen-sounds.mjs
```

(`git rm -r src/runtime/sprite` removes `runtime/sprite/assets.ts`, its `assets/` folder — the 15 costume SVGs now duplicated safely in `src/runtime/asset-library/` from Task 1, the 6 `bg-*.svg` backdrops, and `assets/sounds/*.wav` — and every sprite runtime `.ts` file in one shot.)

- [ ] **Step B: Rewrite `src/blocks/theme.ts`**

Replace the entire file with:

```ts
import * as Blockly from 'blockly/core';
import './theme.css';

export const CATEGORY_COLORS: Record<'structure' | 'content' | 'style', string> = {
  structure: '#1E88E5',
  content: '#43A047',
  style: '#8E24AA',
};

const shade = (hex: string, amount: number): string => {
  const target = amount > 0 ? 255 : 0;
  const ratio = Math.abs(amount);
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels
    .map((channel) =>
      Math.round(channel + (target - channel) * ratio)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
};

const blockStyle = (name: keyof typeof CATEGORY_COLORS) => ({
  colourPrimary: CATEGORY_COLORS[name],
  colourSecondary: shade(CATEGORY_COLORS[name], 0.12),
  colourTertiary: shade(CATEGORY_COLORS[name], -0.2),
});

export const blocklyTheme = Blockly.Theme.defineTheme('kodako-html', {
  name: 'kodako-html',
  base: Blockly.Themes.Classic,
  blockStyles: {
    structure_blocks: blockStyle('structure'),
    content_blocks: blockStyle('content'),
    style_blocks: blockStyle('style'),
  },
  categoryStyles: {
    structure_category: { colour: CATEGORY_COLORS.structure },
    content_category: { colour: CATEGORY_COLORS.content },
    style_category: { colour: CATEGORY_COLORS.style },
  },
  fontStyle: {
    family: 'system-ui, "Segoe UI", Roboto, sans-serif',
    size: 12,
    weight: '600',
  },
  componentStyles: {
    workspaceBackgroundColour: '#f7f8fb',
    toolboxBackgroundColour: '#ffffff',
    toolboxForegroundColour: '#3b3b48',
    flyoutBackgroundColour: '#eef0f5',
    flyoutForegroundColour: '#3b3b48',
    flyoutOpacity: 1,
    scrollbarColour: '#c8ccd8',
    scrollbarOpacity: 0.6,
    insertionMarkerColour: '#1e88e5',
    insertionMarkerOpacity: 0.4,
    cursorColour: '#1e88e5',
  },
  startHats: true,
});
```

(`spriteTheme` and its alias export are gone; `blocklyTheme` is now the one real name. `startHats: true` is kept even though no remaining block uses a hat shape — it's a harmless renderer flag, not worth a behaviour change here.)

- [ ] **Step C: Rewrite `src/blocks/category-icons.ts`**

Replace the entire file with:

```ts
// Hand-authored category glyphs for the Scratch-style toolbox rail.
//
// One tiny white glyph per toolbox category, 20x20 viewBox, single-colour
// (`fill="#fff"`), embedded as a `data:image/svg+xml,` URI. No icon library,
// no external asset.
//
// NOTE: `src/blocks/theme.css` mirrors these exact data-URI strings in
// `mask-image: url("…")` rules on `.kodako-cat-icon--<key>`. This module is the
// source of truth (the icon unit test reads it); keep the two in sync when a
// glyph changes.

export type IconKey = 'structure' | 'content' | 'style';

const svg = (body: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#fff">${body}</svg>`,
  )}`;

export const CATEGORY_ICON: Record<IconKey, string> = {
  structure: svg(
    '<path d="M8 4 3 10l5 6 1.5-1.5L6 10l3.5-4.5zM12 4l5 6-5 6-1.5-1.5L14 10l-3.5-4.5z"/>',
  ),
  content: svg('<path d="M2 4h16v12H2zm2 10 4-5 3 3 3-4 4 6z"/><circle cx="7" cy="8" r="1.6"/>'),
  style: svg('<path d="M10 2s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>'),
};
```

- [ ] **Step D: Trim `src/blocks/theme.css`**

Delete these rule blocks entirely (identify by selector — the file currently has them between the generic rules at the top and the `/* pill colour per category */` comment, and again right after it):

1. The 8 `.blocklyToolboxDiv .kodako-cat-icon--<key>` blocks for `motion`, `looks`, `sound`, `events`, `control`, `sensing`, `operators`, `variables` (keep `structure`, `content`, `style`).
2. The 8 `.blocklyToolboxDiv .kodako-cat--<key> .blocklyTreeRow { background: ... }` rules for the same 8 keys (keep `structure`, `content`, `style`).
3. The whole "light categories" comment block: both `.kodako-cat--events/control/sensing .blocklyTreeRow { color }`, `.blocklyTreeLabel { text-shadow }`, and `.kodako-cat-icon { background-color }` triple-selector rules (`structure`/`content`/`style` were never "light" categories — they keep the default white label/glyph from the generic rules above, so nothing needs to replace this block).

Everything else in the file (generic `.blocklyToolboxDiv`/`.blocklyFlyout`/`.blocklyText`/`.blocklyMainBackground`, the `.blocklyTreeRow`/`.blocklyTreeRowContentContainer`/`.blocklyTreeLabel`/`.kodako-cat-icon` base rules, the hover/open-category/dim/flyout-wash/flyout-button rules at the bottom) is generic and stays untouched.

- [ ] **Step E: Rewrite `src/blocks/index.ts`**

Replace the entire file with:

```ts
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as Id from 'blockly/msg/id';
import { registerKodakoFlyout } from './flyout';
import { registerHtmlBlocks } from './html/blocks';
import { registerHtmlGenerator } from './html/generator';
import { blocklyTheme } from './theme';

export { Blockly, blocklyTheme };
export { attachToolboxWash } from './toolbox-wash';
export { KodakoVerticalFlyout } from './flyout';
export { setHtmlAssetOptionsProvider } from './html/blocks';
export { generateHtml } from './html/generator';
export type { GeneratedHtml } from './html/generator';
export { htmlToolbox } from './html/toolbox';
export const BLOCKLY_LOCALE = 'id';

let installed = false;

export function installBlockly(): void {
  if (installed) return;
  registerKodakoFlyout();
  Blockly.setLocale(Id as unknown as Record<string, string>);
  registerHtmlBlocks();
  registerHtmlGenerator();
  installed = true;
}
```

- [ ] **Step F: Rewrite `src/core/project.ts`**

Replace the entire file with:

```ts
export type ProjectAsset = {
  kind: 'image' | 'sound';
  name: string;
  source: 'builtin' | 'embedded';
  ref: string;
};

export type Project = {
  formatVersion: 1;
  meta: { name: string; createdAt: string; updatedAt: string };
  html: { workspace: Record<string, unknown> };
  assets: Record<string, ProjectAsset>;
};

export function createEmptyProject(name: string): Project {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    meta: { name, createdAt: now, updatedAt: now },
    html: { workspace: {} },
    assets: {},
  };
}

const CURRENT_VERSION = 1;

export function migrate(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || !('formatVersion' in input)) {
    throw new Error('Format project tidak dikenal. File ini mungkin bukan project Game HTML.');
  }
  const version = (input as { formatVersion: unknown }).formatVersion;
  if (version === CURRENT_VERSION) return input;
  throw new Error(`Versi format project (${String(version)}) tidak didukung.`);
}

type ValidateResult = { ok: true; project: Project } | { ok: false; errors: string[] };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validate(input: unknown): ValidateResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) return { ok: false, errors: ['Project harus berupa objek.'] };

  if (input.formatVersion !== 1) errors.push('formatVersion harus 1.');

  const meta = input.meta;
  if (
    !isPlainObject(meta) ||
    typeof meta.name !== 'string' ||
    typeof meta.createdAt !== 'string' ||
    typeof meta.updatedAt !== 'string'
  ) {
    errors.push('meta.name / meta.createdAt / meta.updatedAt tidak valid.');
  }

  const html = input.html;
  if (!isPlainObject(html) || !isPlainObject(html.workspace))
    errors.push('html.workspace tidak valid.');

  const assets = input.assets;
  if (!isPlainObject(assets)) {
    errors.push('assets harus objek.');
  } else {
    for (const [id, a] of Object.entries(assets)) {
      if (
        !isPlainObject(a) ||
        (a.kind !== 'image' && a.kind !== 'sound') ||
        typeof a.name !== 'string' ||
        (a.source !== 'builtin' && a.source !== 'embedded') ||
        typeof a.ref !== 'string'
      ) {
        errors.push(`assets["${id}"] tidak valid.`);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, project: input as Project };
}

export function serializeProject(p: Project): string {
  return JSON.stringify(p, null, 2);
}

export function parseProjectText(text: string): ValidateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['File bukan JSON yang valid.'] };
  }
  let migrated: unknown;
  try {
    migrated = migrate(parsed);
  } catch (e) {
    return {
      ok: false,
      errors: [e instanceof Error ? e.message : 'Gagal membaca format project.'],
    };
  }
  return validate(migrated);
}
```

Note what's gone: `ProjectMode`, `SpriteData`, `AssetRef` types; `activeMode`/`sprite` from `Project` and from `createEmptyProject`; the `activeMode`/`sprite` branches in `validate()`; the default `assets['builtin:cat']` seed (HTML mode never reads `project.assets` for `builtin:*` ids — see `assetOptions()` in `html-mode.ts`, it lists `BUILTIN_IMAGES` directly — so the seed was already dead for HTML mode); the now-unused `newId` import.

- [ ] **Step G: Rewrite `src/app/editor/header.ts`**

Replace the entire file with:

```ts
import { t } from '../i18n';

export type HeaderDeps = {
  name: string;
  onNameChange: (name: string) => void;
  onBack: () => void;
  onSave: () => void;
  onOpen: () => void;
  onExport: () => void;
  onHelp: () => void;
};

export function renderHeader(root: HTMLElement, deps: HeaderDeps): () => void {
  root.innerHTML = `
    <header class="editor__header">
      <button class="btn" data-back>${t('editor.back')}</button>
      <input class="editor__name" data-name aria-label="${t('home.rename')}" />
      <button class="btn" data-save>${t('editor.save')}</button>
      <button class="btn" data-open>${t('editor.open')}</button>
      <button class="btn" data-export>${t('editor.export')}</button>
      <span class="editor__spacer"></span>
      <button class="btn" data-help>${t('help.open')}</button>
    </header>
  `;

  const nameInput = root.querySelector<HTMLInputElement>('[data-name]')!;
  nameInput.value = deps.name;

  const onChange = () => deps.onNameChange(nameInput.value.trim());
  const onClick = (ev: MouseEvent) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>(
      '[data-back],[data-save],[data-open],[data-export],[data-help]',
    );
    if (!el) return;
    if (el.hasAttribute('data-back')) deps.onBack();
    else if (el.hasAttribute('data-save')) deps.onSave();
    else if (el.hasAttribute('data-open')) deps.onOpen();
    else if (el.hasAttribute('data-export')) deps.onExport();
    else if (el.hasAttribute('data-help')) deps.onHelp();
  };

  nameInput.addEventListener('change', onChange);
  root.addEventListener('click', onClick);

  return () => {
    nameInput.removeEventListener('change', onChange);
    root.removeEventListener('click', onClick);
    root.innerHTML = '';
  };
}
```

- [ ] **Step H: Rewrite `src/app/editor/editor-view.ts`**

Replace the entire file with:

```ts
import './editor.css';
import type { Project } from '../../core/project';
import type { Storage } from '../../core/storage';
import { renderHeader } from './header';
import { renderHtmlMode } from './html-mode/html-mode';
import { renderHelpPanel } from '../help/help-panel';

export type EditorDeps = {
  id: string;
  project: Project;
  storage: Storage;
  onBack: () => void;
};

const AUTOSAVE_MS = 300;

export function renderEditor(root: HTMLElement, deps: EditorDeps): () => void {
  const { id, project, storage } = deps;

  root.innerHTML = `
    <div class="editor">
      <div data-header></div>
      <div class="editor__workspace" data-workspace></div>
    </div>
  `;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const scheduleSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void storage.saveProject(id, project).catch((err) => console.error(err));
    }, AUTOSAVE_MS);
  };

  const helpPanel = renderHelpPanel(root);

  const workspaceEl = root.querySelector<HTMLElement>('[data-workspace]')!;
  const cleanupMode = renderHtmlMode(workspaceEl, {
    project,
    storage,
    markDirty: scheduleSave,
  });

  const cleanupHeader = renderHeader(root.querySelector<HTMLElement>('[data-header]')!, {
    name: project.meta.name,
    onNameChange: (name) => {
      if (!name || name === project.meta.name) return;
      project.meta.name = name;
      project.meta.updatedAt = new Date().toISOString();
      scheduleSave();
    },
    onBack: deps.onBack,
    onSave: () => void storage.saveProject(id, project).catch((err) => console.error(err)),
    onOpen: () => console.info('Buka project dari editor: menyusul pada fase berikutnya.'),
    onExport: () => void storage.exportToFile(project).catch((err) => console.error(err)),
    onHelp: () => helpPanel.open(),
  });

  return () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
      void storage.saveProject(id, project).catch((err) => console.error(err));
    }
    cleanupMode();
    cleanupHeader();
    helpPanel.dispose();
    root.innerHTML = '';
  };
}
```

Note: `getThumbnail` plumbing is gone. It only ever fed from Sprite mode's stage canvas snapshot (`renderSpriteMode(..., { getThumbnail })`); `renderHtmlMode`'s deps never included it, so any HTML-mode project already saved with `thumbnailDataUrl` always `undefined` before this change — this is not a new regression, just removing now-provably-dead plumbing. `storage.saveProject(id, project)` (2-arg form) relies on its existing optional 3rd parameter.

- [ ] **Step I: Trim `src/app/editor/editor.css`**

Delete the `.editor__modes { ... }` rule, the `.editor__modes .btn[aria-pressed='true'] { ... }` rule, and the `.editor__modes .btn[aria-pressed='true']:hover { ... }` rule (the last one was added in Fase D's hover pass). Everything else in the file is unrelated and stays.

- [ ] **Step J: Rewrite `src/app/help/help-panel.ts`**

Change:
```ts
type Section = { key: 'start' | 'sprite' | 'html' | 'save' | 'trouble' };

const SECTIONS: Section[] = [
  { key: 'start' },
  { key: 'sprite' },
  { key: 'html' },
  { key: 'save' },
  { key: 'trouble' },
];
```
to:
```ts
type Section = { key: 'start' | 'html' | 'save' | 'trouble' };

const SECTIONS: Section[] = [
  { key: 'start' },
  { key: 'html' },
  { key: 'save' },
  { key: 'trouble' },
];
```

- [ ] **Step K: Edit `src/app/i18n/id.json`**

Delete these keys entirely: `editor.mode.sprite`, `editor.mode.html`, every `editor.sprite.*` key (there are 28: `run`, `stop`, `tabSprite`, `tabCostume`, `tabSound`, `addSprite`, `removeSprite`, `fieldX`, `fieldY`, `fieldDirection`, `fieldSize`, `fieldVisible`, `newSpriteName`, `costumeBuiltinHeading`, `costumeCurrentHeading`, `uploadImage`, `uploadTooBig`, `uploadNotImage`, `backdropHeading`, `soundBuiltinHeading`, `soundCurrentHeading`, `soundEmpty`, `uploadSound`, `uploadSoundTooBig`, `uploadNotAudio`, `askPlaceholder`, `askSubmit`, `stageLabel`), `a11y.modeTablist`, `error.spriteRunFailed`, `error.lastSprite`, `error.audioUnavailable`, `help.sprite`.

Replace the value of `help.start` (currently `"Klik \"Project Baru\" di halaman depan untuk mulai. Pilih Mode Sprite untuk membuat animasi/permainan, atau Mode HTML untuk membuat halaman web."`) with:
```
"Klik \"Project Baru\" di halaman depan untuk mulai. Seret blok dari kiri untuk menyusun halaman HTML-mu."
```

Replace the value of `help.trouble` (currently `"Blok tidak jalan? Pastikan tersambung di bawah blok \"saat bendera hijau diklik\". Suara tidak keluar? Sebagian peramban lama tidak mendukung suara. File project rusak? Buat project baru dan susun ulang bloknya."`) with:
```
"Blok tidak tampil di pratinjau? Pastikan bloknya tersambung ke blok lain di atasnya. File project rusak? Buat project baru dan susun ulang bloknya."
```

Leave every other key untouched (`home.*`, `editor.back/save/open/export/saved`, `editor.html.*`, `a11y.previewTablist`/`a11y.previewChrome`, `error.htmlExportFailed/loadProject/importFile`, `confirm.delete`, `boundary.*`, `toast.close`, `help.title/close/html/save`).

Keep the JSON valid (watch trailing commas after deleting keys).

- [ ] **Step L: Rewrite `tests/unit/blocks-theme.test.ts`**

Replace the entire file with:

```ts
import { describe, expect, it } from 'vitest';
import { blocklyTheme, CATEGORY_COLORS } from '../../src/blocks/theme';

const STYLE_NAMES = ['structure', 'content', 'style'] as const;

describe('Blockly polish theme', () => {
  it('exports one registered theme with complete category shades', () => {
    expect(blocklyTheme.name).toBe('kodako-html');

    for (const name of STYLE_NAMES) {
      expect(blocklyTheme.blockStyles[`${name}_blocks`]).toMatchObject({
        colourPrimary: CATEGORY_COLORS[name],
        colourSecondary: expect.stringMatching(/^#[0-9A-F]{6}$/),
        colourTertiary: expect.stringMatching(/^#[0-9A-F]{6}$/),
      });
    }
  });

  it('uses the classroom workspace component and font styles', () => {
    expect(blocklyTheme.componentStyles).toMatchObject({
      workspaceBackgroundColour: '#f7f8fb',
      toolboxBackgroundColour: '#ffffff',
      toolboxForegroundColour: '#3b3b48',
      flyoutBackgroundColour: '#eef0f5',
      flyoutForegroundColour: '#3b3b48',
      flyoutOpacity: 1,
      scrollbarColour: '#c8ccd8',
      scrollbarOpacity: 0.6,
      insertionMarkerColour: '#1e88e5',
      insertionMarkerOpacity: 0.4,
      cursorColour: '#1e88e5',
    });
    expect(blocklyTheme.fontStyle).toEqual({
      family: 'system-ui, "Segoe UI", Roboto, sans-serif',
      size: 12,
      weight: '600',
    });
  });
});
```

- [ ] **Step M: Rewrite `tests/unit/blocks-registry.test.ts`**

Replace the entire file with:

```ts
import { describe, expect, it } from 'vitest';
import { Blockly, blocklyTheme, installBlockly } from '../../src/blocks';

describe('installBlockly', () => {
  it('is idempotent and registers a headless workspace cleanly', () => {
    installBlockly();
    installBlockly();
    const ws = new Blockly.Workspace();
    expect(ws).toBeTruthy();
    ws.dispose();
  });

  it('exposes a theme with the three category colours', () => {
    expect(blocklyTheme).toBeTruthy();
    expect(Blockly.registry.hasItem(Blockly.registry.Type.THEME, 'kodako-html')).toBe(true);
  });
});
```

- [ ] **Step N: Edit `tests/unit/blocks-toolbox-icons.test.ts`**

Replace the entire file with:

```ts
import { describe, expect, it } from 'vitest';
import { htmlToolbox } from '../../src/blocks/html/toolbox';
import { CATEGORY_ICON } from '../../src/blocks/category-icons';

type Cat = { kind: string; cssconfig?: { icon?: string; container?: string } };

describe('toolbox category icons', () => {
  it('every html category declares a kodako icon class', () => {
    for (const c of (htmlToolbox as { contents: Cat[] }).contents) {
      expect(c.cssconfig?.icon).toMatch(/^kodako-cat-icon kodako-cat-icon--[a-z]+$/);
      const key = c.cssconfig!.icon!.split('--')[1];
      expect(c.cssconfig?.container).toBe(`blocklyToolboxCategory kodako-cat kodako-cat--${key}`);
    }
  });

  it('icon map covers every referenced key with an inline svg data URI', () => {
    const keys = (htmlToolbox as { contents: Cat[] }).contents.map(
      (c) => c.cssconfig!.icon!.split('--')[1],
    );
    for (const k of keys) {
      expect(CATEGORY_ICON[k as keyof typeof CATEGORY_ICON]).toMatch(/^data:image\/svg\+xml,/);
    }
  });
});
```

- [ ] **Step O: Rewrite `tests/unit/project.test.ts`**

Replace the entire file with:

```ts
import { describe, expect, it } from 'vitest';
import {
  createEmptyProject,
  migrate,
  parseProjectText,
  serializeProject,
  validate,
} from '../../src/core/project';

describe('createEmptyProject', () => {
  it('starts with an empty HTML workspace and no assets', () => {
    const p = createEmptyProject('Latihan 1');
    expect(p.formatVersion).toBe(1);
    expect(p.meta.name).toBe('Latihan 1');
    expect(p.meta.createdAt).toBe(p.meta.updatedAt);
    expect(p.html.workspace).toEqual({});
    expect(p.assets).toEqual({});
  });
});

describe('validate', () => {
  it('accepts a freshly created project', () => {
    const res = validate(createEmptyProject('X'));
    expect(res.ok).toBe(true);
  });
  it('rejects a non-object', () => {
    const res = validate(42);
    expect(res).toEqual({ ok: false, errors: expect.arrayContaining([expect.any(String)]) });
  });
  it('rejects wrong formatVersion', () => {
    const bad = { ...createEmptyProject('X'), formatVersion: 2 };
    const res = validate(bad);
    expect(res.ok).toBe(false);
  });
  it('rejects a project missing html.workspace', () => {
    const bad = { ...createEmptyProject('X'), html: {} };
    const res = validate(bad);
    expect(res.ok).toBe(false);
  });
  it('ignores leftover activeMode/sprite fields from a pre-Fase-E project', () => {
    const legacy = {
      ...createEmptyProject('X'),
      activeMode: 'sprite',
      sprite: { stage: { backdrop: null }, sprites: [] },
    };
    expect(validate(legacy).ok).toBe(true);
  });
});

describe('migrate', () => {
  it('passes through a v1 project', () => {
    const p = createEmptyProject('X');
    expect(migrate(p)).toBe(p);
  });
  it('throws an Indonesian error for a missing formatVersion', () => {
    expect(() => migrate({})).toThrowError(/format/i);
  });
});

describe('serialize round-trip', () => {
  it('is idempotent', () => {
    const p = createEmptyProject('Roundtrip');
    const once = serializeProject(p);
    const back = parseProjectText(once);
    expect(back.ok).toBe(true);
    if (back.ok) expect(serializeProject(back.project)).toBe(once);
  });
  it('reports an error for invalid JSON', () => {
    const res = parseProjectText('{ not json');
    expect(res.ok).toBe(false);
  });
});
```

(The new `'ignores leftover activeMode/sprite fields'` test is the regression proof for the spec's backward-compatibility decision — old saved projects must still open.)

- [ ] **Step P: Edit `tests/unit/editor-view.test.ts`**

Delete this test entirely:
```ts
  it('the mode toggle updates activeMode and pressed state', () => {
    renderEditor(root, { id: 'p1', project, storage, onBack: vi.fn() });
    root.querySelector<HTMLButtonElement>('[data-mode="html"]')!.click();
    expect(root.querySelector('[data-mode="html"]')!.getAttribute('aria-pressed')).toBe('true');
    vi.advanceTimersByTime(300);
    expect(storage.saved.at(-1)!.activeMode).toBe('html');
  });
```

In `beforeEach`, delete the line `project.activeMode = 'html';` (the field no longer exists on `Project`).

- [ ] **Step Q: Edit `tests/unit/a11y-smoke.test.ts`**

Delete these two imports:
```ts
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { setSpriteWorkspaceFactoryForTests } from '../../src/app/editor/sprite-mode/sprite-mode';
```
(keep the other imports as-is).

Delete the top-level call `installSpriteBlockly();`.

In `beforeEach`, delete the `setSpriteWorkspaceFactoryForTests(() => { ... })` call and the whole canvas 2D context mock block (`vi.spyOn(HTMLCanvasElement.prototype, 'getContext')...` and the `toDataURL` spy right after it) — both existed only to support rendering the Sprite stage canvas, which `mountEditor()` no longer touches.

In `afterEach`, delete the line `setSpriteWorkspaceFactoryForTests(null);`.

Delete these two tests entirely:
```ts
  it('exposes the mode toggle as an ARIA tablist', () => { ... });
  it('labels the stage canvas as an image', () => { ... });
```
and the test `'associates a label with every sprite-panel input'` (read the file to find its exact body — it queries `.sprite-panel`/similar selectors that no longer exist).

Keep `'gives every editor button an accessible name'` and `'gives every Home project card an accessible name'` unchanged (just re-verify they still reference only imports that still exist after the deletions above).

- [ ] **Step R: Edit `tests/unit/help-panel.test.ts`**

Change `expect(headings.length).toBe(5);` to `expect(headings.length).toBe(4);`.

- [ ] **Step S: Delete every Sprite-only test file**

```bash
git rm \
  tests/unit/blocks-sound-sensing.test.ts \
  tests/unit/blocks-sprite-defs.test.ts \
  tests/unit/blocks-sprite-generator.test.ts \
  tests/unit/blocks-sprite-toolbox.test.ts \
  tests/unit/html-mode-persistence.test.ts \
  tests/unit/sprite-api.test.ts \
  tests/unit/sprite-assets.test.ts \
  tests/unit/sprite-audio.test.ts \
  tests/unit/sprite-broadcast-wait.test.ts \
  tests/unit/sprite-event-bus.test.ts \
  tests/unit/sprite-highlight-say.test.ts \
  tests/unit/sprite-interpreter.test.ts \
  tests/unit/sprite-mode-view.test.ts \
  tests/unit/sprite-model.test.ts \
  tests/unit/sprite-multi-persist.test.ts \
  tests/unit/sprite-panels.test.ts \
  tests/unit/sprite-project.test.ts \
  tests/unit/sprite-runtime-context.test.ts \
  tests/unit/sprite-scheduler.test.ts \
  tests/unit/sprite-sensing.test.ts \
  tests/unit/sprite-sound-assets.test.ts \
  tests/unit/sprite-stage.test.ts
git rm tests/e2e/sprite-mode.spec.ts tests/e2e/sound-sensing.spec.ts
```

- [ ] **Step T: Edit `tests/e2e/polish.spec.ts`**

Delete the entire test `'the themed (Zelos) sprite workspace still loads a block and runs it'`.

In `'keyboard: Tab reaches Project Baru with a visible focus ring, and mode tabs respond to ArrowRight'`, delete the part of the test body that presses ArrowRight/ArrowLeft on the mode tablist and asserts the resulting `aria-selected`/focus (read the file to find the exact lines — they come after the "Project Baru has a visible focus ring" assertion). Rename the test to drop "and mode tabs respond to ArrowRight" from its title since that behaviour no longer exists. Keep the "Tab reaches Project Baru with a visible focus ring" portion.

- [ ] **Step U: Edit `tests/e2e/html-mode.spec.ts`**

In the first test (`'HTML mode previews, highlights, exports, and preserves a page'`), delete this trailing section (currently the last part of the test, after the export assertions):
```ts
  await page.getByRole('tab', { name: 'Mode Sprite' }).click();
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    B.getMainWorkspace().newBlock('sprite_move');
  });
  await page.getByRole('tab', { name: 'Mode HTML' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();
  await page.waitForFunction(() => {
    const blocks = (window as any).__kodakoBlockly.getMainWorkspace().getAllBlocks(false);
    return (
      blocks.some((block: any) => block.type === 'html_heading') &&
      blocks.some((block: any) => block.type === 'html_paragraph')
    );
  });
  await page.getByRole('tab', { name: 'Mode Sprite' }).click();
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  await page.waitForFunction(() => {
    const blocks = (window as any).__kodakoBlockly.getMainWorkspace().getAllBlocks(false);
    return blocks.some((block: any) => block.type === 'sprite_move');
  });
});
```
so the test ends right after the export assertions (`expect(exported).toContain('<p style="font-weight:bold">Dunia</p>');`), followed directly by the closing `});`.

- [ ] **Step V: Rename `installHtmlBlockly` → `installBlockly` everywhere it remains**

After steps A–U, the only "install" function left is the one from Step E. Run:

```bash
grep -rl "installHtmlBlockly" src/ tests/
```

For every file it lists, replace the identifier `installHtmlBlockly` with `installBlockly` (import and call sites — same token everywhere, no other change). This should touch exactly: `src/app/editor/html-mode/html-mode.ts`, `src/runtime/html/export.ts`, `tests/unit/blocks-html-defs.test.ts`, `tests/unit/blocks-html-generator.test.ts`, `tests/unit/html-export.test.ts`, `tests/unit/html-mode-view.test.ts`. If the grep lists anything else, read that file before editing it — it means this plan missed a caller.

- [ ] **Step W: Typecheck and fix stragglers**

Run: `npm run typecheck`

This is the real safety net for a deletion this size. Fix every reported error by re-reading the affected file — expected remaining errors, if any, are places this plan's step list missed (e.g., another `spriteTheme` or `EditorMode` reference). Do not suppress errors with `any`/`@ts-expect-error`; find and fix the actual dangling reference.

- [ ] **Step X: Run the full unit suite**

Run: `npm run format && npx vitest run`
Expected: PASS, with a much smaller file count (roughly 60 → 38 test files). Fix any failure by re-reading the specific test against the new code — do not weaken an assertion to make it pass without understanding why it changed.

- [ ] **Step Y: Run lint, build, chunks, e2e**

Run: `npm run lint && npm run build && npm run check:chunks && npm run test:e2e`
Expected: PASS. `check:chunks` should report a smaller editor entry chunk than before (Sprite runtime/UI is gone) — no action needed either way, just note the new number for the PR description.

- [ ] **Step Z: Commit**

```bash
git add -A
git commit -m "feat!: remove Sprite mode, editor is HTML-only

Sprite mode (blocks, generator, toolbox, runtime, editor UI) is deleted
entirely. The editor no longer has a mode switcher — it renders HTML
mode directly. Project.activeMode/Project.sprite are gone from the
schema (formatVersion stays 1: this loosens previously-required fields
to \"ignored if present\", not a breaking schema change — a project
saved before this commit still opens, its Sprite data just becomes
inert). The Blockly theme and category-icon set are trimmed to the 3
HTML categories (Struktur/Konten/Gaya); installSpriteBlockly/
installHtmlBlockly are unified into installBlockly(). The built-in
image library HTML mode's upload feature relies on
(src/runtime/sprite/assets.ts) was extracted to src/runtime/asset-library.ts
in an earlier commit on this branch, so nothing HTML-mode-relevant broke.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

### Task 4: ROADMAP entry, final gate, open PR

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Add the Fase E entry**

Append at the end of `docs/ROADMAP.md`, after the last existing paragraph (currently the Fase D paragraph, before the `## Fase 4` heading — read the file to find the exact insertion point, it goes right before the `---` that precedes `## Fase 4`):

```markdown
Fase E (2026-09-13) — **Mode Sprite dihapus.** Editor sekarang HTML-only:
tidak ada lagi pemilih mode, blok/generator/toolbox/runtime Sprite (gerak,
tampilan, suara, sensor, panggung) dan panel editornya dihapus dari repo.
Infrastruktur unggah/pilih gambar yang ternyata dipakai bersama HTML mode
dipindah ke `src/runtime/asset-library.ts`. Skema `Project` kehilangan
`activeMode`/`sprite` (project lama tetap bisa dibuka — field itu jadi
tidak terpakai, bukan galat). Tema Blockly & ikon kategori dipangkas ke
3 kategori HTML (Struktur/Konten/Gaya). Dokumentasi produk (PRD, Design,
README, landing) ditulis ulang terpisah — lihat
`docs/superpowers/specs/2026-09-13-remove-sprite-mode-design.md`.
```

- [ ] **Step 2: Full gate**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`
Expected: all green.

- [ ] **Step 3: Commit, push, open PR**

```bash
git add docs/ROADMAP.md
git commit -m "docs: ROADMAP entry for Fase E (Sprite mode removed)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
git push -u origin remove-sprite-mode
gh pr create --base main --title "Fase E · PR-E1 — Remove Sprite mode, editor is HTML-only" --body "$(cat <<'EOF'
## Ringkasan

Mode Sprite dihapus total dari kode. Editor sekarang satu mode: HTML.

- Blok/generator/toolbox/runtime Sprite + panel editornya + aset SVG/WAV
  terkait dihapus (~55 file).
- Infrastruktur unggah/pilih gambar yang ternyata dipakai HTML mode juga
  dipindah ke `src/runtime/asset-library.ts` (bukan ikut terhapus).
- Tema Blockly & set ikon kategori dipangkas ke 3 kategori HTML
  (Struktur/Konten/Gaya); `installSpriteBlockly`/`installHtmlBlockly`
  disatukan jadi `installBlockly()`.
- `Project` kehilangan `activeMode`/`sprite` dari skema. `formatVersion`
  tetap 1 (pelonggaran field, bukan breaking change) — project lama tetap
  bisa dibuka, bagian sprite-nya cuma jadi tidak terpakai. Ada tes regresi
  eksplisit untuk ini.
- Pemilih mode di header editor hilang total.

**PR-E2 (dokumentasi & landing) menyusul terpisah**, dikerjakan langsung
tanpa dokumen plan (kerja editorial satu tarikan napas, bukan tugas
mekanis) — lihat spec.

Spec: `docs/superpowers/specs/2026-09-13-remove-sprite-mode-design.md`
Plan: `docs/superpowers/plans/2026-09-13-remove-sprite-mode.md`

## Tes

- Unit baru: `tests/unit/asset-library.test.ts` (port dari `sprite-assets.test.ts`,
  bagian backdrop/suara dijatuhkan bersama fiturnya).
- `project.test.ts` punya tes regresi eksplisit: project lama dengan
  `activeMode`/`sprite` masih `validate()` OK.
- Gate penuh hijau; jumlah file test unit turun dari 60 ke ~38.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

Stop after `gh pr create`. The user merges.

---

## Self-Review

**1. Spec coverage**

| Spec item | Task/step |
|---|---|
| Delete every Sprite-owned source file/asset | Task 3 Step A |
| `spriteTheme`→`blocklyTheme`, 3-category trim | Task 3 Step B |
| `category-icons.ts` trim | Task 3 Step C |
| `theme.css` trim | Task 3 Step D |
| `blocks/index.ts` → single `installBlockly()` | Task 3 Step E, Step V |
| `runtime/asset-library.ts` extraction | Task 1, Task 2 |
| `core/project.ts` schema simplification + backward compat | Task 3 Step F, regression test in Step O |
| `editor-view.ts`/`header.ts`/`editor.css` mode-switcher removal | Task 3 Steps G, H, I |
| `help-panel.ts` section removal | Task 3 Step J |
| `id.json` key removal + help text rewrite | Task 3 Step K |
| Test suite cleanup (delete/edit every listed file) | Task 3 Steps L–U |
| ROADMAP new entry (append, not rewrite history) | Task 4 Step 1 |
| Full gate green | Task 3 Steps W–Y, Task 4 Step 2 |
| PR-E2 (docs/landing) explicitly out of this plan | Global Constraints, spec |

No uncovered spec requirement.

**2. Placeholder scan**

No "TBD"/"handle edge cases" without code. Every rewritten file has its complete new content inline. Deletion steps list exact paths (that IS the complete content of a deletion instruction — there is no diff to show). Step D (theme.css) and Step T/U (e2e edits) describe removal by exact rule/selector or exact code block rather than literal before/after, because the surrounding file is long and the plan already quoted the exact text being removed in each case — an implementer is not guessing.

**3. Type consistency**

- `BUILTIN_IMAGES`/`BUILTIN_BY_ID`/`resolveAssetUrl`/`loadUploadedImage`/`isBuiltinAssetId`/`MAX_UPLOAD_BYTES` — defined once in Task 1 Step 4, consumed with identical names in Task 2.
- `installBlockly` — defined in Task 3 Step E, consumed in Task 3 Step V (rename pass) and referenced in the Step Z commit message.
- `blocklyTheme` — defined in Task 3 Step B, consumed in Task 3 Steps E, L, M.
- `Project` shape (Task 3 Step F) matches every consumer touched in this plan (`editor-view.ts` Step H only reads `project.meta`/`project.html` indirectly via `renderHtmlMode`, which this plan does not modify and which already only used `project.meta`/`project.assets`/`html-project.ts` helpers — never `activeMode`/`sprite`).
- `HeaderDeps` (Step G) matches its one call site (Step H) — both drop `mode`/`onModeChange` together.

No inconsistencies found.
