# Fase 0 — Fondasi: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the project skeleton so a user can create, rename, duplicate, delete, reopen, import, and export block-editor projects from a Home screen, with an empty Editor shell, a static Indonesian landing page, a Tauri desktop wrapper proof-of-concept, and CI.

**Architecture:** 100% client-side. A Vite multi-page build produces `index.html` (editor SPA) and `landing.html` (marketing page). The editor SPA is plain TypeScript with a hash router and three views (Home, Editor). A `core/` layer holds the project data model and a `Storage` interface with two implementations (`WebStorage` using `localStorage` + File System Access API; `TauriStorage` using native OS dialogs). No framework, no backend, no runtime network calls.

**Tech Stack:** TypeScript (strict), Vite 6, Vitest 2 + jsdom (unit/integration), Playwright 1.49 (E2E), ESLint 9 (flat config) + typescript-eslint 8, Prettier 3, Tauri 2 (`@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`), npm, Node 20+.

**Spec:** `docs/Design.md` (architecture, repo layout, data model, storage) and `docs/PRD.md` (scope, non-goals). This plan implements **ROADMAP.md → Fase 0** only.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **Language:** every user-facing string (UI labels, buttons, errors, landing page copy) is **Bahasa Indonesia**. No English in the UI.
- **No third-party network calls at runtime.** All assets and libraries are bundled locally. No CDN `<script>`/`<link>`. No analytics/telemetry.
- **No backend, accounts, cloud sync, or community/sharing features.** Release 1 is offline-first.
- **Node 20+**, package manager is **npm**, ES modules (`"type": "module"`).
- **TypeScript strict mode** on; `npm run typecheck` (`tsc --noEmit`) must pass.
- **Project file:** extension `.ghtml.json`, `formatVersion: 1`.
- **Stage coordinate system:** `x` in `-240..240`, `y` in `-180..180`, `direction` in degrees where `90` = right (Scratch convention). Center of stage = `(0, 0)`.
- **localStorage key namespace:** `ghtml:projects` (summary list), `ghtml:project:<id>` (a project), `ghtml:project:<id>:tmp` (defensive write slot).
- **Commits:** Conventional Commits style, frequent, one per completed step group as noted.

---

## File Structure

**Created in this phase:**

| Path | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `vite.config.ts` | Build, TS, test config |
| `eslint.config.js`, `.prettierrc.json`, `.gitignore` | Lint/format |
| `index.html` | Editor SPA entry (`<div id="app">` + `src/main.ts`) |
| `landing.html` | Static landing page markup |
| `public/favicon.svg` | Favicon (local asset) |
| `src/main.ts` | Editor bootstrap: `startApp(#app, getStorage())` |
| `src/styles/base.css` | Global reset + layout primitives |
| `src/core/ids.ts` | `newId(prefix)` — unique, URL-safe ids |
| `src/core/events.ts` | `EventBus<M>` — typed on/emit/off |
| `src/core/project.ts` | `Project` types, `createEmptyProject`, `validate`, `migrate`, `serializeProject`, `parseProjectText` |
| `src/core/storage.ts` | `Storage` interface, `ProjectSummary` type, `isTauri()`, `getStorage()` factory |
| `src/core/web-storage.ts` | `WebStorage implements Storage` (localStorage + file pickers) |
| `src/core/tauri-storage.ts` | `TauriStorage implements Storage` (native dialogs, reuses localStorage for autosave) |
| `src/app/i18n/index.ts`, `src/app/i18n/id.json` | `t(key, params?)`, `formatDate(iso)` |
| `src/app/router.ts` | `Route` type, `parseHash`, `navigate`, `onRouteChange`, `currentRoute` |
| `src/app/home/project-manager.ts` | `ProjectManager` — CRUD orchestration over `Storage` |
| `src/app/home/home-view.ts` | `renderHome(root, deps)` — cards + actions |
| `src/app/editor/header.ts` | `renderHeader(root, deps)` — name/save/open/export/back/mode toggle |
| `src/app/editor/editor-view.ts` | `renderEditor(root, deps)` — header + empty workspace placeholder |
| `src/app/shell.ts` | `startApp(root, storage)` — router → view wiring + cleanup |
| `src/landing/landing.ts`, `src/landing/landing.css` | Landing behavior (footer year) + styles |
| `src-tauri/*` | Tauri 2 wrapper (config, `main.rs`, capabilities, icons) |
| `tests/unit/*.test.ts` | Vitest unit/integration suites |
| `tests/e2e/smoke.spec.ts`, `playwright.config.ts` | Playwright E2E |
| `.github/workflows/ci.yml` | Lint + typecheck + unit + build + E2E on push/PR |

---

## Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.gitignore`, `index.html`, `landing.html`, `public/favicon.svg`, `src/main.ts`, `src/styles/base.css`
- Test: `tests/unit/sanity.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: npm scripts `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `tauri`. A Vite multi-page setup with inputs `editor` (`index.html`) and `landing` (`landing.html`). Vitest configured with `environment: 'jsdom'`, test glob `tests/unit/**/*.test.ts`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "game-html",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . && prettier --check .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "tauri": "tauri"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "@playwright/test": "^1.49.0",
    "@tauri-apps/cli": "^2.1.0",
    "eslint": "^9.17.0",
    "jsdom": "^25.0.1",
    "prettier": "^3.4.2",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.18.0",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.1.1",
    "@tauri-apps/plugin-dialog": "^2.2.0",
    "@tauri-apps/plugin-fs": "^2.2.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests", "vite.config.ts", "eslint.config.js"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        editor: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create `eslint.config.js`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'src-tauri/target', 'node_modules', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly' } },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
);
```

- [ ] **Step 5: Create `.prettierrc.json`**

```json
{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules
dist
playwright-report
test-results
src-tauri/target
src-tauri/gen
*.local
```

- [ ] **Step 7: Create `index.html`**

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Game HTML — Editor</title>
    <link rel="stylesheet" href="/src/styles/base.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 8: Create `landing.html`** (minimal now; filled in Task 12)

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Editor blok untuk belajar membuat animasi dan halaman web, ala Scratch, berbahasa Indonesia." />
    <title>Game HTML</title>
    <link rel="stylesheet" href="/src/landing/landing.css" />
  </head>
  <body>
    <main id="landing"><h1>Game HTML</h1></main>
    <script type="module" src="/src/landing/landing.ts"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `public/favicon.svg`, `src/styles/base.css`, `src/landing/landing.css`, `src/landing/landing.ts`, `src/main.ts` placeholders**

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#4c97ff"/><rect x="7" y="9" width="18" height="5" rx="2.5" fill="#fff"/><rect x="7" y="18" width="12" height="5" rx="2.5" fill="#ffd500"/></svg>
```

`src/styles/base.css`:
```css
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1e1e1e; background: #f5f6f8; }
button { font: inherit; cursor: pointer; }
.btn { border: 1px solid #c8ccd4; background: #fff; border-radius: 8px; padding: 8px 14px; }
.btn-primary { background: #4c97ff; border-color: #4c97ff; color: #fff; }
```

`src/landing/landing.css`:
```css
body { margin: 0; font-family: system-ui, sans-serif; }
#landing { max-width: 960px; margin: 0 auto; padding: 24px; }
```

`src/landing/landing.ts`:
```ts
const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
```

`src/main.ts`:
```ts
// Wired to the app shell in Task 11.
document.getElementById('app')!.textContent = 'Memuat…';
```

- [ ] **Step 10: Create `tests/unit/sanity.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs vitest with jsdom', () => {
    expect(typeof document).toBe('object');
    document.body.innerHTML = '<p id="x">hi</p>';
    expect(document.getElementById('x')?.textContent).toBe('hi');
  });
});
```

- [ ] **Step 11: Install dependencies and Playwright browsers**

Run:
```bash
npm install
npx playwright install --with-deps chromium
```
Expected: completes without error; `node_modules` populated.

- [ ] **Step 12: Verify the toolchain**

Run:
```bash
npm run typecheck && npm run lint && npm test && npm run build
```
Expected: `typecheck` passes; `lint` passes; Vitest shows `1 passed`; `vite build` writes `dist/index.html` and `dist/landing.html`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + TypeScript + Vitest + ESLint toolchain"
```

---

## Task 2: Core data model (`core/project.ts` + `core/ids.ts`)

**Files:**
- Create: `src/core/ids.ts`, `src/core/project.ts`
- Test: `tests/unit/ids.test.ts`, `tests/unit/project.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `newId(prefix: string): string` — returns `` `${prefix}_${string}` ``, URL-safe, unique per call.
  - Types: `AssetRef = { assetId: string }`; `SpriteData`; `Project` (exact shape from `docs/Design.md` §3); `ProjectMode = 'sprite' | 'html'`.
  - `createEmptyProject(name: string): Project` — one default sprite named `"Sprite 1"` at `(0,0)` dir `90` size `100` visible `true` with empty `costumes`/`sounds`/`script:{}`; `activeMode: 'sprite'`; `meta.createdAt === meta.updatedAt` (ISO string); `assets: {}`.
  - `migrate(input: unknown): unknown` — throws `Error` with Indonesian message if `formatVersion` missing/unknown; returns input unchanged when `formatVersion === 1`.
  - `validate(input: unknown): { ok: true; project: Project } | { ok: false; errors: string[] }`.
  - `serializeProject(p: Project): string` — `JSON.stringify(p, null, 2)`.
  - `parseProjectText(text: string): { ok: true; project: Project } | { ok: false; errors: string[] }` — `JSON.parse` (catch → error) then `migrate` (catch → error) then `validate`.

- [ ] **Step 1: Write failing tests for `ids.ts`**

`tests/unit/ids.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { newId } from '../../src/core/ids';

describe('newId', () => {
  it('prefixes the id', () => {
    expect(newId('sprite')).toMatch(/^sprite_[A-Za-z0-9_-]+$/);
  });
  it('returns a different value each call', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId('p')));
    expect(ids.size).toBe(1000);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- ids`
Expected: FAIL — cannot resolve `../../src/core/ids`.

- [ ] **Step 3: Implement `src/core/ids.ts`**

```ts
let counter = 0;

export function newId(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${counter.toString(36)}${rand}`;
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- ids`
Expected: PASS (2 tests).

- [ ] **Step 5: Write failing tests for `project.ts`**

`tests/unit/project.test.ts`:
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
  it('has one default sprite and sprite mode', () => {
    const p = createEmptyProject('Latihan 1');
    expect(p.formatVersion).toBe(1);
    expect(p.meta.name).toBe('Latihan 1');
    expect(p.meta.createdAt).toBe(p.meta.updatedAt);
    expect(p.activeMode).toBe('sprite');
    expect(p.sprite.sprites).toHaveLength(1);
    expect(p.sprite.sprites[0]).toMatchObject({ x: 0, y: 0, direction: 90, size: 100, visible: true });
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
  it('rejects an unknown activeMode', () => {
    const bad = { ...createEmptyProject('X'), activeMode: 'game' };
    const res = validate(bad);
    expect(res.ok).toBe(false);
  });
  it('rejects a sprite with a non-numeric x', () => {
    const p = createEmptyProject('X');
    (p.sprite.sprites[0] as unknown as { x: unknown }).x = 'left';
    expect(validate(p).ok).toBe(false);
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

- [ ] **Step 6: Run and verify failure**

Run: `npm test -- project`
Expected: FAIL — cannot resolve `../../src/core/project`.

- [ ] **Step 7: Implement `src/core/project.ts`**

```ts
import { newId } from './ids';

export type ProjectMode = 'sprite' | 'html';
export type AssetRef = { assetId: string };

export type SpriteData = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: number;
  size: number;
  visible: boolean;
  costumes: AssetRef[];
  currentCostume: number;
  sounds: AssetRef[];
  script: Record<string, unknown>; // Blockly workspace JSON (opaque here)
};

export type ProjectAsset = {
  kind: 'image' | 'sound';
  name: string;
  source: 'builtin' | 'embedded';
  ref: string;
};

export type Project = {
  formatVersion: 1;
  meta: { name: string; createdAt: string; updatedAt: string };
  activeMode: ProjectMode;
  sprite: {
    stage: { backdrop: AssetRef | null };
    sprites: SpriteData[];
  };
  html: { workspace: Record<string, unknown> };
  assets: Record<string, ProjectAsset>;
};

export function createEmptyProject(name: string): Project {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    meta: { name, createdAt: now, updatedAt: now },
    activeMode: 'sprite',
    sprite: {
      stage: { backdrop: null },
      sprites: [
        {
          id: newId('sprite'),
          name: 'Sprite 1',
          x: 0,
          y: 0,
          direction: 90,
          size: 100,
          visible: true,
          costumes: [],
          currentCostume: 0,
          sounds: [],
          script: {},
        },
      ],
    },
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
  if (!isPlainObject(meta) || typeof meta.name !== 'string' || typeof meta.createdAt !== 'string' || typeof meta.updatedAt !== 'string') {
    errors.push('meta.name / meta.createdAt / meta.updatedAt tidak valid.');
  }

  if (input.activeMode !== 'sprite' && input.activeMode !== 'html') {
    errors.push('activeMode harus "sprite" atau "html".');
  }

  const sprite = input.sprite;
  if (!isPlainObject(sprite) || !isPlainObject(sprite.stage) || !Array.isArray(sprite.sprites)) {
    errors.push('sprite.stage / sprite.sprites tidak valid.');
  } else {
    const backdrop = (sprite.stage as Record<string, unknown>).backdrop;
    if (backdrop !== null && !(isPlainObject(backdrop) && typeof backdrop.assetId === 'string')) {
      errors.push('sprite.stage.backdrop harus null atau { assetId }.');
    }
    (sprite.sprites as unknown[]).forEach((s, i) => {
      if (!isPlainObject(s)) return errors.push(`sprite.sprites[${i}] bukan objek.`);
      if (typeof s.id !== 'string' || typeof s.name !== 'string') errors.push(`sprite.sprites[${i}].id/name tidak valid.`);
      for (const k of ['x', 'y', 'direction', 'size', 'currentCostume'] as const) {
        if (typeof s[k] !== 'number' || Number.isNaN(s[k])) errors.push(`sprite.sprites[${i}].${k} harus angka.`);
      }
      if (typeof s.visible !== 'boolean') errors.push(`sprite.sprites[${i}].visible harus boolean.`);
      if (!Array.isArray(s.costumes) || !Array.isArray(s.sounds)) errors.push(`sprite.sprites[${i}].costumes/sounds harus array.`);
      if (!isPlainObject(s.script)) errors.push(`sprite.sprites[${i}].script harus objek.`);
    });
  }

  const html = input.html;
  if (!isPlainObject(html) || !isPlainObject(html.workspace)) errors.push('html.workspace tidak valid.');

  const assets = input.assets;
  if (!isPlainObject(assets)) {
    errors.push('assets harus objek.');
  } else {
    for (const [id, a] of Object.entries(assets)) {
      if (!isPlainObject(a) || (a.kind !== 'image' && a.kind !== 'sound') || typeof a.name !== 'string' || (a.source !== 'builtin' && a.source !== 'embedded') || typeof a.ref !== 'string') {
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
    return { ok: false, errors: [e instanceof Error ? e.message : 'Gagal membaca format project.'] };
  }
  return validate(migrated);
}
```

- [ ] **Step 8: Run and verify pass**

Run: `npm test -- project ids`
Expected: PASS (all tests in both files).

- [ ] **Step 9: Commit**

```bash
git add src/core/ids.ts src/core/project.ts tests/unit/ids.test.ts tests/unit/project.test.ts
git commit -m "feat(core): project data model with validate/migrate/serialize"
```

---

## Task 3: Typed event bus (`core/events.ts`)

**Files:**
- Create: `src/core/events.ts`
- Test: `tests/unit/events.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `class EventBus<M extends Record<string, unknown>>` with:
  - `on<K extends keyof M>(type: K, fn: (payload: M[K]) => void): () => void` — returns an unsubscribe function.
  - `emit<K extends keyof M>(type: K, payload: M[K]): void`.
  - `off<K extends keyof M>(type: K, fn: (payload: M[K]) => void): void`.

- [ ] **Step 1: Write the failing test**

`tests/unit/events.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/events';

type M = { ping: { n: number }; done: void };

describe('EventBus', () => {
  it('delivers payloads to listeners', () => {
    const bus = new EventBus<M>();
    const fn = vi.fn();
    bus.on('ping', fn);
    bus.emit('ping', { n: 7 });
    expect(fn).toHaveBeenCalledWith({ n: 7 });
  });

  it('stops delivery after the returned unsubscribe is called', () => {
    const bus = new EventBus<M>();
    const fn = vi.fn();
    const off = bus.on('ping', fn);
    off();
    bus.emit('ping', { n: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('supports multiple listeners and is safe with none', () => {
    const bus = new EventBus<M>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('ping', a);
    bus.on('ping', b);
    expect(() => bus.emit('done', undefined as void)).not.toThrow();
    bus.emit('ping', { n: 2 });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- events`
Expected: FAIL — cannot resolve `../../src/core/events`.

- [ ] **Step 3: Implement `src/core/events.ts`**

```ts
type Listener<T> = (payload: T) => void;

export class EventBus<M extends Record<string, unknown>> {
  private listeners = new Map<keyof M, Set<Listener<unknown>>>();

  on<K extends keyof M>(type: K, fn: Listener<M[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn as Listener<unknown>);
    return () => this.off(type, fn);
  }

  off<K extends keyof M>(type: K, fn: Listener<M[K]>): void {
    this.listeners.get(type)?.delete(fn as Listener<unknown>);
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    for (const fn of this.listeners.get(type) ?? []) {
      (fn as Listener<M[K]>)(payload);
    }
  }
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- events`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/events.ts tests/unit/events.test.ts
git commit -m "feat(core): typed event bus"
```

---

## Task 4: Storage interface + `WebStorage` (`core/storage.ts`, `core/web-storage.ts`)

**Files:**
- Create: `src/core/storage.ts`, `src/core/web-storage.ts`
- Test: `tests/unit/web-storage.test.ts`

**Interfaces:**
- Consumes: `Project`, `createEmptyProject`, `serializeProject`, `parseProjectText`, `validate` from `core/project.ts`.
- Produces:
  - `type ProjectSummary = { id: string; name: string; updatedAt: string; thumbnailDataUrl: string | null }`.
  - `interface Storage` with:
    - `listProjects(): Promise<ProjectSummary[]>`
    - `loadProject(id: string): Promise<Project>` (rejects with `Error` if missing/corrupt)
    - `saveProject(id: string, project: Project, thumbnailDataUrl?: string | null): Promise<void>`
    - `deleteProject(id: string): Promise<void>`
    - `importFromFile(): Promise<Project>` (rejects if user cancels or file invalid)
    - `exportToFile(project: Project): Promise<void>`
    - `exportHtml(name: string, html: string): Promise<void>`
  - `const STORAGE_KEYS = { list: 'ghtml:projects', project: (id) => ..., tmp: (id) => ... }`.
  - `class WebStorage implements Storage`.

- [ ] **Step 1: Write the failing test**

`tests/unit/web-storage.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProject, serializeProject } from '../../src/core/project';
import { STORAGE_KEYS, WebStorage } from '../../src/core/web-storage';

beforeEach(() => localStorage.clear());

describe('WebStorage list/save/load/delete', () => {
  it('returns an empty list when nothing is stored', async () => {
    expect(await new WebStorage().listProjects()).toEqual([]);
  });

  it('saves a project and lists its summary', async () => {
    const s = new WebStorage();
    const p = createEmptyProject('Latihan');
    await s.saveProject('p1', p, null);
    const list = await s.listProjects();
    expect(list).toEqual([{ id: 'p1', name: 'Latihan', updatedAt: p.meta.updatedAt, thumbnailDataUrl: null }]);
  });

  it('round-trips a saved project through loadProject', async () => {
    const s = new WebStorage();
    const p = createEmptyProject('Latihan');
    await s.saveProject('p1', p, null);
    const loaded = await s.loadProject('p1');
    expect(loaded).toEqual(p);
  });

  it('clears the tmp slot after a successful save', async () => {
    const s = new WebStorage();
    await s.saveProject('p1', createEmptyProject('X'), null);
    expect(localStorage.getItem(STORAGE_KEYS.tmp('p1'))).toBeNull();
  });

  it('rejects loadProject for a missing id', async () => {
    await expect(new WebStorage().loadProject('nope')).rejects.toThrow(/tidak ditemukan/i);
  });

  it('rejects loadProject when the stored JSON is corrupt', async () => {
    localStorage.setItem(STORAGE_KEYS.project('bad'), '{ broken');
    await expect(new WebStorage().loadProject('bad')).rejects.toThrow();
  });

  it('does not overwrite the existing project if the new data fails to re-parse', async () => {
    const s = new WebStorage();
    const good = createEmptyProject('Good');
    await s.saveProject('p1', good, null);
    // A project whose JSON cannot round-trip is rejected before the real key is touched.
    const circular = createEmptyProject('Bad') as unknown as Record<string, unknown>;
    circular.self = circular;
    await expect(s.saveProject('p1', circular as never, null)).rejects.toThrow();
    expect(localStorage.getItem(STORAGE_KEYS.project('p1'))).toBe(serializeProject(good));
  });

  it('removes a project and its list entry on delete', async () => {
    const s = new WebStorage();
    await s.saveProject('p1', createEmptyProject('X'), null);
    await s.deleteProject('p1');
    expect(await s.listProjects()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEYS.project('p1'))).toBeNull();
  });

  it('updates the list entry (not duplicates it) when saving the same id twice', async () => {
    const s = new WebStorage();
    await s.saveProject('p1', createEmptyProject('First'), null);
    const second = createEmptyProject('Second');
    await s.saveProject('p1', second, null);
    const list = await s.listProjects();
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe('Second');
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- web-storage`
Expected: FAIL — cannot resolve `../../src/core/web-storage`.

- [ ] **Step 3: Implement `src/core/storage.ts`**

```ts
import type { Project } from './project';

export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
  thumbnailDataUrl: string | null;
};

export interface Storage {
  listProjects(): Promise<ProjectSummary[]>;
  loadProject(id: string): Promise<Project>;
  saveProject(id: string, project: Project, thumbnailDataUrl?: string | null): Promise<void>;
  deleteProject(id: string): Promise<void>;
  importFromFile(): Promise<Project>;
  exportToFile(project: Project): Promise<void>;
  exportHtml(name: string, html: string): Promise<void>;
}

export const STORAGE_KEYS = {
  list: 'ghtml:projects',
  project: (id: string) => `ghtml:project:${id}`,
  tmp: (id: string) => `ghtml:project:${id}:tmp`,
} as const;

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
```

- [ ] **Step 4: Implement `src/core/web-storage.ts`**

```ts
import { parseProjectText, serializeProject, type Project } from './project';
import { STORAGE_KEYS, type ProjectSummary, type Storage } from './storage';

export { STORAGE_KEYS };

function readList(): ProjectSummary[] {
  const raw = localStorage.getItem(STORAGE_KEYS.list);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectSummary[]) : [];
  } catch {
    return [];
  }
}

function writeList(list: ProjectSummary[]): void {
  localStorage.setItem(STORAGE_KEYS.list, JSON.stringify(list));
}

function upsertSummary(summary: ProjectSummary): void {
  const list = readList().filter((s) => s.id !== summary.id);
  list.unshift(summary);
  writeList(list);
}

function triggerDownload(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pickTextFile(accept: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('Tidak ada file yang dipilih.'));
      file.text().then(resolve, () => reject(new Error('Gagal membaca file.')));
    });
    input.click();
  });
}

export class WebStorage implements Storage {
  async listProjects(): Promise<ProjectSummary[]> {
    return readList();
  }

  async loadProject(id: string): Promise<Project> {
    const raw = localStorage.getItem(STORAGE_KEYS.project(id));
    if (raw === null) throw new Error(`Project "${id}" tidak ditemukan.`);
    const res = parseProjectText(raw);
    if (!res.ok) throw new Error(`Project rusak: ${res.errors.join(' ')}`);
    return res.project;
  }

  async saveProject(id: string, project: Project, thumbnailDataUrl: string | null = null): Promise<void> {
    const text = serializeProject(project); // throws on circular / non-serializable
    const verify = parseProjectText(text);
    if (!verify.ok) throw new Error(`Menolak menyimpan project tidak valid: ${verify.errors.join(' ')}`);

    localStorage.setItem(STORAGE_KEYS.tmp(id), text);
    localStorage.setItem(STORAGE_KEYS.project(id), text);
    localStorage.removeItem(STORAGE_KEYS.tmp(id));

    upsertSummary({ id, name: project.meta.name, updatedAt: project.meta.updatedAt, thumbnailDataUrl });
  }

  async deleteProject(id: string): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.project(id));
    localStorage.removeItem(STORAGE_KEYS.tmp(id));
    writeList(readList().filter((s) => s.id !== id));
  }

  async importFromFile(): Promise<Project> {
    const text = await pickTextFile('.json,.ghtml.json,application/json');
    const res = parseProjectText(text);
    if (!res.ok) throw new Error(`File project tidak valid: ${res.errors.join(' ')}`);
    return res.project;
  }

  async exportToFile(project: Project): Promise<void> {
    triggerDownload(`${project.meta.name}.ghtml.json`, serializeProject(project), 'application/json');
  }

  async exportHtml(name: string, html: string): Promise<void> {
    triggerDownload(`${name}.html`, html, 'text/html');
  }
}
```

- [ ] **Step 5: Run and verify pass**

Run: `npm test -- web-storage`
Expected: PASS (all tests). Note the "corrupt JSON" test asserts `loadProject` rejects; the "circular" test asserts `saveProject` rejects before writing the real key.

- [ ] **Step 6: Commit**

```bash
git add src/core/storage.ts src/core/web-storage.ts tests/unit/web-storage.test.ts
git commit -m "feat(core): Storage interface and WebStorage (localStorage + file pickers)"
```

---

## Task 5: Storage factory + `TauriStorage` (`core/storage.ts`, `core/tauri-storage.ts`)

**Files:**
- Modify: `src/core/storage.ts` (add `getStorage()`)
- Create: `src/core/tauri-storage.ts`
- Test: `tests/unit/storage-factory.test.ts`

**Interfaces:**
- Consumes: `Storage`, `isTauri`, `STORAGE_KEYS` from `core/storage.ts`; `WebStorage` from `core/web-storage.ts`; `parseProjectText`, `serializeProject` from `core/project.ts`; `@tauri-apps/plugin-dialog` (`open`, `save`), `@tauri-apps/plugin-fs` (`readTextFile`, `writeTextFile`).
- Produces:
  - `getStorage(): Storage` — returns `new TauriStorage()` when `isTauri()`, else `new WebStorage()`.
  - `class TauriStorage implements Storage` — `listProjects`/`loadProject`/`saveProject`/`deleteProject` delegate to an internal `WebStorage` (the Tauri webview has `localStorage`); `importFromFile`/`exportToFile`/`exportHtml` use native dialogs + `fs`.

- [ ] **Step 1: Write the failing test**

`tests/unit/storage-factory.test.ts`:
```ts
import { afterEach, describe, expect, it } from 'vitest';
import { getStorage } from '../../src/core/storage';
import { WebStorage } from '../../src/core/web-storage';

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe('getStorage', () => {
  it('returns WebStorage in a plain browser', () => {
    expect(getStorage()).toBeInstanceOf(WebStorage);
  });

  it('returns a non-WebStorage implementation under Tauri', async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const s = getStorage();
    expect(s).not.toBeInstanceOf(WebStorage);
    expect(typeof s.exportToFile).toBe('function');
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- storage-factory`
Expected: FAIL — `getStorage` is not exported.

- [ ] **Step 3: Add `getStorage()` to `src/core/storage.ts`**

Append to the file:
```ts
import { WebStorage } from './web-storage';
import { TauriStorage } from './tauri-storage';

export function getStorage(): Storage {
  return isTauri() ? new TauriStorage() : new WebStorage();
}
```

- [ ] **Step 4: Implement `src/core/tauri-storage.ts`**

```ts
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { parseProjectText, serializeProject, type Project } from './project';
import type { ProjectSummary, Storage } from './storage';
import { WebStorage } from './web-storage';

export class TauriStorage implements Storage {
  private local = new WebStorage();

  listProjects(): Promise<ProjectSummary[]> {
    return this.local.listProjects();
  }
  loadProject(id: string): Promise<Project> {
    return this.local.loadProject(id);
  }
  saveProject(id: string, project: Project, thumbnailDataUrl: string | null = null): Promise<void> {
    return this.local.saveProject(id, project, thumbnailDataUrl);
  }
  deleteProject(id: string): Promise<void> {
    return this.local.deleteProject(id);
  }

  async importFromFile(): Promise<Project> {
    const picked = await open({
      multiple: false,
      filters: [{ name: 'Project Game HTML', extensions: ['json', 'ghtml.json'] }],
    });
    if (typeof picked !== 'string') throw new Error('Tidak ada file yang dipilih.');
    const text = await readTextFile(picked);
    const res = parseProjectText(text);
    if (!res.ok) throw new Error(`File project tidak valid: ${res.errors.join(' ')}`);
    return res.project;
  }

  async exportToFile(project: Project): Promise<void> {
    const path = await save({
      defaultPath: `${project.meta.name}.ghtml.json`,
      filters: [{ name: 'Project Game HTML', extensions: ['ghtml.json'] }],
    });
    if (!path) return;
    await writeTextFile(path, serializeProject(project));
  }

  async exportHtml(name: string, html: string): Promise<void> {
    const path = await save({
      defaultPath: `${name}.html`,
      filters: [{ name: 'Halaman Web', extensions: ['html'] }],
    });
    if (!path) return;
    await writeTextFile(path, html);
  }
}
```

- [ ] **Step 5: Prevent Vitest from resolving the Tauri packages**

Add a test-only alias so the factory test never imports real native bindings. In `vite.config.ts`, inside the `test` block add:
```ts
    alias: {
      '@tauri-apps/plugin-dialog': resolve(__dirname, 'tests/stubs/tauri-dialog.ts'),
      '@tauri-apps/plugin-fs': resolve(__dirname, 'tests/stubs/tauri-fs.ts'),
    },
```
Create `tests/stubs/tauri-dialog.ts`:
```ts
export const open = async () => null;
export const save = async () => null;
```
Create `tests/stubs/tauri-fs.ts`:
```ts
export const readTextFile = async () => '';
export const writeTextFile = async () => undefined;
```

- [ ] **Step 6: Run and verify pass**

Run: `npm test -- storage-factory`
Expected: PASS (2 tests).

- [ ] **Step 7: Run the full suite + typecheck**

Run: `npm run typecheck && npm test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/core/storage.ts src/core/tauri-storage.ts tests/unit/storage-factory.test.ts tests/stubs/ vite.config.ts
git commit -m "feat(core): storage factory + TauriStorage with native dialogs"
```

---

## Task 6: i18n (`app/i18n/index.ts`, `app/i18n/id.json`)

**Files:**
- Create: `src/app/i18n/id.json`, `src/app/i18n/index.ts`
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `t(key: string, params?: Record<string, string | number>): string` — returns the dictionary string with `{name}` placeholders substituted; returns `key` unchanged when missing.
  - `formatDate(iso: string): string` — `Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })`.

- [ ] **Step 1: Write the failing test**

`tests/unit/i18n.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatDate, t } from '../../src/app/i18n';

describe('t', () => {
  it('returns the Indonesian string for a known key', () => {
    expect(t('home.new')).toBe('Project Baru');
  });
  it('substitutes named params', () => {
    expect(t('confirm.delete', { name: 'Latihan 1' })).toContain('Latihan 1');
  });
  it('returns the key itself when missing', () => {
    expect(t('nope.missing.key')).toBe('nope.missing.key');
  });
});

describe('formatDate', () => {
  it('formats an ISO string in id-ID and includes the year', () => {
    const out = formatDate('2026-09-03T10:00:00.000Z');
    expect(out).toMatch(/2026/);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- i18n`
Expected: FAIL — cannot resolve `../../src/app/i18n`.

- [ ] **Step 3: Create `src/app/i18n/id.json`**

```json
{
  "app.name": "Game HTML",
  "app.loading": "Memuat…",
  "home.title": "Project Saya",
  "home.new": "Project Baru",
  "home.openFile": "Buka File",
  "home.open": "Buka",
  "home.rename": "Ganti Nama",
  "home.duplicate": "Duplikat",
  "home.delete": "Hapus",
  "home.download": "Unduh",
  "home.empty": "Belum ada project. Klik \"Project Baru\" untuk mulai.",
  "home.newProjectName": "Project Tanpa Nama",
  "home.copySuffix": "(salinan)",
  "home.promptRename": "Nama baru untuk project:",
  "editor.back": "Kembali",
  "editor.save": "Simpan",
  "editor.open": "Buka",
  "editor.export": "Ekspor",
  "editor.saved": "Tersimpan",
  "editor.mode.sprite": "Mode Sprite",
  "editor.mode.html": "Mode HTML",
  "editor.workspacePlaceholder": "Area kerja akan diisi pada Fase 1.",
  "confirm.delete": "Hapus project \"{name}\"? Tindakan ini tidak bisa dibatalkan.",
  "error.loadProject": "Gagal membuka project.",
  "error.importFile": "Gagal membuka file project."
}
```

- [ ] **Step 4: Implement `src/app/i18n/index.ts`**

```ts
import dict from './id.json';

const table = dict as Record<string, string>;

export function t(key: string, params?: Record<string, string | number>): string {
  let str = table[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      str = str.split(`{${name}}`).join(String(value));
    }
  }
  return str;
}

const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}
```

- [ ] **Step 5: Run and verify pass**

Run: `npm test -- i18n`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/i18n/
git commit -m "feat(app): Bahasa Indonesia i18n helper + string table"
```

---

## Task 7: Hash router (`app/router.ts`)

**Files:**
- Create: `src/app/router.ts`
- Test: `tests/unit/router.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Route = { name: 'home' } | { name: 'editor'; id: string } | { name: 'notFound' }`.
  - `parseHash(hash: string): Route` — `''`, `'#'`, `'#/'` → `home`; `'#/editor/<id>'` (non-empty id) → `editor`; anything else → `notFound`.
  - `currentRoute(): Route` — `parseHash(window.location.hash)`.
  - `navigate(route: Route): void` — sets `window.location.hash` (`#/` for home, `#/editor/<id>` for editor).
  - `onRouteChange(fn: (r: Route) => void): () => void` — subscribes to `hashchange`, returns an unsubscribe fn. Does **not** fire immediately.

- [ ] **Step 1: Write the failing test**

`tests/unit/router.test.ts`:
```ts
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
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- router`
Expected: FAIL — cannot resolve `../../src/app/router`.

- [ ] **Step 3: Implement `src/app/router.ts`**

```ts
export type Route = { name: 'home' } | { name: 'editor'; id: string } | { name: 'notFound' };

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/, '');
  if (clean === '' || clean === '/') return { name: 'home' };
  const editor = /^\/editor\/([^/]+)$/.exec(clean);
  if (editor) return { name: 'editor', id: editor[1]! };
  return { name: 'notFound' };
}

export function currentRoute(): Route {
  return parseHash(window.location.hash);
}

export function navigate(route: Route): void {
  const hash = route.name === 'editor' ? `#/editor/${route.id}` : '#/';
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function onRouteChange(fn: (r: Route) => void): () => void {
  const handler = () => fn(currentRoute());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- router`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/app/router.ts tests/unit/router.test.ts
git commit -m "feat(app): hash router"
```

---

## Task 8: Project manager (`app/home/project-manager.ts`)

**Files:**
- Create: `src/app/home/project-manager.ts`
- Test: `tests/unit/project-manager.test.ts`

**Interfaces:**
- Consumes: `Storage`, `ProjectSummary` from `core/storage.ts`; `Project`, `createEmptyProject` from `core/project.ts`; `newId` from `core/ids.ts`; `t` from `app/i18n`.
- Produces: `class ProjectManager` constructed with `(storage: Storage)`:
  - `list(): Promise<ProjectSummary[]>` — delegates to `storage.listProjects()`.
  - `create(name?: string): Promise<{ id: string; project: Project }>` — `id = newId('proj')`, `createEmptyProject(name ?? t('home.newProjectName'))`, saves, returns.
  - `rename(id: string, name: string): Promise<void>` — load, set `meta.name` + `meta.updatedAt = new Date().toISOString()`, save.
  - `duplicate(id: string): Promise<{ id: string; project: Project }>` — load source, deep clone, `meta.name = "<name> (salinan)"`, fresh `meta` timestamps, new sprite ids left as-is (fine for Phase 0), new project id, save.
  - `remove(id: string): Promise<void>` — `storage.deleteProject(id)`.
  - `openFromFile(): Promise<{ id: string; project: Project }>` — `storage.importFromFile()`, assign new `id = newId('proj')`, save, return.
  - `exportToFile(id: string): Promise<void>` — load, `storage.exportToFile(project)`.

- [ ] **Step 1: Write the failing test**

`tests/unit/project-manager.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProject, type Project } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
import { ProjectManager } from '../../src/app/home/project-manager';

class FakeStorage implements Storage {
  projects = new Map<string, Project>();
  summaries = new Map<string, ProjectSummary>();
  exported: Project[] = [];
  importPayload: Project | null = null;

  async listProjects() {
    return [...this.summaries.values()];
  }
  async loadProject(id: string) {
    const p = this.projects.get(id);
    if (!p) throw new Error('tidak ditemukan');
    return structuredClone(p);
  }
  async saveProject(id: string, project: Project, thumb: string | null = null) {
    this.projects.set(id, structuredClone(project));
    this.summaries.set(id, { id, name: project.meta.name, updatedAt: project.meta.updatedAt, thumbnailDataUrl: thumb });
  }
  async deleteProject(id: string) {
    this.projects.delete(id);
    this.summaries.delete(id);
  }
  async importFromFile() {
    if (!this.importPayload) throw new Error('batal');
    return structuredClone(this.importPayload);
  }
  async exportToFile(project: Project) {
    this.exported.push(project);
  }
  async exportHtml() {}
}

let storage: FakeStorage;
let manager: ProjectManager;

beforeEach(() => {
  storage = new FakeStorage();
  manager = new ProjectManager(storage);
});

describe('ProjectManager', () => {
  it('create() adds exactly one listed project', async () => {
    await manager.create('Latihan');
    const list = await manager.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe('Latihan');
  });

  it('create() with no name uses the default Indonesian name', async () => {
    const { project } = await manager.create();
    expect(project.meta.name).toBe('Project Tanpa Nama');
  });

  it('rename() changes the summary name and bumps updatedAt', async () => {
    const { id, project } = await manager.create('Awal');
    await manager.rename(id, 'Baru');
    const list = await manager.list();
    expect(list[0]!.name).toBe('Baru');
    expect(list[0]!.updatedAt >= project.meta.updatedAt).toBe(true);
  });

  it('duplicate() creates a second, distinct project with the (salinan) suffix', async () => {
    const { id } = await manager.create('Asli');
    const dup = await manager.duplicate(id);
    expect(dup.id).not.toBe(id);
    expect(dup.project.meta.name).toBe('Asli (salinan)');
    expect(await manager.list()).toHaveLength(2);
  });

  it('remove() deletes the project', async () => {
    const { id } = await manager.create('X');
    await manager.remove(id);
    expect(await manager.list()).toHaveLength(0);
  });

  it('openFromFile() saves the imported project under a fresh id', async () => {
    storage.importPayload = createEmptyProject('Dari File');
    const { id, project } = await manager.openFromFile();
    expect(id).toMatch(/^proj_/);
    expect(project.meta.name).toBe('Dari File');
    expect(await manager.list()).toHaveLength(1);
  });

  it('exportToFile() hands the loaded project to storage', async () => {
    const { id } = await manager.create('Ekspor');
    await manager.exportToFile(id);
    expect(storage.exported).toHaveLength(1);
    expect(storage.exported[0]!.meta.name).toBe('Ekspor');
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- project-manager`
Expected: FAIL — cannot resolve `../../src/app/home/project-manager`.

- [ ] **Step 3: Implement `src/app/home/project-manager.ts`**

```ts
import { t } from '../i18n';
import { newId } from '../../core/ids';
import { createEmptyProject, type Project } from '../../core/project';
import type { ProjectSummary, Storage } from '../../core/storage';

export type OpenedProject = { id: string; project: Project };

export class ProjectManager {
  constructor(private readonly storage: Storage) {}

  list(): Promise<ProjectSummary[]> {
    return this.storage.listProjects();
  }

  async create(name?: string): Promise<OpenedProject> {
    const id = newId('proj');
    const project = createEmptyProject(name ?? t('home.newProjectName'));
    await this.storage.saveProject(id, project);
    return { id, project };
  }

  async rename(id: string, name: string): Promise<void> {
    const project = await this.storage.loadProject(id);
    project.meta.name = name;
    project.meta.updatedAt = new Date().toISOString();
    await this.storage.saveProject(id, project);
  }

  async duplicate(id: string): Promise<OpenedProject> {
    const source = await this.storage.loadProject(id);
    const now = new Date().toISOString();
    const project: Project = structuredClone(source);
    project.meta.name = `${source.meta.name} ${t('home.copySuffix')}`;
    project.meta.createdAt = now;
    project.meta.updatedAt = now;
    const newProjectId = newId('proj');
    await this.storage.saveProject(newProjectId, project);
    return { id: newProjectId, project };
  }

  remove(id: string): Promise<void> {
    return this.storage.deleteProject(id);
  }

  async openFromFile(): Promise<OpenedProject> {
    const project = await this.storage.importFromFile();
    const id = newId('proj');
    await this.storage.saveProject(id, project);
    return { id, project };
  }

  async exportToFile(id: string): Promise<void> {
    const project = await this.storage.loadProject(id);
    await this.storage.exportToFile(project);
  }
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test -- project-manager`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/home/project-manager.ts tests/unit/project-manager.test.ts
git commit -m "feat(app): ProjectManager CRUD orchestration over Storage"
```

---

## Task 9: Home view (`app/home/home-view.ts`)

**Files:**
- Create: `src/app/home/home-view.ts`, `src/app/home/home.css`
- Test: `tests/unit/home-view.test.ts`

**Interfaces:**
- Consumes: `ProjectManager` from `app/home/project-manager.ts`; `t`, `formatDate` from `app/i18n`.
- Produces: `renderHome(root: HTMLElement, deps: { manager: ProjectManager; onOpen: (id: string) => void }): () => void`.
  - Renders: `<h1>` = `t('home.title')`; a `[data-action="new"]` button; a `[data-action="open-file"]` button; a list container `[data-list]`.
  - Each project → a `[data-card][data-id="<id>"]` element containing the name, `formatDate(updatedAt)`, and buttons `[data-action="open"]`, `[data-action="rename"]`, `[data-action="duplicate"]`, `[data-action="delete"]`, `[data-action="download"]`.
  - Empty list → shows `t('home.empty')`.
  - `new` → `manager.create()` then `onOpen(id)`.
  - `open` on a card → `onOpen(id)`.
  - `open-file` → `manager.openFromFile()` then `onOpen(id)`; on rejection, no throw (swallow — a full toast system is out of scope for Phase 0; log via `console.error`).
  - `rename` → `window.prompt(t('home.promptRename'), currentName)`; if non-empty and changed → `manager.rename` then re-render.
  - `duplicate` → `manager.duplicate` then re-render.
  - `delete` → `window.confirm(t('confirm.delete', { name }))`; if true → `manager.remove` then re-render.
  - `download` → `manager.exportToFile(id)`.
  - Returns a cleanup function that empties `root`.

- [ ] **Step 1: Write the failing test**

`tests/unit/home-view.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../src/core/project';
import { createEmptyProject } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
import { ProjectManager } from '../../src/app/home/project-manager';
import { renderHome } from '../../src/app/home/home-view';

class FakeStorage implements Storage {
  projects = new Map<string, Project>();
  summaries: ProjectSummary[] = [];
  async listProjects() {
    return this.summaries;
  }
  async loadProject(id: string) {
    const p = this.projects.get(id);
    if (!p) throw new Error('tidak ditemukan');
    return structuredClone(p);
  }
  async saveProject(id: string, project: Project) {
    this.projects.set(id, structuredClone(project));
    this.summaries = [
      { id, name: project.meta.name, updatedAt: project.meta.updatedAt, thumbnailDataUrl: null },
      ...this.summaries.filter((s) => s.id !== id),
    ];
  }
  async deleteProject(id: string) {
    this.projects.delete(id);
    this.summaries = this.summaries.filter((s) => s.id !== id);
  }
  async importFromFile() {
    return createEmptyProject('Impor');
  }
  async exportToFile() {}
  async exportHtml() {}
}

let root: HTMLElement;
let storage: FakeStorage;
let manager: ProjectManager;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
  storage = new FakeStorage();
  manager = new ProjectManager(storage);
});

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

describe('renderHome', () => {
  it('shows the empty state when there are no projects', async () => {
    renderHome(root, { manager, onOpen: vi.fn() });
    await flush();
    expect(root.textContent).toContain('Belum ada project');
  });

  it('renders a card per project', async () => {
    await manager.create('Alpha');
    await manager.create('Beta');
    renderHome(root, { manager, onOpen: vi.fn() });
    await flush();
    expect(root.querySelectorAll('[data-card]')).toHaveLength(2);
    expect(root.textContent).toContain('Alpha');
    expect(root.textContent).toContain('Beta');
  });

  it('clicking "Project Baru" creates a project and calls onOpen', async () => {
    const onOpen = vi.fn();
    renderHome(root, { manager, onOpen });
    await flush();
    root.querySelector<HTMLButtonElement>('[data-action="new"]')!.click();
    await flush();
    expect(onOpen).toHaveBeenCalledOnce();
    expect((await manager.list())).toHaveLength(1);
  });

  it('clicking delete (confirmed) removes the card', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await manager.create('Hapus Aku');
    renderHome(root, { manager, onOpen: vi.fn() });
    await flush();
    root.querySelector<HTMLButtonElement>('[data-card] [data-action="delete"]')!.click();
    await flush();
    expect(root.querySelectorAll('[data-card]')).toHaveLength(0);
  });

  it('clicking "open" on a card calls onOpen with its id', async () => {
    const onOpen = vi.fn();
    const { id } = await manager.create('Buka Aku');
    renderHome(root, { manager, onOpen });
    await flush();
    root.querySelector<HTMLButtonElement>('[data-card] [data-action="open"]')!.click();
    expect(onOpen).toHaveBeenCalledWith(id);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- home-view`
Expected: FAIL — cannot resolve `../../src/app/home/home-view`.

- [ ] **Step 3: Implement `src/app/home/home.css`**

```css
.home { max-width: 960px; margin: 0 auto; padding: 24px; }
.home__actions { display: flex; gap: 12px; margin-bottom: 20px; }
.home__list { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.card { border: 1px solid #d7dbe2; border-radius: 12px; padding: 14px; background: #fff; }
.card__name { font-weight: 600; margin: 0 0 4px; }
.card__date { color: #6b7280; font-size: 12px; margin: 0 0 10px; }
.card__buttons { display: flex; flex-wrap: wrap; gap: 6px; }
.card__buttons .btn { padding: 4px 8px; font-size: 12px; }
.home__empty { color: #6b7280; }
```

- [ ] **Step 4: Implement `src/app/home/home-view.ts`**

```ts
import './home.css';
import { formatDate, t } from '../i18n';
import type { ProjectManager } from './project-manager';

type Deps = { manager: ProjectManager; onOpen: (id: string) => void };

export function renderHome(root: HTMLElement, deps: Deps): () => void {
  root.innerHTML = `
    <section class="home">
      <h1>${t('home.title')}</h1>
      <div class="home__actions">
        <button class="btn btn-primary" data-action="new">${t('home.new')}</button>
        <button class="btn" data-action="open-file">${t('home.openFile')}</button>
      </div>
      <div class="home__list" data-list></div>
    </section>
  `;

  const listEl = root.querySelector<HTMLElement>('[data-list]')!;

  const renderList = async () => {
    const summaries = await deps.manager.list();
    if (summaries.length === 0) {
      listEl.innerHTML = `<p class="home__empty">${t('home.empty')}</p>`;
      return;
    }
    listEl.innerHTML = summaries
      .map(
        (s) => `
        <article class="card" data-card data-id="${s.id}">
          <p class="card__name"></p>
          <p class="card__date">${formatDate(s.updatedAt)}</p>
          <div class="card__buttons">
            <button class="btn" data-action="open">${t('home.open')}</button>
            <button class="btn" data-action="rename">${t('home.rename')}</button>
            <button class="btn" data-action="duplicate">${t('home.duplicate')}</button>
            <button class="btn" data-action="download">${t('home.download')}</button>
            <button class="btn" data-action="delete">${t('home.delete')}</button>
          </div>
        </article>`,
      )
      .join('');
    // Set names via textContent to avoid HTML injection from user-chosen names.
    summaries.forEach((s) => {
      listEl.querySelector<HTMLElement>(`[data-card][data-id="${s.id}"] .card__name`)!.textContent = s.name;
    });
  };

  const onClick = async (ev: MouseEvent) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const card = btn.closest<HTMLElement>('[data-card]');
    const id = card?.dataset.id;

    try {
      if (action === 'new') {
        const opened = await deps.manager.create();
        deps.onOpen(opened.id);
      } else if (action === 'open-file') {
        const opened = await deps.manager.openFromFile();
        deps.onOpen(opened.id);
      } else if (action === 'open' && id) {
        deps.onOpen(id);
      } else if (action === 'rename' && id && card) {
        const current = card.querySelector<HTMLElement>('.card__name')!.textContent ?? '';
        const next = window.prompt(t('home.promptRename'), current);
        if (next && next.trim() && next !== current) {
          await deps.manager.rename(id, next.trim());
          await renderList();
        }
      } else if (action === 'duplicate' && id) {
        await deps.manager.duplicate(id);
        await renderList();
      } else if (action === 'download' && id) {
        await deps.manager.exportToFile(id);
      } else if (action === 'delete' && id && card) {
        const name = card.querySelector<HTMLElement>('.card__name')!.textContent ?? '';
        if (window.confirm(t('confirm.delete', { name }))) {
          await deps.manager.remove(id);
          await renderList();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  root.addEventListener('click', onClick);
  void renderList();

  return () => {
    root.removeEventListener('click', onClick);
    root.innerHTML = '';
  };
}
```

- [ ] **Step 5: Run and verify pass**

Run: `npm test -- home-view`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/home/home-view.ts src/app/home/home.css tests/unit/home-view.test.ts
git commit -m "feat(app): Home view with project cards and actions"
```

---

## Task 10: Editor shell view (`app/editor/header.ts`, `app/editor/editor-view.ts`)

**Files:**
- Create: `src/app/editor/header.ts`, `src/app/editor/editor-view.ts`, `src/app/editor/editor.css`
- Test: `tests/unit/editor-view.test.ts`

**Interfaces:**
- Consumes: `Project` from `core/project.ts`; `Storage` from `core/storage.ts`; `t` from `app/i18n`.
- Produces:
  - `renderHeader(root: HTMLElement, deps: { name: string; mode: 'sprite' | 'html'; onNameChange: (name: string) => void; onModeChange: (mode: 'sprite' | 'html') => void; onBack: () => void; onSave: () => void; onOpen: () => void; onExport: () => void }): () => void` — renders a `[data-back]` button, a `[data-name]` `<input>` seeded with `name`, `[data-save]`/`[data-open]`/`[data-export]` buttons, and two mode buttons `[data-mode="sprite"]` / `[data-mode="html"]` with the active one carrying `aria-pressed="true"`. Editing the input and firing `change` calls `onNameChange` with the trimmed value.
  - `renderEditor(root: HTMLElement, deps: { id: string; project: Project; storage: Storage; onBack: () => void }): () => void` — renders the header + a `[data-workspace]` placeholder showing `t('editor.workspacePlaceholder')`. Wires header callbacks:
    - `onNameChange` → mutates `project.meta.name`, `project.meta.updatedAt = new Date().toISOString()`, then debounced (300 ms) `storage.saveProject(id, project)`.
    - `onModeChange` → mutates `project.activeMode`, re-renders header pressed state, debounced save.
    - `onSave` → immediate `storage.saveProject(id, project)`.
    - `onExport` → `storage.exportToFile(project)`.
    - `onOpen` → no-op placeholder in Phase 0 (`console.info`), documented as wired in a later phase.
    - `onBack` → `deps.onBack()`.
  - Returns a cleanup fn (clears timers, empties `root`).

- [ ] **Step 1: Write the failing test**

`tests/unit/editor-view.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProject, type Project } from '../../src/core/project';
import type { ProjectSummary, Storage } from '../../src/core/storage';
import { renderEditor } from '../../src/app/editor/editor-view';

class FakeStorage implements Storage {
  saved: Project[] = [];
  exported: Project[] = [];
  async listProjects(): Promise<ProjectSummary[]> {
    return [];
  }
  async loadProject(): Promise<Project> {
    throw new Error('unused');
  }
  async saveProject(_id: string, project: Project) {
    this.saved.push(structuredClone(project));
  }
  async deleteProject() {}
  async importFromFile(): Promise<Project> {
    throw new Error('unused');
  }
  async exportToFile(project: Project) {
    this.exported.push(project);
  }
  async exportHtml() {}
}

let root: HTMLElement;
let storage: FakeStorage;
let project: Project;

beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement('div');
  storage = new FakeStorage();
  project = createEmptyProject('Judul Awal');
});

describe('renderEditor', () => {
  it('shows the project name and the Phase 1 placeholder', () => {
    renderEditor(root, { id: 'p1', project, storage, onBack: vi.fn() });
    expect(root.querySelector<HTMLInputElement>('[data-name]')!.value).toBe('Judul Awal');
    expect(root.textContent).toContain('Area kerja akan diisi pada Fase 1.');
  });

  it('editing the name autosaves (debounced) with a bumped updatedAt', () => {
    renderEditor(root, { id: 'p1', project, storage, onBack: vi.fn() });
    const input = root.querySelector<HTMLInputElement>('[data-name]')!;
    input.value = 'Judul Baru';
    input.dispatchEvent(new Event('change'));
    expect(storage.saved).toHaveLength(0); // debounced
    vi.advanceTimersByTime(300);
    expect(storage.saved.at(-1)!.meta.name).toBe('Judul Baru');
  });

  it('the mode toggle updates activeMode and pressed state', () => {
    renderEditor(root, { id: 'p1', project, storage, onBack: vi.fn() });
    root.querySelector<HTMLButtonElement>('[data-mode="html"]')!.click();
    expect(root.querySelector('[data-mode="html"]')!.getAttribute('aria-pressed')).toBe('true');
    vi.advanceTimersByTime(300);
    expect(storage.saved.at(-1)!.activeMode).toBe('html');
  });

  it('Save writes immediately; Ekspor calls exportToFile; Kembali calls onBack', () => {
    const onBack = vi.fn();
    renderEditor(root, { id: 'p1', project, storage, onBack });
    root.querySelector<HTMLButtonElement>('[data-save]')!.click();
    expect(storage.saved).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('[data-export]')!.click();
    expect(storage.exported).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('[data-back]')!.click();
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- editor-view`
Expected: FAIL — cannot resolve `../../src/app/editor/editor-view`.

- [ ] **Step 3: Implement `src/app/editor/editor.css`**

```css
.editor { display: flex; flex-direction: column; height: 100vh; }
.editor__header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #d7dbe2; background: #fff; }
.editor__name { font: inherit; font-weight: 600; border: 1px solid transparent; border-radius: 6px; padding: 4px 8px; min-width: 180px; }
.editor__name:hover, .editor__name:focus { border-color: #c8ccd4; }
.editor__spacer { flex: 1; }
.editor__modes { display: flex; gap: 4px; }
.editor__modes .btn[aria-pressed="true"] { background: #4c97ff; border-color: #4c97ff; color: #fff; }
.editor__workspace { flex: 1; display: grid; place-items: center; color: #6b7280; }
```

- [ ] **Step 4: Implement `src/app/editor/header.ts`**

```ts
import { t } from '../i18n';

export type EditorMode = 'sprite' | 'html';

export type HeaderDeps = {
  name: string;
  mode: EditorMode;
  onNameChange: (name: string) => void;
  onModeChange: (mode: EditorMode) => void;
  onBack: () => void;
  onSave: () => void;
  onOpen: () => void;
  onExport: () => void;
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
      <div class="editor__modes">
        <button class="btn" data-mode="sprite">${t('editor.mode.sprite')}</button>
        <button class="btn" data-mode="html">${t('editor.mode.html')}</button>
      </div>
    </header>
  `;

  const nameInput = root.querySelector<HTMLInputElement>('[data-name]')!;
  nameInput.value = deps.name;

  const paintModes = (mode: EditorMode) => {
    root.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
  };
  paintModes(deps.mode);

  const onChange = () => deps.onNameChange(nameInput.value.trim());
  const onClick = (ev: MouseEvent) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-action],[data-back],[data-save],[data-open],[data-export],[data-mode]');
    if (!el) return;
    if (el.hasAttribute('data-back')) deps.onBack();
    else if (el.hasAttribute('data-save')) deps.onSave();
    else if (el.hasAttribute('data-open')) deps.onOpen();
    else if (el.hasAttribute('data-export')) deps.onExport();
    else if (el.dataset.mode === 'sprite' || el.dataset.mode === 'html') {
      paintModes(el.dataset.mode);
      deps.onModeChange(el.dataset.mode);
    }
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

- [ ] **Step 5: Implement `src/app/editor/editor-view.ts`**

```ts
import './editor.css';
import { t } from '../i18n';
import type { Project } from '../../core/project';
import type { Storage } from '../../core/storage';
import { renderHeader, type EditorMode } from './header';

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
      <div class="editor__workspace" data-workspace>${t('editor.workspacePlaceholder')}</div>
    </div>
  `;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const scheduleSave = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void storage.saveProject(id, project), AUTOSAVE_MS);
  };

  const cleanupHeader = renderHeader(root.querySelector<HTMLElement>('[data-header]')!, {
    name: project.meta.name,
    mode: project.activeMode,
    onNameChange: (name) => {
      if (!name || name === project.meta.name) return;
      project.meta.name = name;
      project.meta.updatedAt = new Date().toISOString();
      scheduleSave();
    },
    onModeChange: (mode: EditorMode) => {
      project.activeMode = mode;
      project.meta.updatedAt = new Date().toISOString();
      scheduleSave();
    },
    onBack: deps.onBack,
    onSave: () => void storage.saveProject(id, project),
    onOpen: () => console.info('Buka project dari editor: menyusul pada fase berikutnya.'),
    onExport: () => void storage.exportToFile(project),
  });

  return () => {
    if (timer) clearTimeout(timer);
    cleanupHeader();
    root.innerHTML = '';
  };
}
```

- [ ] **Step 6: Run and verify pass**

Run: `npm test -- editor-view`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/app/editor/ tests/unit/editor-view.test.ts
git commit -m "feat(app): editor shell with header, name autosave, mode toggle"
```

---

## Task 11: App shell wiring (`app/shell.ts`, `src/main.ts`)

**Files:**
- Create: `src/app/shell.ts`
- Modify: `src/main.ts`
- Test: `tests/unit/shell.test.ts`

**Interfaces:**
- Consumes: `Storage` from `core/storage.ts`; `getStorage` from `core/storage.ts` (in `main.ts`); `onRouteChange`, `currentRoute`, `navigate`, type `Route` from `app/router.ts`; `ProjectManager` from `app/home/project-manager.ts`; `renderHome` from `app/home/home-view.ts`; `renderEditor` from `app/editor/editor-view.ts`; `t` from `app/i18n`.
- Produces: `startApp(root: HTMLElement, storage: Storage): () => void` — renders the view for `currentRoute()`, re-renders on route change, cleans up the previous view each time, and returns a fn that tears everything down. On an `editor` route whose project fails to load, logs the error and redirects to `home`. On `notFound`, redirects to `home`.

- [ ] **Step 1: Write the failing test**

`tests/unit/shell.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProject } from '../../src/core/project';
import { WebStorage } from '../../src/core/web-storage';
import { startApp } from '../../src/app/shell';

let root: HTMLElement;
let stop: () => void;

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  stop?.();
  root.remove();
});

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

describe('startApp', () => {
  it('renders Home on the default route', async () => {
    stop = startApp(root, new WebStorage());
    await flush();
    expect(root.textContent).toContain('Project Saya');
  });

  it('renders the Editor for an existing project route', async () => {
    const storage = new WebStorage();
    await storage.saveProject('proj_x', createEmptyProject('Shell Test'), null);
    window.location.hash = '#/editor/proj_x';
    stop = startApp(root, storage);
    await flush();
    expect(root.querySelector<HTMLInputElement>('[data-name]')!.value).toBe('Shell Test');
  });

  it('redirects to Home when the editor project is missing', async () => {
    window.location.hash = '#/editor/ghost';
    stop = startApp(root, new WebStorage());
    await flush();
    await flush();
    expect(window.location.hash).toBe('#/');
    expect(root.textContent).toContain('Project Saya');
  });

  it('navigating back to Home from the editor swaps the view', async () => {
    const storage = new WebStorage();
    await storage.saveProject('proj_y', createEmptyProject('Y'), null);
    window.location.hash = '#/editor/proj_y';
    stop = startApp(root, storage);
    await flush();
    root.querySelector<HTMLButtonElement>('[data-back]')!.click();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await flush();
    expect(root.textContent).toContain('Project Saya');
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- shell`
Expected: FAIL — cannot resolve `../../src/app/shell`.

- [ ] **Step 3: Implement `src/app/shell.ts`**

```ts
import type { Storage } from '../core/storage';
import { currentRoute, navigate, onRouteChange, type Route } from './router';
import { ProjectManager } from './home/project-manager';
import { renderHome } from './home/home-view';
import { renderEditor } from './editor/editor-view';

export function startApp(root: HTMLElement, storage: Storage): () => void {
  const manager = new ProjectManager(storage);
  let cleanupView: (() => void) | undefined;

  const render = async (route: Route) => {
    cleanupView?.();
    cleanupView = undefined;

    if (route.name === 'home') {
      cleanupView = renderHome(root, {
        manager,
        onOpen: (id) => navigate({ name: 'editor', id }),
      });
      return;
    }

    if (route.name === 'editor') {
      try {
        const project = await storage.loadProject(route.id);
        cleanupView = renderEditor(root, {
          id: route.id,
          project,
          storage,
          onBack: () => navigate({ name: 'home' }),
        });
      } catch (err) {
        console.error(err);
        navigate({ name: 'home' });
      }
      return;
    }

    navigate({ name: 'home' });
  };

  const unsubscribe = onRouteChange((route) => void render(route));
  void render(currentRoute());

  return () => {
    unsubscribe();
    cleanupView?.();
    root.innerHTML = '';
  };
}
```

- [ ] **Step 4: Update `src/main.ts`**

```ts
import './styles/base.css';
import { startApp } from './app/shell';
import { getStorage } from './core/storage';

startApp(document.getElementById('app')!, getStorage());
```

- [ ] **Step 5: Run and verify pass**

Run: `npm test -- shell`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full suite, typecheck, lint, build**

Run: `npm run typecheck && npm run lint && npm test && npm run build`
Expected: all green; `dist/` produced.

- [ ] **Step 7: Manually smoke the dev server**

Run: `npm run dev`, open the printed URL. Expected: Home screen shows "Project Saya"; "Project Baru" opens an editor with an editable name and the Phase 1 placeholder; browser back returns to Home; reload keeps the created project listed.

- [ ] **Step 8: Commit**

```bash
git add src/app/shell.ts src/main.ts tests/unit/shell.test.ts
git commit -m "feat(app): shell wiring router to Home/Editor views"
```

---

## Task 12: Landing page (`landing.html`, `src/landing/*`)

**Files:**
- Modify: `landing.html`, `src/landing/landing.ts`, `src/landing/landing.css`
- Test: `tests/unit/landing.test.ts`

**Interfaces:**
- Consumes: nothing (pure static page; `landing.ts` only fills the footer year).
- Produces: a static Indonesian marketing page with sections: hero (with `[data-cta-editor]` linking to `/index.html` and `[data-cta-download]` linking to the GitHub Releases page), "Apa ini?", 3 usage steps, two mode teasers, a teacher section, and a footer with a `[data-year]` element and CC0 asset credit.

- [ ] **Step 1: Write the failing test**

`tests/unit/landing.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../landing.html'), 'utf8');

describe('landing.html', () => {
  it('is in Indonesian and set to lang="id"', () => {
    expect(html).toContain('lang="id"');
    expect(html).toMatch(/Mulai Buat/);
  });
  it('links the primary CTA to the editor entry', () => {
    expect(html).toMatch(/data-cta-editor[^>]*href="\/index\.html"/);
  });
  it('has a download CTA and a teacher section', () => {
    expect(html).toContain('data-cta-download');
    expect(html).toMatch(/Untuk Guru/i);
  });
  it('has a footer year placeholder and CC0 credit', () => {
    expect(html).toContain('data-year');
    expect(html).toMatch(/CC0/);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- landing`
Expected: FAIL — assertions unmet (current `landing.html` is the Task 1 stub).

- [ ] **Step 3: Replace `landing.html` body**

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Editor blok berbahasa Indonesia untuk belajar membuat animasi dan halaman web, ala Scratch. Gratis, bisa dipakai offline." />
    <meta property="og:title" content="Game HTML" />
    <meta property="og:description" content="Belajar membuat animasi dan halaman web dengan blok, berbahasa Indonesia." />
    <meta property="og:image" content="/favicon.svg" />
    <title>Game HTML — Belajar coding dengan blok</title>
    <link rel="stylesheet" href="/src/landing/landing.css" />
  </head>
  <body>
    <header class="hero">
      <h1>Game HTML</h1>
      <p class="hero__tagline">Susun blok, buat animasi dan halaman web sendiri. Berbahasa Indonesia, bisa dipakai tanpa internet.</p>
      <div class="hero__cta">
        <a class="btn btn-primary" data-cta-editor href="/index.html">Mulai Buat</a>
        <a class="btn" data-cta-download href="https://github.com/Pratametheus/game-html/releases">Unduh Aplikasi</a>
      </div>
    </header>

    <main class="landing">
      <section>
        <h2>Apa ini?</h2>
        <p>Game HTML adalah alat belajar pemrograman berbasis blok, mirip Scratch. Ada dua mode: <strong>Mode Sprite</strong> untuk membuat animasi dan permainan sederhana, dan <strong>Mode HTML</strong> untuk menyusun halaman web dan melihat kodenya.</p>
      </section>

      <section>
        <h2>Cara pakai</h2>
        <ol>
          <li>Buka editor dan buat project baru.</li>
          <li>Seret blok dari palet, susun jadi program.</li>
          <li>Klik bendera hijau atau lihat pratinjau, lalu simpan project-mu.</li>
        </ol>
      </section>

      <section class="modes">
        <article>
          <h3>Mode Sprite</h3>
          <p>Gerakkan tokoh di panggung dengan blok: gerak, ulangi, jika, dan kejadian "saat bendera hijau diklik".</p>
        </article>
        <article>
          <h3>Mode HTML</h3>
          <p>Susun judul, paragraf, gambar, dan warna. Lihat halaman jadi sungguhan lengkap dengan panel "Lihat Kode".</p>
        </article>
      </section>

      <section id="guru">
        <h2>Untuk Guru</h2>
        <p>Game HTML dibuat untuk modul ajar informatika tingkat SD. Modul ajar dan lembar kerja akan tersedia di sini.</p>
      </section>
    </main>

    <footer class="foot">
      <p>&copy; <span data-year>2026</span> Game HTML. Kode sumber terbuka.</p>
      <p>Aset gambar dan suara bawaan berlisensi CC0 / domain publik.</p>
    </footer>

    <script type="module" src="/src/landing/landing.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Replace `src/landing/landing.css`**

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1e1e1e; line-height: 1.5; }
.btn { display: inline-block; text-decoration: none; border: 1px solid #c8ccd4; background: #fff; color: #1e1e1e; border-radius: 8px; padding: 10px 18px; }
.btn-primary { background: #4c97ff; border-color: #4c97ff; color: #fff; }
.hero { text-align: center; padding: 64px 24px; background: linear-gradient(180deg, #eaf2ff, #f5f6f8); }
.hero h1 { font-size: 2.5rem; margin: 0 0 8px; }
.hero__tagline { max-width: 620px; margin: 0 auto 24px; color: #374151; }
.hero__cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.landing { max-width: 860px; margin: 0 auto; padding: 32px 24px; }
.landing section { margin-bottom: 40px; }
.modes { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.modes article { border: 1px solid #d7dbe2; border-radius: 12px; padding: 18px; }
.foot { border-top: 1px solid #d7dbe2; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
```

- [ ] **Step 5: Keep `src/landing/landing.ts` as the footer-year filler**

```ts
const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
```

- [ ] **Step 6: Run and verify pass**

Run: `npm test -- landing && npm run build`
Expected: PASS (4 tests); `dist/landing.html` present.

- [ ] **Step 7: Commit**

```bash
git add landing.html src/landing/
git commit -m "feat(landing): static Indonesian landing page"
```

---

## Task 13: E2E smoke test (`playwright.config.ts`, `tests/e2e/smoke.spec.ts`)

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: the built app served by `vite preview`.
- Produces: a Playwright project that builds, serves `dist/` on port 4173, and runs the Phase 0 acceptance flow headless.

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: Create `tests/e2e/smoke.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('create, name, reload, still listed', async ({ page }) => {
  await page.goto('/index.html#/');
  await expect(page.getByRole('heading', { name: 'Project Saya' })).toBeVisible();

  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

  const nameInput = page.locator('[data-name]');
  await nameInput.fill('Latihan Kelas 4');
  await nameInput.blur();

  await page.waitForTimeout(500); // let the debounced autosave flush
  await page.reload();

  // After reload the editor route re-hydrates from localStorage.
  await expect(page.locator('[data-name]')).toHaveValue('Latihan Kelas 4');

  await page.getByRole('button', { name: 'Kembali' }).click();
  await expect(page.getByText('Latihan Kelas 4')).toBeVisible();
});

test('landing page links to the editor', async ({ page }) => {
  await page.goto('/landing.html');
  await expect(page.getByRole('heading', { name: 'Game HTML' })).toBeVisible();
  await page.getByRole('link', { name: 'Mulai Buat' }).click();
  await expect(page).toHaveURL(/index\.html/);
});
```

- [ ] **Step 3: Run and verify pass**

Run: `npm run test:e2e`
Expected: 2 passed. If port 4173 is busy, stop the stray process and retry.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/e2e/
git commit -m "test(e2e): Phase 0 acceptance smoke (create/name/reload, landing link)"
```

---

## Task 14: Tauri desktop proof-of-concept (`src-tauri/*`)

**Files:**
- Create: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `src-tauri/icons/` (generated), `src-tauri/.gitignore`
- Modify: `package.json` (already has `tauri` script + deps from Task 1)

**Interfaces:**
- Consumes: the Vite build output in `dist/`; `TauriStorage` from `core/tauri-storage.ts` (already selected at runtime by `getStorage()`).
- Produces: a desktop app that loads the editor, with working native Open/Save dialogs for `.ghtml.json` import/export.

- [ ] **Step 1: Scaffold Tauri**

Run:
```bash
npm run tauri init -- --ci \
  --app-name "Game HTML" \
  --window-title "Game HTML" \
  --frontend-dist ../dist \
  --dev-url http://localhost:5173 \
  --before-dev-command "npm run dev" \
  --before-build-command "npm run build"
```
Expected: `src-tauri/` created with `Cargo.toml`, `tauri.conf.json`, `src/main.rs`.

- [ ] **Step 2: Set the bundle identifier**

Edit `src-tauri/tauri.conf.json` → set `"identifier": "com.gamehtml.app"`. Confirm `build.frontendDist` is `"../dist"` and `build.beforeBuildCommand` is `"npm run build"`.

- [ ] **Step 3: Add the dialog + fs plugins (Rust side)**

Run:
```bash
cd src-tauri
cargo add tauri-plugin-dialog tauri-plugin-fs
cd ..
```
Then in `src-tauri/src/lib.rs` (or `main.rs` if no `lib.rs`), register them in the builder:
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

- [ ] **Step 4: Grant capabilities**

Create/replace `src-tauri/capabilities/default.json`:
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Kapabilitas dasar: dialog file dan baca/tulis file yang dipilih pengguna.",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file"
  ]
}
```

- [ ] **Step 5: Add `src-tauri/.gitignore`**

```
/target
/gen/schemas
```

- [ ] **Step 6: Verify a debug build compiles**

Run:
```bash
npm run tauri build -- --debug
```
Expected: Rust compiles; a debug desktop binary is produced under `src-tauri/target/debug/`. (This step needs the Rust toolchain and Windows build tools; if unavailable on the worker, mark this step blocked and note it in the task's review — the web build is unaffected.)

- [ ] **Step 7: Manual desktop smoke**

Run: `npm run tauri dev`. Expected: a native window opens showing the Home screen ("Project Saya"). Create a project, click **Ekspor**, confirm a native Save dialog appears and writes a `.ghtml.json` file. Use **Buka File** on Home and confirm a native Open dialog appears and loads it.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/
git commit -m "feat(desktop): Tauri wrapper with native file dialogs (proof-of-concept)"
```

---

## Task 15: CI workflow (`.github/workflows/ci.yml`)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: npm scripts `lint`, `typecheck`, `test`, `build`, `test:e2e`.
- Produces: a GitHub Actions workflow running on `push` and `pull_request` that gates the branch on lint + typecheck + unit tests + build + E2E.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 2: Validate the YAML locally**

Run: `node -e "require('node:fs').readFileSync('.github/workflows/ci.yml','utf8')" && npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo OK`
Expected: prints `OK` (well-formed YAML).

- [ ] **Step 3: Commit and push the branch**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint, typecheck, unit tests, build, and E2E on push/PR"
```

- [ ] **Step 4: Verify the run on GitHub**

Push the branch and open the Actions tab. Expected: the `verify` job completes green. If E2E flakes on the port, re-run; the `webServer.reuseExistingServer` is disabled in CI so the port should be free.

---

## Self-Review

**1. Spec coverage (ROADMAP.md → Fase 0 deliverables):**

| Deliverable | Task(s) |
|---|---|
| Scaffold repo: Vite + TS, multi-page, ESLint + Prettier, test config | Task 1 |
| `core/project.ts`: types, `createEmptyProject`, `validate`, `migrate` (skeleton), round-trip | Task 2 |
| `core/storage.ts`: `Storage` interface + `WebStorage` (localStorage + `:tmp` + import/export) | Task 4 |
| `core/events.ts`: typed event bus | Task 3 |
| Shell SPA: hash router, Home (list, new, open file, rename, duplicate, delete, download), empty Editor + header | Tasks 7, 8, 9, 10, 11 |
| i18n: `t()` + `id.json` + `formatDate` `id-ID` | Task 6 |
| Landing page static (hero + basic sections), Indonesian | Task 12 |
| Tauri PoC: wrap web build, `TauriStorage` for file import/export, runtime detection | Tasks 5, 14 |
| CI: lint + unit tests on push | Task 15 |
| DoD: create/rename/close/reopen from Home; data survives reload | Task 13 (E2E) |
| DoD: import/export `.ghtml.json` works in web and Tauri | Tasks 4, 5, 14 (manual desktop smoke in 14 Step 7) |
| DoD: landing deployed as static site | Task 12 build output; deployment itself is a Fase 3 concern (`Design.md` §14) and out of Fase 0 scope |

No gaps against the Fase 0 deliverable list.

**2. Placeholder scan:** No "TBD"/"TODO"/"implement later"/"add error handling" left as instructions. `src/main.ts` in Task 1 is an intentional throwaway line, fully replaced in Task 11 Step 4. Task 14 Step 6 explicitly allows marking the Rust build blocked when the toolchain is absent — that is a stated fallback, not an unfinished instruction.

**3. Type consistency:**
- `Storage` method set is identical across `storage.ts` (interface, Task 4 Step 3), `WebStorage` (Task 4 Step 4), `TauriStorage` (Task 5 Step 4), and every `FakeStorage`/`FakeStorage`-style test double (Tasks 8, 9, 10): `listProjects`, `loadProject`, `saveProject(id, project, thumbnailDataUrl?)`, `deleteProject`, `importFromFile`, `exportToFile`, `exportHtml`.
- `saveProject` signature is `(id: string, project: Project, thumbnailDataUrl?: string | null)` everywhere it is defined and called (`ProjectManager.create/rename/duplicate/openFromFile`, `renderEditor` autosave, `shell` — none pass a positional `Project` first).
- `ProjectManager` returns `OpenedProject = { id, project }` from `create`, `duplicate`, `openFromFile`; `home-view.ts` consumes `.id` from those (Task 9 Step 4) — consistent.
- Router `Route` union (`home` | `editor` | `notFound`) is identical in `router.ts` (Task 7) and consumed exhaustively in `shell.ts` (Task 11).
- `renderHome` / `renderEditor` / `renderHeader` / `startApp` signatures match between their definition tasks and their call sites in `shell.ts`.
- `createEmptyProject(name)`, `serializeProject`, `parseProjectText`, `validate`, `migrate` names match between `project.ts` (Task 2) and consumers in Tasks 4, 5, 8.
- i18n keys referenced in views (`home.*`, `editor.*`, `confirm.delete`) all exist in `id.json` (Task 6 Step 3).

No inconsistencies found.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-03-phase-0-foundation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
