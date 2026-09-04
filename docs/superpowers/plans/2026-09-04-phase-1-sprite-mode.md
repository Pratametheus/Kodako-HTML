# Fase 1 — Mode Sprite MVP: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A child can drag blocks in a Blockly workspace, press the green flag, and watch a sprite move / turn / say / react on a 480×360 stage — with the running block highlighted, `ulangi terus` never freezing the UI, a responsive Stop, multi-sprite projects, and everything persisting across reload.

**Architecture:** Blockly (minimal Scratch-colored theme, Indonesian locale, default renderer) produces **synchronous ES5** JavaScript. A per-hat **JS-Interpreter** instance runs that code step-by-step; duration ops (`wait`, `luncur`, `katakan…selama`, `kirim…dan tunggu`, and a per-iteration yield in `ulangi terus`) are **async native functions** that park the thread until a `requestAnimationFrame`-driven scheduler resumes them. Non-blocking ops mutate a plain `Sprite` model; a Canvas 2D renderer redraws each frame. The sprite-mode UI mounts into the Phase-0 editor's `[data-workspace]` slot when `project.activeMode === 'sprite'`.

**Tech Stack:** Blockly (`blockly/core` + `blockly/blocks` + `blockly/javascript` + `blockly/msg/id`), JS-Interpreter (`js-interpreter`, no bundled types → hand-written ambient shim), Vite 6, TypeScript strict, Vitest/jsdom, Playwright. No UI framework. All assets/libs bundled locally — no CDN, no runtime network.

**Spec:** `docs/Design.md` (§2 repo layout, §3 project model, §4.1–4.3 & §4.5 Blockly + sprite blocks + toolbox, §5.1 sprite→JS generator, §6.1–6.7 interpreter / scheduler / api / sprite model / stage / event bus / assets) and `docs/ROADMAP.md` → "Fase 1 — Mode Sprite MVP" (deliverable checklist + "Definisi selesai"). The plan corrects one spec detail — see Global Constraints item 8.

## Global Constraints

Every task's requirements implicitly include this section. Values are exact.

1. **Bahasa Indonesia** for every user-facing string: UI labels, buttons, panel headings, error/toast text, **and the block captions themselves** (defined inline in the block JSON `message0`). New UI strings go into `src/app/i18n/id.json` and are read via `t(key)`. Dev-console strings are exempt.
2. **No third-party runtime network calls / no CDN.** `blockly` and `js-interpreter` are npm deps bundled by Vite. SVG costume assets are files in the repo. Uploaded images become `data:` URLs. No web fonts, no analytics.
3. **TypeScript strict** with `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax` (already set in `tsconfig.json`). Type-only imports use `import type` / inline `type`. No `any` in product code (test doubles may use `as unknown as X`). `npm run typecheck` must pass.
4. **Stage coordinate system (Scratch convention):** `x` ∈ `[-240, 240]`, `y` ∈ `[-180, 180]`, origin `(0,0)` at stage center, **y-axis points up**. `direction` in degrees where **`90` = right, `0` = up** (so `move(n)` adds `n·sin(dir°)` to `x` and `n·cos(dir°)` to `y`). Canvas is y-down: `canvasX = 240 + x`, `canvasY = 180 - y`.
5. **Project file:** extension `.ghtml.json`, `formatVersion` stays **`1`** — Phase 1 changes are additive (populating `SpriteData.script` / `costumes` / `currentCostume` and `project.assets`), no schema bump, no new `migrate` branch.
6. **localStorage namespace** unchanged: `ghtml:projects` / `ghtml:project:<id>` / `ghtml:project:<id>:tmp`.
7. **Conventional Commits**, one focused commit per task's final step. `.gitattributes` enforces `eol=lf`; run `npm run format` before committing if `prettier --check` complains. Every new file must be `git add`ed — verify `git status --porcelain` clean before reporting a task done.
8. **JS-Interpreter execution model (corrects `docs/Design.md` §5.1).** Design.md sketches `async function` + `await api.move(10)`. JS-Interpreter is Acorn **ES5** — no `async`/`await`, no arrow functions, no `let`/`const`, no template literals. Therefore:
   - `src/blocks/sprite/generator.ts` emits **synchronous ES5**: `var`, `for (var i = 0; i < n; i++)`, `while (true) { …; __yield__(); }` for `ulangi terus`, plain `function` declarations. One named function per hat block.
   - Duration ops are registered on each interpreter as **async native functions** via `interpreter.createAsyncFunction(fn)`, where `fn(...args, callback)` stashes `callback` and returns; the scheduler invokes `callback()` only when the wait/frame has elapsed.
   - Non-blocking ops (`move`, `turn`, `gotoXY`, `changeX`, `changeY`, `pointInDirection`, `ifOnEdgeBounce`, `say`, `switchCostume`, `nextCostume`, `changeSize`, `setSize`, `show`, `hide`, variable get/set/change, `broadcast` fire-and-forget, `isKeyPressed`, `timer`, `resetTimer`, all operators) are plain **sync** native functions.
   - Block highlight uses Blockly's `STATEMENT_PREFIX`: the generator prepends `highlightBlock('<id>');\n` to every statement; `highlightBlock` is a sync native that records the id for the scheduler to paint via `workspace.highlightBlock(id)`.
9. **Deferred to later phases (do NOT build in Phase 1):** full Scratch block shape/renderer, Sound category + `audio.ts`, collision Sensor (`menyentuh …?`), mouse Sensor blocks, real CC0 art, Tauri desktop build.

## Sprite block set for Phase 1 (the only blocks that exist after this phase)

**Hats:** `saat bendera hijau diklik` · `saat sprite ini diklik` · `saat tombol [tombol ▾] ditekan` · `saat terima pesan [pesan]`
**Kejadian (command):** `kirim pesan [pesan]` · `kirim pesan [pesan] dan tunggu`
**Gerak:** `gerak [10] langkah` · `putar ↻ [15] derajat` · `putar ↺ [15] derajat` · `ke x: [0] y: [0]` · `ubah x [10]` · `ubah y [10]` · `arah ke [90]` · `luncur [1] detik ke x: [0] y: [0]` · `jika di tepi, pantul`
**Tampilan:** `katakan [Halo!]` · `katakan [Halo!] selama [2] detik` · `sembunyikan gelembung` · `ganti kostum ke [kostum ▾]` · `kostum berikutnya` · `ubah ukuran [10]` · `atur ukuran ke [100] %` · `tampil` · `sembunyi`
**Kontrol:** `tunggu [1] detik` · `ulangi [10] kali` · `ulangi terus` · `jika [ ] maka` · `jika [ ] maka … kalau tidak` · `tunggu sampai [ ]` · `hentikan [semua ▾]` (options: `semua` / `skrip ini` / `skrip lain di sprite ini`)
**Operator (reporter/boolean):** `[ ] + [ ]` · `[ ] − [ ]` · `[ ] × [ ]` · `[ ] ÷ [ ]` · `sisa dari [ ] : [ ]` · `[ ] < [ ]` · `[ ] = [ ]` · `[ ] > [ ]` · `[ ] dan [ ]` · `[ ] atau [ ]` · `tidak [ ]` · `acak [1] sampai [10]` · `gabung [ ] [ ]` · `panjang [ ]`
**Sensor (Phase 1 subset only):** `tombol [tombol ▾] ditekan?` · `pengatur waktu` (reporter) · `reset pengatur waktu` (command)
**Variabel:** dynamic category — `buat variabel`, then per variable: `[nama]` (reporter) · `atur [nama ▾] ke [0]` · `ubah [nama ▾] sebanyak [1]`

Key dropdown values (`tombol ▾`): `spasi` → `" "`, `panah atas/bawah/kiri/kanan` → `ArrowUp/ArrowDown/ArrowLeft/ArrowRight`, `a`…`z`, `0`…`9`.

---

## File Structure

**Created in this phase**

| Path | Responsibility |
|---|---|
| `src/types/js-interpreter.d.ts` | Ambient module decl for `js-interpreter` |
| `src/blocks/index.ts` | Load Blockly, set locale `id`, register sprite blocks + generators + theme; export `installSpriteBlockly()` |
| `src/blocks/theme.ts` | `spriteTheme` — minimal Scratch category colors + larger font |
| `src/blocks/sprite/blocks.ts` | JSON defs for every sprite block (captions in Bahasa Indonesia) |
| `src/blocks/sprite/toolbox.ts` | `spriteToolbox` (category XML/JSON, colors, shadow defaults, dynamic Variabel) |
| `src/blocks/sprite/generator.ts` | `generateThreads(workspace): ThreadCode[]` — Blockly → sync ES5, per hat, with `STATEMENT_PREFIX` highlight |
| `src/runtime/sprite/sprite.ts` | `Sprite` type + pure ops + coord/angle math |
| `src/runtime/sprite/runtime-context.ts` | `RuntimeContext` — live sprite map, key state, timer origin, stage bounds, broadcast subscriber registry |
| `src/runtime/sprite/api.ts` | `buildApi(ctx, spriteId)` → `{ sync: Record<string,Fn>, async: Record<string,AsyncFn> }` |
| `src/runtime/sprite/interpreter.ts` | `createThreadInterpreter(code, api, onHighlight)` → `ThreadInterpreter` |
| `src/runtime/sprite/scheduler.ts` | `createScheduler({ ctx, render, onHighlight })` → `{ start, stop, isRunning }` |
| `src/runtime/sprite/event-bus.ts` | `createSpriteEvents({ scheduler, ctx, getThreadsForHat })` → green flag / sprite-click / key / broadcast wiring |
| `src/runtime/sprite/stage.ts` | `createStage(canvas, getScene)` → `{ render, hitTest, thumbnail, dispose }` |
| `src/runtime/sprite/assets.ts` | Builtin costume/backdrop catalog + `loadUploadedImage(file)` (≤2 MB → data URL) |
| `src/runtime/sprite/assets/*.svg` | 9 costume SVGs + 4 backdrop SVGs |
| `src/app/editor/sprite-mode/sprite-mode.ts` | `renderSpriteMode(root, deps)` — Blockly + stage + panels, returns cleanup |
| `src/app/editor/sprite-mode/sprite-panel.ts` | sprite list + add/delete/select/rename/position fields |
| `src/app/editor/sprite-mode/costume-panel.ts` | builtin costume grid + upload |
| `src/app/editor/sprite-mode/sprite-mode.css` | layout for the above |
| `src/core/sprite-project.ts` | Pure helpers: read/write a sprite's Blockly workspace JSON + costume refs on a `Project` |
| `tests/unit/sprite-*.test.ts`, `tests/unit/blocks-*.test.ts` | Vitest suites |
| `tests/e2e/sprite-mode.spec.ts` | Playwright green-flag flow |

**Modified**

| Path | Change |
|---|---|
| `package.json` | add `blockly`, `js-interpreter` deps |
| `src/core/project.ts` | `createEmptyProject` default sprite gets a starter costume ref (`{ assetId: 'builtin:cat' }`) and `project.assets['builtin:cat']` entry; `validate` unchanged (already tolerant) |
| `src/app/editor/editor-view.ts` | when `project.activeMode === 'sprite'`, mount `renderSpriteMode` into `[data-workspace]`; pass a `markDirty()` (wraps `scheduleSave`) and a `getThumbnail()` provider; `scheduleSave` passes `getThumbnail()` to `storage.saveProject` |
| `src/app/editor/header.ts` | no structural change; sprite-mode owns Green-flag/Stop (rendered inside the stage panel, not the header) |
| `src/app/i18n/id.json` | +~28 keys (see Task 15) |
| `docs/ROADMAP.md` | tick Fase 1 checkboxes (Task 16) |
| `vite.config.ts` | only if a Blockly asset import needs a rule (likely not — `?url` and `?raw` work out of the box) |

---

## Task 1: Scaffold — Blockly + JS-Interpreter, theme, block registry harness

**Files:**
- Modify: `package.json`
- Create: `src/types/js-interpreter.d.ts`, `src/blocks/theme.ts`, `src/blocks/index.ts`
- Test: `tests/unit/blocks-registry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `src/blocks/theme.ts` → `export const spriteTheme: Blockly.Theme` (via `Blockly.Theme.defineTheme('kodako-sprite', {...})`), plus `export const CATEGORY_COLORS: Record<'events'|'motion'|'looks'|'control'|'operators'|'sensing'|'variables', string>`.
  - `src/blocks/index.ts` → `export function installSpriteBlockly(): void` (idempotent: defines blocks + generators + sets locale `id`; safe to call once per app boot) and `export { Blockly }` re-export (`import * as Blockly from 'blockly/core'`). Also `export const BLOCKLY_LOCALE = 'id'`.
  - `src/types/js-interpreter.d.ts` → `declare module 'js-interpreter'` with a `class Interpreter` whose real surface is verified in Step 3.

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install blockly js-interpreter
```
Expected: both resolve. Record the exact installed versions in the task report. Floors: `blockly` ≥ `11.0.0`, `js-interpreter` ≥ `1.0.0` (this package is versioned loosely; whatever `npm` resolves is fine as long as `Interpreter` is the default export or `module.exports`).

- [ ] **Step 2: Write the failing test**

`tests/unit/blocks-registry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { spriteTheme } from '../../src/blocks/theme';

describe('installSpriteBlockly', () => {
  it('is idempotent and registers a headless workspace cleanly', () => {
    installSpriteBlockly();
    installSpriteBlockly();
    const ws = new Blockly.Workspace();
    expect(ws).toBeTruthy();
    ws.dispose();
  });

  it('exposes a theme with the seven category colours', () => {
    expect(spriteTheme).toBeTruthy();
    expect(Blockly.registry.hasItem(Blockly.registry.Type.THEME, 'kodako-sprite')).toBe(true);
  });
});
```

- [ ] **Step 3: Verify `js-interpreter`'s real surface, then write the shim**

Run:
```bash
node -e "const I=require('js-interpreter'); const i=new I('var x=1+1;'); console.log(typeof i.step, typeof i.run, typeof i.createNativeFunction, typeof i.createAsyncFunction, typeof i.setProperty, typeof i.getProperty, typeof i.nativeToPseudo, typeof i.getGlobalScope||typeof i.global);"
```
Expected: prints `function function function function function function ...`. If the constructor is exported differently (e.g. `require('js-interpreter').Interpreter`), adjust the shim's export shape accordingly and note it.

`src/types/js-interpreter.d.ts`:
```ts
declare module 'js-interpreter' {
  export interface InterpreterObject {
    [key: string]: unknown;
  }
  export type InitFunc = (interpreter: Interpreter, globalObject: InterpreterObject) => void;

  export default class Interpreter {
    constructor(code: string, initFunc?: InitFunc);
    /** Execute one step. Returns true while more steps remain. */
    step(): boolean;
    /** Run until done or blocked on an async native fn. Returns true if blocked/paused. */
    run(): boolean;
    createNativeFunction(fn: (...args: unknown[]) => unknown): InterpreterObject;
    createAsyncFunction(fn: (...args: unknown[]) => void): InterpreterObject;
    setProperty(obj: InterpreterObject, name: string, value: unknown): void;
    getProperty(obj: InterpreterObject, name: string): unknown;
    nativeToPseudo(native: unknown): unknown;
    pseudoToNative(pseudo: unknown): unknown;
    getGlobalScope(): InterpreterObject;
    paused_: boolean;
  }
}
```

- [ ] **Step 4: Implement `src/blocks/theme.ts`**

```ts
import * as Blockly from 'blockly/core';

export const CATEGORY_COLORS = {
  events: '#FFBF00',
  motion: '#4C97FF',
  looks: '#9966FF',
  control: '#FFAB19',
  operators: '#59C059',
  sensing: '#5CB1D6',
  variables: '#FF8C1A',
} as const;

export const spriteTheme = Blockly.Theme.defineTheme('kodako-sprite', {
  name: 'kodako-sprite',
  base: Blockly.Themes.Classic,
  blockStyles: {
    events_blocks: { colourPrimary: CATEGORY_COLORS.events },
    motion_blocks: { colourPrimary: CATEGORY_COLORS.motion },
    looks_blocks: { colourPrimary: CATEGORY_COLORS.looks },
    control_blocks: { colourPrimary: CATEGORY_COLORS.control },
    operators_blocks: { colourPrimary: CATEGORY_COLORS.operators },
    sensing_blocks: { colourPrimary: CATEGORY_COLORS.sensing },
    variables_blocks: { colourPrimary: CATEGORY_COLORS.variables },
  },
  categoryStyles: {
    events_category: { colour: CATEGORY_COLORS.events },
    motion_category: { colour: CATEGORY_COLORS.motion },
    looks_category: { colour: CATEGORY_COLORS.looks },
    control_category: { colour: CATEGORY_COLORS.control },
    operators_category: { colour: CATEGORY_COLORS.operators },
    sensing_category: { colour: CATEGORY_COLORS.sensing },
    variables_category: { colour: CATEGORY_COLORS.variables },
  },
  fontStyle: { family: 'system-ui, sans-serif', size: 13 },
  componentStyles: {},
});
```

- [ ] **Step 5: Implement `src/blocks/index.ts`**

```ts
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as Id from 'blockly/msg/id';
import { registerSpriteBlocks } from './sprite/blocks';
import { registerSpriteGenerators } from './sprite/generator';
import { spriteTheme } from './theme';

export { Blockly, spriteTheme };
export const BLOCKLY_LOCALE = 'id';

let installed = false;

export function installSpriteBlockly(): void {
  if (installed) return;
  Blockly.setLocale(Id as unknown as Record<string, string>);
  registerSpriteBlocks();
  registerSpriteGenerators();
  installed = true;
}
```

> Tasks 3 and 4 create `registerSpriteBlocks` / `registerSpriteGenerators`. For this task, add temporary no-op stubs in `src/blocks/sprite/blocks.ts` and `src/blocks/sprite/generator.ts` (`export function registerSpriteBlocks() {}` etc.) so Task 1 compiles and its test passes; Tasks 3–4 replace them.

- [ ] **Step 6: Run tests**

Run: `npm test -- blocks-registry` — expect PASS (2 tests).
Run: `npm run typecheck && npm run build` — expect clean; `dist/` still emitted.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/types/js-interpreter.d.ts src/blocks/ tests/unit/blocks-registry.test.ts
git commit -m "feat(blocks): scaffold Blockly + JS-Interpreter, minimal Scratch theme"
```

---

## Task 2: Sprite model + coordinate math (`runtime/sprite/sprite.ts`)

**Files:**
- Create: `src/runtime/sprite/sprite.ts`
- Test: `tests/unit/sprite-model.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export type Bubble = { kind: 'say'; text: string } | null`
  - `export type Sprite = { id: string; name: string; x: number; y: number; direction: number; size: number; visible: boolean; costumeIndex: number; costumes: string[]; variables: Record<string, string | number>; bubble: Bubble }`
  - `export const STAGE = { width: 480, height: 360, minX: -240, maxX: 240, minY: -180, maxY: 180 } as const`
  - `export function createSprite(init: Partial<Sprite> & Pick<Sprite, 'id' | 'name'>): Sprite` (defaults: x0 y0 dir90 size100 visible true costumeIndex0 costumes [] variables {} bubble null)
  - Pure ops (each returns a **new** `Sprite`): `moved(s, steps)`, `turnedRight(s, deg)`, `turnedLeft(s, deg)`, `movedToXY(s, x, y)`, `changedX(s, dx)`, `changedY(s, dy)`, `pointedInDirection(s, deg)`, `bouncedIfOnEdge(s)`, `saidText(s, text)`, `saidNothing(s)`, `withCostumeIndex(s, i)`, `nextCostumeOf(s)`, `resizedBy(s, delta)`, `resizedTo(s, pct)`, `shown(s)`, `hidden(s)`, `withVariable(s, name, value)`
  - Helpers: `export function clampToStage(x, y): { x: number; y: number }`, `export function directionToRadians(dir: number): number` (0°=up,90°=right → `rad = (90 - dir) * Math.PI / 180` so `dx = steps*cos(rad)`, `dy = steps*sin(rad)`), `export function normalizeDirection(dir: number): number` (wrap to `(-180, 180]`).

- [ ] **Step 1: Write the failing test**

`tests/unit/sprite-model.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  bouncedIfOnEdge,
  changedX,
  createSprite,
  directionToRadians,
  moved,
  movedToXY,
  nextCostumeOf,
  normalizeDirection,
  pointedInDirection,
  resizedBy,
  saidText,
  turnedRight,
  withVariable,
} from '../../src/runtime/sprite/sprite';

const base = () => createSprite({ id: 's1', name: 'Sprite 1', costumes: ['a', 'b', 'c'] });

describe('sprite model', () => {
  it('createSprite applies Scratch defaults', () => {
    const s = base();
    expect(s).toMatchObject({ x: 0, y: 0, direction: 90, size: 100, visible: true, costumeIndex: 0 });
  });

  it('moved: 10 steps facing right (90°) increases x by 10', () => {
    const s = moved(base(), 10);
    expect(s.x).toBeCloseTo(10);
    expect(s.y).toBeCloseTo(0);
  });

  it('moved: 10 steps facing up (0°) increases y by 10', () => {
    const s = moved(pointedInDirection(base(), 0), 10);
    expect(s.x).toBeCloseTo(0);
    expect(s.y).toBeCloseTo(10);
  });

  it('turnedRight adds to direction and normalizes', () => {
    expect(turnedRight(base(), 100).direction).toBeCloseTo(-170);
  });

  it('normalizeDirection wraps into (-180, 180]', () => {
    expect(normalizeDirection(270)).toBeCloseTo(-90);
    expect(normalizeDirection(-180)).toBeCloseTo(180);
  });

  it('movedToXY clamps to the stage', () => {
    expect(movedToXY(base(), 9999, -9999)).toMatchObject({ x: 240, y: -180 });
  });

  it('bouncedIfOnEdge flips direction and pulls back inside when past an edge', () => {
    const s = bouncedIfOnEdge(movedToXY(pointedInDirection(base(), 90), 240, 0));
    expect(s.x).toBeLessThanOrEqual(240);
    expect(Math.abs(s.direction)).toBeGreaterThan(90); // now facing left-ish
  });

  it('nextCostumeOf wraps', () => {
    expect(nextCostumeOf({ ...base(), costumeIndex: 2 }).costumeIndex).toBe(0);
  });

  it('resizedBy clamps at a sane floor', () => {
    expect(resizedBy({ ...base(), size: 20 }, -100).size).toBeGreaterThanOrEqual(5);
  });

  it('saidText / withVariable are immutable', () => {
    const s = base();
    expect(saidText(s, 'Hi').bubble).toEqual({ kind: 'say', text: 'Hi' });
    expect(s.bubble).toBeNull();
    expect(withVariable(s, 'skor', 3).variables.skor).toBe(3);
    expect(s.variables.skor).toBeUndefined();
  });

  it('directionToRadians: 90° → 0 rad (points along +x)', () => {
    expect(Math.cos(directionToRadians(90))).toBeCloseTo(1);
    expect(Math.sin(directionToRadians(90))).toBeCloseTo(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- sprite-model`; module missing).

- [ ] **Step 3: Implement `src/runtime/sprite/sprite.ts`**

```ts
export type Bubble = { kind: 'say'; text: string } | null;

export type Sprite = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: number;
  size: number;
  visible: boolean;
  costumeIndex: number;
  costumes: string[];
  variables: Record<string, string | number>;
  bubble: Bubble;
};

export const STAGE = {
  width: 480,
  height: 360,
  minX: -240,
  maxX: 240,
  minY: -180,
  maxY: 180,
} as const;

const SIZE_MIN = 5;
const SIZE_MAX = 1000;

export function createSprite(init: Partial<Sprite> & Pick<Sprite, 'id' | 'name'>): Sprite {
  return {
    x: 0,
    y: 0,
    direction: 90,
    size: 100,
    visible: true,
    costumeIndex: 0,
    costumes: [],
    variables: {},
    bubble: null,
    ...init,
  };
}

export function normalizeDirection(dir: number): number {
  let d = ((dir % 360) + 360) % 360; // [0, 360)
  if (d > 180) d -= 360; // (-180, 180]
  if (d === -180) d = 180;
  return d;
}

export function directionToRadians(dir: number): number {
  return ((90 - dir) * Math.PI) / 180;
}

export function clampToStage(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(STAGE.minX, Math.min(STAGE.maxX, x)),
    y: Math.max(STAGE.minY, Math.min(STAGE.maxY, y)),
  };
}

export function moved(s: Sprite, steps: number): Sprite {
  const rad = directionToRadians(s.direction);
  const { x, y } = clampToStage(s.x + steps * Math.cos(rad), s.y + steps * Math.sin(rad));
  return { ...s, x, y };
}

export function turnedRight(s: Sprite, deg: number): Sprite {
  return { ...s, direction: normalizeDirection(s.direction + deg) };
}

export function turnedLeft(s: Sprite, deg: number): Sprite {
  return { ...s, direction: normalizeDirection(s.direction - deg) };
}

export function movedToXY(s: Sprite, x: number, y: number): Sprite {
  return { ...s, ...clampToStage(x, y) };
}

export function changedX(s: Sprite, dx: number): Sprite {
  return movedToXY(s, s.x + dx, s.y);
}

export function changedY(s: Sprite, dy: number): Sprite {
  return movedToXY(s, s.x, s.y + dy);
}

export function pointedInDirection(s: Sprite, deg: number): Sprite {
  return { ...s, direction: normalizeDirection(deg) };
}

export function bouncedIfOnEdge(s: Sprite): Sprite {
  let { x, y, direction } = s;
  const rad = directionToRadians(direction);
  let dx = Math.cos(rad);
  let dy = Math.sin(rad);
  let bounced = false;
  if (x <= STAGE.minX || x >= STAGE.maxX) {
    dx = -dx;
    bounced = true;
  }
  if (y <= STAGE.minY || y >= STAGE.maxY) {
    dy = -dy;
    bounced = true;
  }
  if (!bounced) return s;
  direction = normalizeDirection(90 - (Math.atan2(dy, dx) * 180) / Math.PI);
  const clamped = clampToStage(x, y);
  return { ...s, x: clamped.x, y: clamped.y, direction };
}

export function saidText(s: Sprite, text: string): Sprite {
  return { ...s, bubble: { kind: 'say', text } };
}

export function saidNothing(s: Sprite): Sprite {
  return { ...s, bubble: null };
}

export function withCostumeIndex(s: Sprite, i: number): Sprite {
  if (s.costumes.length === 0) return { ...s, costumeIndex: 0 };
  const idx = ((Math.trunc(i) % s.costumes.length) + s.costumes.length) % s.costumes.length;
  return { ...s, costumeIndex: idx };
}

export function nextCostumeOf(s: Sprite): Sprite {
  return withCostumeIndex(s, s.costumeIndex + 1);
}

export function resizedBy(s: Sprite, delta: number): Sprite {
  return { ...s, size: Math.max(SIZE_MIN, Math.min(SIZE_MAX, s.size + delta)) };
}

export function resizedTo(s: Sprite, pct: number): Sprite {
  return { ...s, size: Math.max(SIZE_MIN, Math.min(SIZE_MAX, pct)) };
}

export function shown(s: Sprite): Sprite {
  return { ...s, visible: true };
}

export function hidden(s: Sprite): Sprite {
  return { ...s, visible: false };
}

export function withVariable(s: Sprite, name: string, value: string | number): Sprite {
  return { ...s, variables: { ...s.variables, [name]: value } };
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- sprite-model`).

- [ ] **Step 5: Commit**

```bash
git add src/runtime/sprite/sprite.ts tests/unit/sprite-model.test.ts
git commit -m "feat(runtime): pure Sprite model + Scratch coordinate math"
```

---

## Task 3: Sprite block definitions + toolbox (`blocks/sprite/blocks.ts`, `toolbox.ts`)

**Files:**
- Create (replace Task-1 stub): `src/blocks/sprite/blocks.ts`
- Create: `src/blocks/sprite/toolbox.ts`
- Test: `tests/unit/blocks-sprite-defs.test.ts`

**Interfaces:**
- Consumes: `Blockly` from `../index` (or `blockly/core`).
- Produces:
  - `src/blocks/sprite/blocks.ts` → `export function registerSpriteBlocks(): void` — calls `Blockly.defineBlocksWithJsonArray([...])` for every block in "Sprite block set" above, using **Bahasa Indonesia** `message0`; each block sets `"style": "<category>_blocks"`. Also `export const SPRITE_BLOCK_TYPES: readonly string[]` (every `type` string, for the test + toolbox).
  - `src/blocks/sprite/toolbox.ts` → `export const spriteToolbox: Blockly.utils.toolbox.ToolboxDefinition` — a `flyoutToolbox`/`categoryToolbox` JSON with the 7 categories (`categorystyle: '<category>_category'`), block order per "Sprite block set", `shadow` blocks on numeric/text inputs (so a fresh `gerak` block already shows `10`), and the Variabel category as `"custom": "VARIABLE"` (Blockly's built-in dynamic variable category).

Block `type` names (kebab, prefixed `sprite_`): `sprite_hat_green_flag`, `sprite_hat_clicked`, `sprite_hat_key`, `sprite_hat_receive`, `sprite_broadcast`, `sprite_broadcast_wait`, `sprite_move`, `sprite_turn_right`, `sprite_turn_left`, `sprite_goto_xy`, `sprite_change_x`, `sprite_change_y`, `sprite_point_direction`, `sprite_glide`, `sprite_bounce_edge`, `sprite_say`, `sprite_say_for`, `sprite_say_clear`, `sprite_switch_costume`, `sprite_next_costume`, `sprite_change_size`, `sprite_set_size`, `sprite_show`, `sprite_hide`, `sprite_wait`, `sprite_repeat`, `sprite_forever`, `sprite_if`, `sprite_if_else`, `sprite_wait_until`, `sprite_stop`, `sprite_op_arith` (with a `OP` dropdown `+ − × ÷`), `sprite_op_mod`, `sprite_op_compare` (`< = >`), `sprite_op_and`, `sprite_op_or`, `sprite_op_not`, `sprite_op_random`, `sprite_op_join`, `sprite_op_length`, `sprite_sensing_key`, `sprite_sensing_timer`, `sprite_sensing_reset_timer`.

Variable blocks reuse Blockly's built-in `variables_get`, `math_change`, `variables_set` styled via the theme's `variables_blocks` — no custom variable blocks needed.

Dropdowns:
- `sprite_hat_key` / `sprite_sensing_key` field `KEY`: options `[['spasi',' '],['panah atas','ArrowUp'],['panah bawah','ArrowDown'],['panah kiri','ArrowLeft'],['panah kanan','ArrowRight'],['a','a'], … ['z','z'], ['0','0'], … ['9','9']]` — generate the a–z / 0–9 entries programmatically in `blocks.ts`.
- `sprite_switch_costume` field `COSTUME`: dropdown whose options are supplied at runtime — for Phase 1 use a **`field_input`** text field defaulting to `kostum1` OR a dynamic dropdown backed by `Blockly.FieldDropdown(() => <current sprite's costume names>)`. Use the dynamic dropdown; the editor sets a module-level `getCostumeOptions` callback (Task 13). If unset, return `[['kostum1','0']]`.
- `sprite_stop` field `TARGET`: `[['semua','all'],['skrip ini','this'],['skrip lain di sprite ini','others']]`.
- `sprite_op_arith` field `OP`: `[['+','add'],['−','sub'],['×','mul'],['÷','div']]`. `sprite_op_compare` field `OP`: `[['<','lt'],['=','eq'],['>','gt']]`.

- [ ] **Step 1: Write the failing test**

`tests/unit/blocks-sprite-defs.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { SPRITE_BLOCK_TYPES } from '../../src/blocks/sprite/blocks';
import { spriteToolbox } from '../../src/blocks/sprite/toolbox';

installSpriteBlockly();

describe('sprite block definitions', () => {
  it('registers every declared block type', () => {
    for (const type of SPRITE_BLOCK_TYPES) {
      expect(Blockly.Blocks[type], `missing block ${type}`).toBeTruthy();
    }
  });

  it('every block instantiates on a headless workspace without throwing', () => {
    const ws = new Blockly.Workspace();
    for (const type of SPRITE_BLOCK_TYPES) {
      const b = ws.newBlock(type);
      expect(b.type).toBe(type);
    }
    ws.dispose();
  });

  it('captions are Bahasa Indonesia (spot check)', () => {
    const ws = new Blockly.Workspace();
    const move = ws.newBlock('sprite_move');
    // message0 like "gerak %1 langkah"
    expect(JSON.stringify(move.inputList)).toMatch(/langkah/);
    ws.dispose();
  });

  it('toolbox references the seven category styles', () => {
    const json = JSON.stringify(spriteToolbox);
    for (const c of ['events', 'motion', 'looks', 'control', 'operators', 'sensing', 'variables']) {
      expect(json).toContain(`${c}_category`);
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `src/blocks/sprite/blocks.ts`** — the full `defineBlocksWithJsonArray` array. (Write every block. Example shape for a few; the implementer fills the rest following the same pattern and the "Sprite block set" list.)

```ts
import * as Blockly from 'blockly/core';

function keyOptions(): [string, string][] {
  const base: [string, string][] = [
    ['spasi', ' '],
    ['panah atas', 'ArrowUp'],
    ['panah bawah', 'ArrowDown'],
    ['panah kiri', 'ArrowLeft'],
    ['panah kanan', 'ArrowRight'],
  ];
  for (let c = 97; c <= 122; c++) base.push([String.fromCharCode(c), String.fromCharCode(c)]);
  for (let d = 0; d <= 9; d++) base.push([String(d), String(d)]);
  return base;
}

let getCostumeOptions: () => [string, string][] = () => [['kostum1', '0']];
export function setCostumeOptionsProvider(fn: () => [string, string][]): void {
  getCostumeOptions = fn;
}

export const SPRITE_BLOCK_TYPES = [
  'sprite_hat_green_flag', 'sprite_hat_clicked', 'sprite_hat_key', 'sprite_hat_receive',
  'sprite_broadcast', 'sprite_broadcast_wait',
  'sprite_move', 'sprite_turn_right', 'sprite_turn_left', 'sprite_goto_xy',
  'sprite_change_x', 'sprite_change_y', 'sprite_point_direction', 'sprite_glide', 'sprite_bounce_edge',
  'sprite_say', 'sprite_say_for', 'sprite_say_clear', 'sprite_switch_costume', 'sprite_next_costume',
  'sprite_change_size', 'sprite_set_size', 'sprite_show', 'sprite_hide',
  'sprite_wait', 'sprite_repeat', 'sprite_forever', 'sprite_if', 'sprite_if_else',
  'sprite_wait_until', 'sprite_stop',
  'sprite_op_arith', 'sprite_op_mod', 'sprite_op_compare', 'sprite_op_and', 'sprite_op_or',
  'sprite_op_not', 'sprite_op_random', 'sprite_op_join', 'sprite_op_length',
  'sprite_sensing_key', 'sprite_sensing_timer', 'sprite_sensing_reset_timer',
] as const;

export function registerSpriteBlocks(): void {
  Blockly.defineBlocksWithJsonArray([
    {
      type: 'sprite_hat_green_flag',
      message0: 'saat bendera hijau diklik',
      nextStatement: null,
      style: 'events_blocks',
    },
    {
      type: 'sprite_hat_clicked',
      message0: 'saat sprite ini diklik',
      nextStatement: null,
      style: 'events_blocks',
    },
    {
      type: 'sprite_hat_key',
      message0: 'saat tombol %1 ditekan',
      args0: [{ type: 'field_dropdown', name: 'KEY', options: keyOptions() }],
      nextStatement: null,
      style: 'events_blocks',
    },
    {
      type: 'sprite_hat_receive',
      message0: 'saat terima pesan %1',
      args0: [{ type: 'field_input', name: 'MSG', text: 'pesan1' }],
      nextStatement: null,
      style: 'events_blocks',
    },
    {
      type: 'sprite_broadcast',
      message0: 'kirim pesan %1',
      args0: [{ type: 'field_input', name: 'MSG', text: 'pesan1' }],
      previousStatement: null,
      nextStatement: null,
      style: 'events_blocks',
    },
    {
      type: 'sprite_broadcast_wait',
      message0: 'kirim pesan %1 dan tunggu',
      args0: [{ type: 'field_input', name: 'MSG', text: 'pesan1' }],
      previousStatement: null,
      nextStatement: null,
      style: 'events_blocks',
    },
    {
      type: 'sprite_move',
      message0: 'gerak %1 langkah',
      args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: 'sprite_turn_right',
      message0: 'putar ↻ %1 derajat',
      args0: [{ type: 'input_value', name: 'DEG', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: 'sprite_turn_left',
      message0: 'putar ↺ %1 derajat',
      args0: [{ type: 'input_value', name: 'DEG', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: 'sprite_goto_xy',
      message0: 'ke x: %1 y: %2',
      args0: [
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: 'sprite_change_x',
      message0: 'ubah x %1',
      args0: [{ type: 'input_value', name: 'DX', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: 'sprite_change_y',
      message0: 'ubah y %1',
      args0: [{ type: 'input_value', name: 'DY', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: 'sprite_point_direction',
      message0: 'arah ke %1',
      args0: [{ type: 'input_value', name: 'DIR', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: 'sprite_glide',
      message0: 'luncur %1 detik ke x: %2 y: %3',
      args0: [
        { type: 'input_value', name: 'SECS', check: 'Number' },
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: 'sprite_bounce_edge',
      message0: 'jika di tepi, pantul',
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: 'sprite_say',
      message0: 'katakan %1',
      args0: [{ type: 'input_value', name: 'TEXT' }],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: 'sprite_say_for',
      message0: 'katakan %1 selama %2 detik',
      args0: [
        { type: 'input_value', name: 'TEXT' },
        { type: 'input_value', name: 'SECS', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: 'sprite_say_clear',
      message0: 'sembunyikan gelembung',
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: 'sprite_switch_costume',
      message0: 'ganti kostum ke %1',
      args0: [{ type: 'field_dropdown', name: 'COSTUME', options: () => getCostumeOptions() }],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: 'sprite_next_costume',
      message0: 'kostum berikutnya',
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: 'sprite_change_size',
      message0: 'ubah ukuran %1',
      args0: [{ type: 'input_value', name: 'DELTA', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: 'sprite_set_size',
      message0: 'atur ukuran ke %1 %',
      args0: [{ type: 'input_value', name: 'PCT', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    { type: 'sprite_show', message0: 'tampil', previousStatement: null, nextStatement: null, style: 'looks_blocks' },
    { type: 'sprite_hide', message0: 'sembunyi', previousStatement: null, nextStatement: null, style: 'looks_blocks' },
    {
      type: 'sprite_wait',
      message0: 'tunggu %1 detik',
      args0: [{ type: 'input_value', name: 'SECS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
    },
    {
      type: 'sprite_repeat',
      message0: 'ulangi %1 kali %2 %3',
      args0: [
        { type: 'input_value', name: 'TIMES', check: 'Number' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
    },
    {
      type: 'sprite_forever',
      message0: 'ulangi terus %1 %2',
      args0: [
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO' },
      ],
      previousStatement: null,
      style: 'control_blocks',
    },
    {
      type: 'sprite_if',
      message0: 'jika %1 maka %2 %3',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
    },
    {
      type: 'sprite_if_else',
      message0: 'jika %1 maka %2 %3 kalau tidak %4',
      args0: [
        { type: 'input_value', name: 'COND', check: 'Boolean' },
        { type: 'input_dummy' },
        { type: 'input_statement', name: 'DO' },
        { type: 'input_statement', name: 'ELSE' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
    },
    {
      type: 'sprite_wait_until',
      message0: 'tunggu sampai %1',
      args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
    },
    {
      type: 'sprite_stop',
      message0: 'hentikan %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'TARGET',
          options: [
            ['semua', 'all'],
            ['skrip ini', 'this'],
            ['skrip lain di sprite ini', 'others'],
          ],
        },
      ],
      previousStatement: null,
      style: 'control_blocks',
    },
    {
      type: 'sprite_op_arith',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'OP',
          options: [
            ['+', 'add'],
            ['−', 'sub'],
            ['×', 'mul'],
            ['÷', 'div'],
          ],
        },
        { type: 'input_value', name: 'B', check: 'Number' },
      ],
      output: 'Number',
      inputsInline: true,
      style: 'operators_blocks',
    },
    {
      type: 'sprite_op_mod',
      message0: 'sisa dari %1 : %2',
      args0: [
        { type: 'input_value', name: 'A', check: 'Number' },
        { type: 'input_value', name: 'B', check: 'Number' },
      ],
      output: 'Number',
      inputsInline: true,
      style: 'operators_blocks',
    },
    {
      type: 'sprite_op_compare',
      message0: '%1 %2 %3',
      args0: [
        { type: 'input_value', name: 'A' },
        {
          type: 'field_dropdown',
          name: 'OP',
          options: [
            ['<', 'lt'],
            ['=', 'eq'],
            ['>', 'gt'],
          ],
        },
        { type: 'input_value', name: 'B' },
      ],
      output: 'Boolean',
      inputsInline: true,
      style: 'operators_blocks',
    },
    {
      type: 'sprite_op_and',
      message0: '%1 dan %2',
      args0: [
        { type: 'input_value', name: 'A', check: 'Boolean' },
        { type: 'input_value', name: 'B', check: 'Boolean' },
      ],
      output: 'Boolean',
      inputsInline: true,
      style: 'operators_blocks',
    },
    {
      type: 'sprite_op_or',
      message0: '%1 atau %2',
      args0: [
        { type: 'input_value', name: 'A', check: 'Boolean' },
        { type: 'input_value', name: 'B', check: 'Boolean' },
      ],
      output: 'Boolean',
      inputsInline: true,
      style: 'operators_blocks',
    },
    {
      type: 'sprite_op_not',
      message0: 'tidak %1',
      args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }],
      output: 'Boolean',
      style: 'operators_blocks',
    },
    {
      type: 'sprite_op_random',
      message0: 'acak %1 sampai %2',
      args0: [
        { type: 'input_value', name: 'FROM', check: 'Number' },
        { type: 'input_value', name: 'TO', check: 'Number' },
      ],
      output: 'Number',
      inputsInline: true,
      style: 'operators_blocks',
    },
    {
      type: 'sprite_op_join',
      message0: 'gabung %1 %2',
      args0: [
        { type: 'input_value', name: 'A' },
        { type: 'input_value', name: 'B' },
      ],
      output: 'String',
      inputsInline: true,
      style: 'operators_blocks',
    },
    {
      type: 'sprite_op_length',
      message0: 'panjang %1',
      args0: [{ type: 'input_value', name: 'A' }],
      output: 'Number',
      style: 'operators_blocks',
    },
    {
      type: 'sprite_sensing_key',
      message0: 'tombol %1 ditekan?',
      args0: [{ type: 'field_dropdown', name: 'KEY', options: keyOptions() }],
      output: 'Boolean',
      style: 'sensing_blocks',
    },
    {
      type: 'sprite_sensing_timer',
      message0: 'pengatur waktu',
      output: 'Number',
      style: 'sensing_blocks',
    },
    {
      type: 'sprite_sensing_reset_timer',
      message0: 'reset pengatur waktu',
      previousStatement: null,
      nextStatement: null,
      style: 'sensing_blocks',
    },
  ]);
}
```

- [ ] **Step 4: Implement `src/blocks/sprite/toolbox.ts`** — category toolbox JSON. Shadow blocks: wrap numeric inputs with `{ "shadow": { "type": "math_number", "fields": { "NUM": 10 } } }` and text inputs with `{ "shadow": { "type": "text", "fields": { "TEXT": "Halo!" } } }`. Variabel category: `{ kind: 'category', name: 'Variabel', categorystyle: 'variables_category', custom: 'VARIABLE' }`.

```ts
import * as Blockly from 'blockly/core';

const num = (n: number) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const txt = (s: string) => ({ shadow: { type: 'text', fields: { TEXT: s } } });

export const spriteToolbox: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Kejadian',
      categorystyle: 'events_category',
      contents: [
        { kind: 'block', type: 'sprite_hat_green_flag' },
        { kind: 'block', type: 'sprite_hat_clicked' },
        { kind: 'block', type: 'sprite_hat_key' },
        { kind: 'block', type: 'sprite_hat_receive' },
        { kind: 'block', type: 'sprite_broadcast' },
        { kind: 'block', type: 'sprite_broadcast_wait' },
      ],
    },
    {
      kind: 'category',
      name: 'Gerak',
      categorystyle: 'motion_category',
      contents: [
        { kind: 'block', type: 'sprite_move', inputs: { STEPS: num(10) } },
        { kind: 'block', type: 'sprite_turn_right', inputs: { DEG: num(15) } },
        { kind: 'block', type: 'sprite_turn_left', inputs: { DEG: num(15) } },
        { kind: 'block', type: 'sprite_goto_xy', inputs: { X: num(0), Y: num(0) } },
        { kind: 'block', type: 'sprite_change_x', inputs: { DX: num(10) } },
        { kind: 'block', type: 'sprite_change_y', inputs: { DY: num(10) } },
        { kind: 'block', type: 'sprite_point_direction', inputs: { DIR: num(90) } },
        { kind: 'block', type: 'sprite_glide', inputs: { SECS: num(1), X: num(0), Y: num(0) } },
        { kind: 'block', type: 'sprite_bounce_edge' },
      ],
    },
    {
      kind: 'category',
      name: 'Tampilan',
      categorystyle: 'looks_category',
      contents: [
        { kind: 'block', type: 'sprite_say', inputs: { TEXT: txt('Halo!') } },
        { kind: 'block', type: 'sprite_say_for', inputs: { TEXT: txt('Halo!'), SECS: num(2) } },
        { kind: 'block', type: 'sprite_say_clear' },
        { kind: 'block', type: 'sprite_switch_costume' },
        { kind: 'block', type: 'sprite_next_costume' },
        { kind: 'block', type: 'sprite_change_size', inputs: { DELTA: num(10) } },
        { kind: 'block', type: 'sprite_set_size', inputs: { PCT: num(100) } },
        { kind: 'block', type: 'sprite_show' },
        { kind: 'block', type: 'sprite_hide' },
      ],
    },
    {
      kind: 'category',
      name: 'Kontrol',
      categorystyle: 'control_category',
      contents: [
        { kind: 'block', type: 'sprite_wait', inputs: { SECS: num(1) } },
        { kind: 'block', type: 'sprite_repeat', inputs: { TIMES: num(10) } },
        { kind: 'block', type: 'sprite_forever' },
        { kind: 'block', type: 'sprite_if' },
        { kind: 'block', type: 'sprite_if_else' },
        { kind: 'block', type: 'sprite_wait_until' },
        { kind: 'block', type: 'sprite_stop' },
      ],
    },
    {
      kind: 'category',
      name: 'Operator',
      categorystyle: 'operators_category',
      contents: [
        { kind: 'block', type: 'sprite_op_arith', inputs: { A: num(1), B: num(1) } },
        { kind: 'block', type: 'sprite_op_mod', inputs: { A: num(7), B: num(2) } },
        { kind: 'block', type: 'sprite_op_compare', inputs: { A: num(1), B: num(1) } },
        { kind: 'block', type: 'sprite_op_and' },
        { kind: 'block', type: 'sprite_op_or' },
        { kind: 'block', type: 'sprite_op_not' },
        { kind: 'block', type: 'sprite_op_random', inputs: { FROM: num(1), TO: num(10) } },
        { kind: 'block', type: 'sprite_op_join', inputs: { A: txt('apel '), B: txt('jeruk') } },
        { kind: 'block', type: 'sprite_op_length', inputs: { A: txt('halo') } },
      ],
    },
    {
      kind: 'category',
      name: 'Sensor',
      categorystyle: 'sensing_category',
      contents: [
        { kind: 'block', type: 'sprite_sensing_key' },
        { kind: 'block', type: 'sprite_sensing_timer' },
        { kind: 'block', type: 'sprite_sensing_reset_timer' },
      ],
    },
    { kind: 'category', name: 'Variabel', categorystyle: 'variables_category', custom: 'VARIABLE' },
  ],
};
```

- [ ] **Step 5: Wire `registerSpriteBlocks` into `src/blocks/index.ts`** (replace the Task-1 stub import path if needed) and re-export `setCostumeOptionsProvider`.

- [ ] **Step 6: Run — expect PASS** (`npm test -- blocks-sprite-defs`), then `npm run typecheck`.

- [ ] **Step 7: Commit**

```bash
git add src/blocks/sprite/blocks.ts src/blocks/sprite/toolbox.ts src/blocks/index.ts tests/unit/blocks-sprite-defs.test.ts
git commit -m "feat(blocks): sprite block definitions + categorized toolbox (Bahasa Indonesia)"
```

---

## Task 4: Sprite → synchronous-ES5 generator (`blocks/sprite/generator.ts`)

**Files:**
- Create (replace Task-1 stub): `src/blocks/sprite/generator.ts`
- Test: `tests/unit/blocks-sprite-generator.test.ts`

**Interfaces:**
- Consumes: `Blockly` from `blockly/core`, `javascriptGenerator` from `blockly/javascript`; block types from Task 3.
- Produces:
  - `export function registerSpriteGenerators(): void` — installs `javascriptGenerator.forBlock[type]` for every non-hat sprite block, sets `javascriptGenerator.STATEMENT_PREFIX = 'highlightBlock(%1);\n'`, `javascriptGenerator.addReservedWords('highlightBlock,__yield__,api,Math')`, and `javascriptGenerator.INFINITE_LOOP_TRAP = null` (we handle loops via `__yield__`).
  - `export type ThreadCode = { hatType: 'green_flag' | 'clicked' | 'key' | 'receive'; key?: string; message?: string; blockId: string; fnName: string; code: string }`
  - `export function generateThreads(workspace: Blockly.Workspace): ThreadCode[]` — for every top-level hat block: emit `function <fnName>() {\n<body>\n}` where `<body>` is `javascriptGenerator.blockToCode(hat.getNextBlock())` wrapped so statements carry the `highlightBlock` prefix. `fnName` = `hat_${hatType}_${index}`. Duration ops generate calls to bare globals (`wait(0.5);`), non-blocking ops likewise (`move(10);`). `ulangi terus` → `while (true) {\n<inner>\n__yield__();\n}`. `hentikan` → `stop('all'|'this'|'others');` then `return;` for `this`.
  - Operators emit `api`-free expressions where possible (`(A + B)`, `(A === B)`, `Math.floor(Math.random()*(TO-FROM+1))+FROM` for `acak`, `String(A)+String(B)` for `gabung`, `String(A).length` for `panjang`). `sisa dari` → `(A % B)`.

- [ ] **Step 1: Write the failing test**

`tests/unit/blocks-sprite-generator.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { generateThreads } from '../../src/blocks/sprite/generator';

installSpriteBlockly();

function ws(): Blockly.Workspace {
  return new Blockly.Workspace();
}
function connectStack(...blocks: Blockly.Block[]) {
  for (let i = 0; i < blocks.length - 1; i++) {
    blocks[i]!.nextConnection!.connect(blocks[i + 1]!.previousConnection!);
  }
}

describe('generateThreads', () => {
  it('emits one sync ES5 function per hat with no async/await/let/const/=>', () => {
    const w = ws();
    const hat = w.newBlock('sprite_hat_green_flag');
    const move = w.newBlock('sprite_move');
    move.getInput('STEPS')!.connection!.connect(
      (() => {
        const n = w.newBlock('math_number');
        n.setFieldValue('10', 'NUM');
        return n.outputConnection!;
      })(),
    );
    connectStack(hat, move);
    const threads = generateThreads(w);
    expect(threads).toHaveLength(1);
    expect(threads[0]!.hatType).toBe('green_flag');
    const code = threads[0]!.code;
    expect(code).toMatch(/^function hat_green_flag_0\(\) \{/);
    expect(code).not.toMatch(/\basync\b|\bawait\b|=>|\blet\b|\bconst\b|`/);
    expect(code).toContain('move(10)');
    expect(code).toContain("highlightBlock('");
    w.dispose();
  });

  it('ulangi terus becomes while(true) with a __yield__() at the end of the body', () => {
    const w = ws();
    const hat = w.newBlock('sprite_hat_green_flag');
    const forever = w.newBlock('sprite_forever');
    const move = w.newBlock('sprite_move');
    move.getInput('STEPS')!.connection!.connect(
      (() => { const n = w.newBlock('math_number'); n.setFieldValue('1', 'NUM'); return n.outputConnection!; })(),
    );
    forever.getInput('DO')!.connection!.connect(move.previousConnection!);
    connectStack(hat, forever);
    const code = generateThreads(w)[0]!.code;
    expect(code).toMatch(/while \(true\) \{[\s\S]*__yield__\(\);\s*\}/);
    w.dispose();
  });

  it('captures key / message metadata from key and receive hats', () => {
    const w = ws();
    const kh = w.newBlock('sprite_hat_key');
    kh.setFieldValue('ArrowUp', 'KEY');
    const rh = w.newBlock('sprite_hat_receive');
    rh.setFieldValue('mulai', 'MSG');
    const threads = generateThreads(w);
    expect(threads.find((t) => t.hatType === 'key')?.key).toBe('ArrowUp');
    expect(threads.find((t) => t.hatType === 'receive')?.message).toBe('mulai');
    w.dispose();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `src/blocks/sprite/generator.ts`.** Register a `forBlock` entry for every non-hat block. Statement blocks: `return "<call>;\n";` (the `STATEMENT_PREFIX` adds the `highlightBlock` line automatically). Value blocks: `return ["<expr>", javascriptGenerator.ORDER_ATOMIC];`. Example core:

```ts
import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

export type ThreadCode = {
  hatType: 'green_flag' | 'clicked' | 'key' | 'receive';
  key?: string;
  message?: string;
  blockId: string;
  fnName: string;
  code: string;
};

const HATS: Record<string, ThreadCode['hatType']> = {
  sprite_hat_green_flag: 'green_flag',
  sprite_hat_clicked: 'clicked',
  sprite_hat_key: 'key',
  sprite_hat_receive: 'receive',
};

export function registerSpriteGenerators(): void {
  const g = javascriptGenerator;
  g.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
  g.addReservedWords('highlightBlock,__yield__,move,turn,api,Interpreter');
  (g as unknown as { INFINITE_LOOP_TRAP: string | null }).INFINITE_LOOP_TRAP = null;

  const valNum = (b: Blockly.Block, name: string) =>
    g.valueToCode(b, name, Order.NONE) || '0';
  const valAny = (b: Blockly.Block, name: string) =>
    g.valueToCode(b, name, Order.NONE) || "''";
  const valBool = (b: Blockly.Block, name: string) =>
    g.valueToCode(b, name, Order.NONE) || 'false';

  g.forBlock['sprite_move'] = (b) => `move(${valNum(b, 'STEPS')});\n`;
  g.forBlock['sprite_turn_right'] = (b) => `turnRight(${valNum(b, 'DEG')});\n`;
  g.forBlock['sprite_turn_left'] = (b) => `turnLeft(${valNum(b, 'DEG')});\n`;
  g.forBlock['sprite_goto_xy'] = (b) => `gotoXY(${valNum(b, 'X')}, ${valNum(b, 'Y')});\n`;
  g.forBlock['sprite_change_x'] = (b) => `changeX(${valNum(b, 'DX')});\n`;
  g.forBlock['sprite_change_y'] = (b) => `changeY(${valNum(b, 'DY')});\n`;
  g.forBlock['sprite_point_direction'] = (b) => `pointInDirection(${valNum(b, 'DIR')});\n`;
  g.forBlock['sprite_glide'] = (b) =>
    `glide(${valNum(b, 'SECS')}, ${valNum(b, 'X')}, ${valNum(b, 'Y')});\n`;
  g.forBlock['sprite_bounce_edge'] = () => `bounceIfOnEdge();\n`;

  g.forBlock['sprite_say'] = (b) => `say(${valAny(b, 'TEXT')});\n`;
  g.forBlock['sprite_say_for'] = (b) => `sayForSecs(${valAny(b, 'TEXT')}, ${valNum(b, 'SECS')});\n`;
  g.forBlock['sprite_say_clear'] = () => `sayClear();\n`;
  g.forBlock['sprite_switch_costume'] = (b) =>
    `switchCostume(${JSON.stringify(b.getFieldValue('COSTUME'))});\n`;
  g.forBlock['sprite_next_costume'] = () => `nextCostume();\n`;
  g.forBlock['sprite_change_size'] = (b) => `changeSize(${valNum(b, 'DELTA')});\n`;
  g.forBlock['sprite_set_size'] = (b) => `setSize(${valNum(b, 'PCT')});\n`;
  g.forBlock['sprite_show'] = () => `show();\n`;
  g.forBlock['sprite_hide'] = () => `hide();\n`;

  g.forBlock['sprite_wait'] = (b) => `wait(${valNum(b, 'SECS')});\n`;
  g.forBlock['sprite_repeat'] = (b) => {
    const n = valNum(b, 'TIMES');
    const body = g.statementToCode(b, 'DO');
    const i = g.nameDB_!.getDistinctName('i', Blockly.Names.NameType.VARIABLE);
    return `for (var ${i} = 0; ${i} < (${n}); ${i}++) {\n${body}__yield__();\n}\n`;
  };
  g.forBlock['sprite_forever'] = (b) => {
    const body = g.statementToCode(b, 'DO');
    return `while (true) {\n${body}__yield__();\n}\n`;
  };
  g.forBlock['sprite_if'] = (b) =>
    `if (${valBool(b, 'COND')}) {\n${g.statementToCode(b, 'DO')}}\n`;
  g.forBlock['sprite_if_else'] = (b) =>
    `if (${valBool(b, 'COND')}) {\n${g.statementToCode(b, 'DO')}} else {\n${g.statementToCode(b, 'ELSE')}}\n`;
  g.forBlock['sprite_wait_until'] = (b) =>
    `while (!(${valBool(b, 'COND')})) {\n__yield__();\n}\n`;
  g.forBlock['sprite_stop'] = (b) => {
    const t = b.getFieldValue('TARGET');
    return t === 'this' ? `stop('this');\nreturn;\n` : `stop(${JSON.stringify(t)});\n`;
  };

  g.forBlock['sprite_broadcast'] = (b) => `broadcast(${JSON.stringify(b.getFieldValue('MSG'))});\n`;
  g.forBlock['sprite_broadcast_wait'] = (b) =>
    `broadcastAndWait(${JSON.stringify(b.getFieldValue('MSG'))});\n`;

  g.forBlock['sprite_op_arith'] = (b) => {
    const a = valNum(b, 'A');
    const c = valNum(b, 'B');
    const op = { add: '+', sub: '-', mul: '*', div: '/' }[b.getFieldValue('OP') as string] ?? '+';
    return [`((${a}) ${op} (${c}))`, Order.ATOMIC];
  };
  g.forBlock['sprite_op_mod'] = (b) => [`((${valNum(b, 'A')}) % (${valNum(b, 'B')}))`, Order.ATOMIC];
  g.forBlock['sprite_op_compare'] = (b) => {
    const a = valAny(b, 'A');
    const c = valAny(b, 'B');
    const op = { lt: '<', eq: '===', gt: '>' }[b.getFieldValue('OP') as string] ?? '===';
    return [`((${a}) ${op} (${c}))`, Order.ATOMIC];
  };
  g.forBlock['sprite_op_and'] = (b) => [`((${valBool(b, 'A')}) && (${valBool(b, 'B')}))`, Order.ATOMIC];
  g.forBlock['sprite_op_or'] = (b) => [`((${valBool(b, 'A')}) || (${valBool(b, 'B')}))`, Order.ATOMIC];
  g.forBlock['sprite_op_not'] = (b) => [`(!(${valBool(b, 'A')}))`, Order.ATOMIC];
  g.forBlock['sprite_op_random'] = (b) => [
    `(Math.floor(Math.random() * (((${valNum(b, 'TO')}) - (${valNum(b, 'FROM')})) + 1)) + (${valNum(b, 'FROM')}))`,
    Order.ATOMIC,
  ];
  g.forBlock['sprite_op_join'] = (b) => [`(String(${valAny(b, 'A')}) + String(${valAny(b, 'B')}))`, Order.ATOMIC];
  g.forBlock['sprite_op_length'] = (b) => [`(String(${valAny(b, 'A')}).length)`, Order.ATOMIC];

  g.forBlock['sprite_sensing_key'] = (b) => [
    `isKeyPressed(${JSON.stringify(b.getFieldValue('KEY'))})`,
    Order.ATOMIC,
  ];
  g.forBlock['sprite_sensing_timer'] = () => [`timer()`, Order.ATOMIC];
  g.forBlock['sprite_sensing_reset_timer'] = () => `resetTimer();\n`;

  // Built-in variable blocks → runtime var accessors
  g.forBlock['variables_get'] = (b) => [
    `getVar(${JSON.stringify(b.getField('VAR')!.getText())})`,
    Order.ATOMIC,
  ];
  g.forBlock['variables_set'] = (b) =>
    `setVar(${JSON.stringify(b.getField('VAR')!.getText())}, ${valAny(b, 'VALUE')});\n`;
  g.forBlock['math_change'] = (b) =>
    `changeVar(${JSON.stringify(b.getField('VAR')!.getText())}, ${valNum(b, 'DELTA')});\n`;
}

export function generateThreads(workspace: Blockly.Workspace): ThreadCode[] {
  const g = javascriptGenerator;
  g.init(workspace);
  const threads: ThreadCode[] = [];
  const tops = workspace.getTopBlocks(true).filter((b) => b.type in HATS);
  tops.forEach((hat, index) => {
    const hatType = HATS[hat.type]!;
    const first = hat.getNextBlock();
    const body = first ? g.blockToCode(first) : '';
    const bodyStr = Array.isArray(body) ? body[0] : body;
    const fnName = `hat_${hatType}_${index}`;
    threads.push({
      hatType,
      key: hat.type === 'sprite_hat_key' ? hat.getFieldValue('KEY') : undefined,
      message: hat.type === 'sprite_hat_receive' ? hat.getFieldValue('MSG') : undefined,
      blockId: hat.id,
      fnName,
      code: `function ${fnName}() {\n${bodyStr}}\n`,
    });
  });
  g.finish('');
  return threads;
}
```

> Note for the implementer: Blockly's exact generator API (property name `forBlock` vs `javascriptGenerator[type]`, `Order` import path, `statementToCode` indentation) shifted across v10→v12. Verify against the installed version and adjust; the *contract* (sync ES5 out, `highlightBlock` prefix, `__yield__` in loops, bare-global op calls) is what matters. Snapshot tests lock the output.

- [ ] **Step 4: Run — expect PASS**, then `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/blocks/sprite/generator.ts src/blocks/index.ts tests/unit/blocks-sprite-generator.test.ts
git commit -m "feat(blocks): synchronous-ES5 sprite generator with highlight + yield hooks"
```

---

## Task 5: Runtime context (`runtime/sprite/runtime-context.ts`)

**Files:**
- Create: `src/runtime/sprite/runtime-context.ts`
- Test: `tests/unit/sprite-runtime-context.test.ts`

**Interfaces:**
- Consumes: `Sprite` from `./sprite`.
- Produces:
  - `export type RuntimeContext = { sprites: Map<string, Sprite>; keysDown: Set<string>; timerOrigin: number; now: () => number; getStageSprites: () => Sprite[]; }`
  - `export function createRuntimeContext(sprites: Sprite[], now?: () => number): RuntimeContext` — seeds the map (cloned), `timerOrigin = now()`, `keysDown` empty.
  - `export function timerSeconds(ctx: RuntimeContext): number` → `(ctx.now() - ctx.timerOrigin) / 1000`
  - `export function resetTimer(ctx: RuntimeContext): void` → `ctx.timerOrigin = ctx.now()`
  - `export function setKey(ctx: RuntimeContext, key: string, down: boolean): void`
  - `export function isKeyDown(ctx: RuntimeContext, key: string): boolean`
  - `export function updateSprite(ctx: RuntimeContext, id: string, next: Sprite): void`

- [ ] **Step 1: Write the failing test** — cover `createRuntimeContext` clones inputs; `timerSeconds` uses injected `now`; `resetTimer` rebases; `setKey`/`isKeyDown` round-trip (case-insensitive for single letters — normalize to the dropdown values, i.e. lowercase letters, `Arrow*` as-is, `' '` for space); `updateSprite` replaces the map entry.

- [ ] **Step 2: Run — FAIL. Step 3: Implement. Step 4: Run — PASS.** (Straightforward; `now` defaults to `() => Date.now()`; normalize keys with `key.length === 1 ? key.toLowerCase() : key`.)

- [ ] **Step 5: Commit** — `feat(runtime): sprite runtime context (sprites, keys, timer)`

---

## Task 6: Sprite op API (`runtime/sprite/api.ts`)

**Files:**
- Create: `src/runtime/sprite/api.ts`
- Test: `tests/unit/sprite-api.test.ts`

**Interfaces:**
- Consumes: `Sprite` + pure ops from `./sprite`; `RuntimeContext` + helpers from `./runtime-context`.
- Produces:
  - `export type DurationRequest = { kind: 'wait'; seconds: number } | { kind: 'glide'; seconds: number; toX: number; toY: number; fromX: number; fromY: number } | { kind: 'sayFor'; seconds: number } | { kind: 'yield' } | { kind: 'broadcastWait'; message: string }`
  - `export type StopScope = 'all' | 'this' | 'others'`
  - `export type SpriteApi = { sync: Record<string, (...a: unknown[]) => unknown>; async: Record<string, (...a: unknown[]) => DurationRequest> }`
  - `export function buildApi(ctx: RuntimeContext, spriteId: string, hooks: { onBroadcast: (msg: string) => void; onStop: (scope: StopScope, spriteId: string) => void; onHighlight: (blockId: string) => void; }): SpriteApi`
    - **sync:** `highlightBlock(id)`, `move(n)`, `turnRight(d)`, `turnLeft(d)`, `gotoXY(x,y)`, `changeX(dx)`, `changeY(dy)`, `pointInDirection(d)`, `bounceIfOnEdge()`, `say(t)`, `sayClear()`, `switchCostume(sel)` (sel = costume index string or name; resolve against `sprite.costumes`), `nextCostume()`, `changeSize(d)`, `setSize(p)`, `show()`, `hide()`, `broadcast(msg)` → `hooks.onBroadcast`, `stop(scope)` → `hooks.onStop`, `getVar(name)`, `setVar(name,v)`, `changeVar(name,delta)`, `isKeyPressed(key)` → `isKeyDown(ctx, normalized)`, `timer()` → `timerSeconds(ctx)`, `resetTimer()` → `resetTimer(ctx)`. Each mutating op reads `ctx.sprites.get(spriteId)`, applies the pure op, `updateSprite`.
    - **async:** `wait(s)` → `{kind:'wait',seconds:s}`; `glide(s,x,y)` → captures `fromX/fromY` from the current sprite; `sayForSecs(t,s)` → calls sync `say(t)` then returns `{kind:'sayFor',seconds:s}` (the scheduler clears the bubble when it elapses); `frameYield()` / `__yield__` → `{kind:'yield'}`; `broadcastAndWait(msg)` → `{kind:'broadcastWait',message:msg}`.

- [ ] **Step 1: Write the failing test** — sync ops mutate the context sprite via pure ops (`move(10)` → sprite.x≈10); `switchCostume('2')` and `switchCostume('nama')` both resolve; `getVar`/`setVar`/`changeVar` on `sprite.variables`; `timer()`/`resetTimer()` via injected `now`; async `wait(0.5)` returns `{kind:'wait',seconds:0.5}`; `glide` captures `fromX/fromY`; `broadcast` calls the hook; `stop` calls the hook.

- [ ] **Steps 2–4: FAIL → implement → PASS.**

- [ ] **Step 5: Commit** — `feat(runtime): sprite op API (sync mutations + async duration requests)`

---

## Task 7: Thread interpreter (`runtime/sprite/interpreter.ts`)

**Files:**
- Create: `src/runtime/sprite/interpreter.ts`
- Test: `tests/unit/sprite-interpreter.test.ts`

**Interfaces:**
- Consumes: `Interpreter` from `js-interpreter`; `SpriteApi`, `DurationRequest` from `./api`.
- Produces:
  - `export type ThreadState = 'running' | 'parked' | 'done'`
  - `export type ThreadInterpreter = { step(): void; state: ThreadState; pending: DurationRequest | null; resume(): void; }`
  - `export function createThreadInterpreter(code: string, api: SpriteApi): ThreadInterpreter` — `new Interpreter(code + '\n' + entryCall, initFn)` where `entryCall` calls the single generated `hat_*` function (parse the fn name from `code` with a regex `/function (hat_\w+)\(/`). `initFn(interp, scope)` registers:
    - every `api.sync[name]` as `interp.setProperty(scope, name, interp.createNativeFunction(wrap(fn)))` where `wrap` converts pseudo args → native (`interp.pseudoToNative`) and native return → pseudo (`interp.nativeToPseudo`).
    - every `api.async[name]` (plus alias `__yield__` → `api.async.frameYield`) as `interp.createAsyncFunction((...args) => { const cb = args.pop(); this.pending = fn(...nativeArgs); this.state='parked'; this._resumeCb = cb; })`.
  - `step()`: if `state !== 'running'` return; call `interp.step()`; if it returns `false` → `state='done'`; the async-fn wrapper flips `state` to `'parked'` and stores `pending`.
  - `resume()`: precondition `state==='parked'`; call the stored `_resumeCb()`, clear `pending`, `state='running'`.

- [ ] **Step 1: Write the failing test** — with a fake `SpriteApi` whose `sync.move` pushes to an array and `async.wait` returns `{kind:'wait',seconds:0.1}`:
  - code `function hat_green_flag_0(){ move(3); wait(0.1); move(7); }` → repeatedly `step()` until `state==='parked'`; assert `pending.kind==='wait'` and `move` called with `3`; then `resume()`; step to `done`; assert `move` called with `7`.
  - A pure-sync program with no async → steps straight to `done`.
  - `highlightBlock('abc')` in the code invokes `api.sync.highlightBlock` with `'abc'`.

- [ ] **Steps 2–4: FAIL → implement → PASS.** Note: `js-interpreter` async functions get the real callback as the **last** argument; the wrapper must `args.pop()` to get it and treat the rest as the pseudo args to convert.

- [ ] **Step 5: Commit** — `feat(runtime): JS-Interpreter thread wrapper with sync + async native bindings`

---

## Task 8: Scheduler (`runtime/sprite/scheduler.ts`)

**Files:**
- Create: `src/runtime/sprite/scheduler.ts`
- Test: `tests/unit/sprite-scheduler.test.ts`

**Interfaces:**
- Consumes: `ThreadInterpreter` from `./interpreter`; `RuntimeContext` + `timerSeconds`/etc from `./runtime-context`; `DurationRequest` from `./api`; `moved`/`movedToXY` etc. from `./sprite` (for `glide` interpolation).
- Produces:
  - `export type SchedulerThread = { id: string; spriteId: string; interp: ThreadInterpreter; hatBlockId: string; parkedUntil?: number; glide?: { start: number; secs: number; fromX: number; fromY: number; toX: number; toY: number }; sayUntil?: number; waitingOnBroadcast?: string }`
  - `export type Scheduler = { start(threads: { spriteId: string; hatBlockId: string; interp: ThreadInterpreter }[]): void; stopSprite(spriteId: string): void; stopOthers(spriteId: string, keepThreadId: string): void; stopAll(): void; tick(nowMs: number): void; isRunning(): boolean; readonly threads: readonly SchedulerThread[]; }`
  - `export function createScheduler(opts: { ctx: RuntimeContext; render: () => void; onHighlight: (blockId: string | null) => void; onBroadcastDone?: (message: string) => void; maxStepsPerFrame?: number; }): Scheduler`
  - `tick(nowMs)`: for each thread — if parked on `wait`/`sayFor` and `nowMs >= parkedUntil` → clear bubble if `sayFor`, `interp.resume()`; if `glide` active → interpolate sprite pos, and when `nowMs - start >= secs*1000` snap to `toX/toY` and `resume()`; if `waitingOnBroadcast` and that message has no live threads → `resume()`; then step the thread up to `maxStepsPerFrame` (default `200000`) times or until `state !== 'running'`; if a thread emits `{kind:'yield'}` treat as a one-frame park (resume next tick); a thread still `running` after the step budget is force-parked one frame (guard against tight loops with no `__yield__`, which shouldn't happen but must be safe). After all threads: drop `done` threads; call `render()`; call `onHighlight(lastHighlightedId)`.
  - `start()` appends threads. `stopAll()` clears the list + `onHighlight(null)`. `isRunning()` = `threads.length > 0`.
  - The scheduler owns the rAF loop only through an exported `attach(win = window)` that calls `tick(performance.now())` each frame; tests call `tick()` directly with a fake clock, so keep `attach` thin.

- [ ] **Step 1: Write the failing integration test** — build a `RuntimeContext` with one sprite; hand-craft `ThreadInterpreter` fakes (or use the real interpreter with the real api from Tasks 6–7 over generated code from Task 4 — preferred, it's a true integration test):
  - Fixture: green-flag hat → `repeat 4 { turnRight(90); move(10); }` (no waits). `tick()` once with a large step budget → sprite returned to origin-ish, thread `done`, `render` called once.
  - Fixture with `wait(0.1)` between moves → first `tick(0)` parks; `tick(50)` still parked; `tick(120)` resumes and finishes.
  - Fixture with `forever { move(1); }` → after 10 `tick()`s the thread is still alive (not `done`) and the sprite moved exactly 10 (one `move` per frame because `__yield__` parks each iteration); `stopAll()` → `threads` empty, `onHighlight(null)` called.
  - `glide(1, 100, 0)` from `(0,0)` → `tick(0)` starts glide; `tick(500)` sprite.x≈50; `tick(1000)` sprite.x===100 and thread resumes.

- [ ] **Steps 2–4: FAIL → implement → PASS.**

- [ ] **Step 5: Commit** — `feat(runtime): frame scheduler — threads, parking, glide, loop-safety, stop`

---

## Task 9: Sprite event bus (`runtime/sprite/event-bus.ts`)

**Files:**
- Create: `src/runtime/sprite/event-bus.ts`
- Test: `tests/unit/sprite-event-bus.test.ts`

**Interfaces:**
- Consumes: `Scheduler` from `./scheduler`; `ThreadInterpreter`/`createThreadInterpreter` from `./interpreter`; `buildApi` from `./api`; `RuntimeContext`, `setKey` from `./runtime-context`; `generateThreads`/`ThreadCode` from `../../blocks/sprite/generator`; `Blockly` for workspace type.
- Produces:
  - `export type SpriteProgram = { spriteId: string; workspace: Blockly.Workspace }`
  - `export type SpriteEvents = { greenFlag(): void; spriteClicked(spriteId: string): void; keyDown(key: string): void; keyUp(key: string): void; broadcast(message: string): void; broadcastAndWait(message: string, done: () => void): void; hasLiveThreadsForMessage(message: string): boolean; rebuild(programs: SpriteProgram[]): void; }`
  - `export function createSpriteEvents(opts: { ctx: RuntimeContext; scheduler: Scheduler; onHighlight: (id: string | null) => void }): SpriteEvents`
  - `rebuild(programs)` — for each sprite's workspace, `generateThreads(workspace)` → cache `ThreadCode[]` keyed by spriteId (grouped by `hatType`).
  - `greenFlag()` — `scheduler.stopAll()`, then for every sprite's `green_flag` threads build a fresh `ThreadInterpreter` (`buildApi(ctx, spriteId, hooks)` + `createThreadInterpreter(code, api)`) and `scheduler.start(...)`.
  - `keyDown(key)` — `setKey(ctx, key, true)`, then start each sprite's matching `key` threads (dedupe: don't stack a second copy if one is already live for that hat block).
  - `broadcast(msg)` — start every sprite's `receive` threads whose `message === msg`.
  - `broadcastAndWait(msg, done)` — same as `broadcast` but records the set of started thread ids; poll via the scheduler's `onBroadcastDone`/each tick — when none remain, call `done()`. (Wire the scheduler `onBroadcastDone` in Task 13; here expose `hasLiveThreadsForMessage`.)
  - hooks passed into `buildApi`: `onBroadcast: (m) => this.broadcast(m)`, `onStop: (scope, sid) => scope==='all' ? scheduler.stopAll() : scope==='this' ? /* handled by generator return */ undefined : scheduler.stopOthers(sid, currentThreadId)`, `onHighlight: opts.onHighlight`.

- [ ] **Step 1: Write the failing test** — real workspaces built programmatically:
  - two sprites, each with a `green_flag` hat → `move(5)`. `greenFlag()` then drive `scheduler.tick()` to completion → both sprites moved 5.
  - sprite with `saat terima "go"` → `move(3)`; `broadcast('go')` → runs; `broadcast('nope')` → no-op.
  - `keyDown('ArrowUp')` sets the key and starts the `saat tombol panah atas ditekan` thread; a second `keyDown('ArrowUp')` while it's still live doesn't double-start.
  - `greenFlag()` twice → the second call stops the first run's threads before restarting.

- [ ] **Steps 2–4: FAIL → implement → PASS.**

- [ ] **Step 5: Commit** — `feat(runtime): sprite event bus (green flag / click / key / broadcast)`

---

## Task 10: Placeholder SVG assets + catalog (`runtime/sprite/assets.ts` + `assets/`)

**Files:**
- Create: `src/runtime/sprite/assets/cat.svg`, `ball.svg`, `arrow.svg`, `square.svg`, `star.svg`, `circle.svg`, `triangle.svg`, `bug.svg`, `heart.svg` (9 costumes); `bg-plain.svg`, `bg-sky.svg`, `bg-grid.svg`, `bg-sunset.svg` (4 backdrops)
- Create: `src/runtime/sprite/assets.ts`
- Test: `tests/unit/sprite-assets.test.ts`

**Interfaces:**
- Consumes: nothing (Vite `?url` imports of the SVGs).
- Produces:
  - `export type BuiltinAsset = { id: string; kind: 'costume' | 'backdrop'; name: string; url: string }` (`id` like `builtin:cat`)
  - `export const BUILTIN_COSTUMES: readonly BuiltinAsset[]`, `export const BUILTIN_BACKDROPS: readonly BuiltinAsset[]`, `export const BUILTIN_BY_ID: ReadonlyMap<string, BuiltinAsset>`
  - `export function isBuiltinAssetId(id: string): boolean` (`id.startsWith('builtin:')`)
  - `export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024`
  - `export async function loadUploadedImage(file: File): Promise<{ dataUrl: string; name: string }>` — reject (Bahasa Indonesia `Error`) if `file.size > MAX_UPLOAD_BYTES` or `!file.type.startsWith('image/')`; else `FileReader.readAsDataURL`.
  - `export function resolveAssetUrl(assetId: string, projectAssets: Record<string, { ref: string }>): string | null` — builtin → its `url`; embedded → `projectAssets[assetId]?.ref` (the data URL); else `null`.

- [ ] **Step 1: Author the 13 SVGs.** Each costume: a single centered shape on a transparent background, `viewBox="0 0 100 100"`, ~80×80 drawing, distinct fill colour. The "cat" can be a simple rounded body + two triangle ears + eyes (kept crude — real art is Phase 3). Backdrops: `viewBox="0 0 480 360"`, a solid fill or a `<linearGradient>` / simple `<pattern>` grid. Keep each file < 2 KB.

- [ ] **Step 2: Write the failing test** — `BUILTIN_COSTUMES` has 9 entries with unique ids all starting `builtin:`; `BUILTIN_BACKDROPS` has 4; `BUILTIN_BY_ID.get('builtin:cat')` resolves; `loadUploadedImage` rejects a 3 MB fake `File` and a `text/plain` file with an Indonesian message, accepts a small `image/png` `File` (use `new File([bytes], 'x.png', {type:'image/png'})` + a `FileReader` shim if jsdom's is flaky — jsdom implements `FileReader.readAsDataURL`); `resolveAssetUrl('builtin:cat', {})` non-null, `resolveAssetUrl('x', {x:{ref:'data:...'}})` returns the ref, `resolveAssetUrl('missing', {})` null.

- [ ] **Step 3: Implement `assets.ts`** using `import catUrl from './assets/cat.svg?url'` etc.

- [ ] **Step 4: Run — PASS. Step 5: Commit** — `feat(runtime): placeholder SVG costume/backdrop catalog + upload guard`

---

## Task 11: Stage renderer (`runtime/sprite/stage.ts`)

**Files:**
- Create: `src/runtime/sprite/stage.ts`
- Test: `tests/unit/sprite-stage.test.ts`

**Interfaces:**
- Consumes: `Sprite`, `STAGE`, `directionToRadians` from `./sprite`; `resolveAssetUrl` from `./assets`.
- Produces:
  - `export type Scene = { sprites: Sprite[]; backdropUrl: string | null; costumeUrlFor: (s: Sprite) => string | null }`
  - `export type Stage = { render(): void; hitTest(clientX: number, clientY: number): string | null; thumbnail(maxW?: number): string; setNeedsResize(): void; dispose(): void }`
  - `export function createStage(canvas: HTMLCanvasElement, getScene: () => Scene): Stage`
  - `render()`: size the canvas backing store to `STAGE.width*dpr × STAGE.height*dpr`, CSS-scale to the container; clear; draw backdrop image (cover); for each `sprite` where `visible`, load/cache its costume `Image` by url, `ctx.translate(240 + s.x, 180 - s.y); ctx.rotate(directionToRadians(s.direction) ...)` — note: costumes drawn upright (Scratch rotates the sprite, direction 90 = image as-authored). Draw the image centered, scaled by `s.size/100`. Draw the say bubble (rounded rect + text) above the sprite when `s.bubble`.
  - `hitTest`: map client coords → stage coords via `getBoundingClientRect`; iterate sprites top-most first; hit if within the scaled costume bounding box (image natural size × scale, centered on x/y). Return sprite id or null.
  - `thumbnail(maxW=160)`: draw the current canvas into an offscreen canvas scaled to `maxW` and return `toDataURL('image/png')`.
  - Image cache is a `Map<string, HTMLImageElement>`; on first miss create `new Image()`, set `src`, and call a private `scheduleRedraw` on load. `dispose()` clears the cache + any listeners.

- [ ] **Step 1: Write the failing test** — jsdom with a **stub 2D context** (record calls): `canvas.getContext = () => fakeCtx`. Assert: `render()` calls `clearRect` then `drawImage` for the backdrop and one per visible sprite; a hidden sprite is skipped; `hitTest` math — with a 480×360 canvas at rect origin `(0,0)`, a sprite at `(0,0)` with a 80×80 costume → `hitTest(240, 180)` returns its id, `hitTest(10, 10)` returns null. Use a fake `Image` (`class FakeImage { set src(v){ this.onload?.(); } naturalWidth = 80; naturalHeight = 80; }`) via `vi.stubGlobal('Image', FakeImage)`. `thumbnail()` returns a `data:image/png` string (jsdom `toDataURL` works).

- [ ] **Steps 2–4: FAIL → implement → PASS.** Add a code comment: pixel-accurate rotation/bubble layout is verified by the manual checklist + E2E, not the unit test.

- [ ] **Step 5: Commit** — `feat(runtime): Canvas stage renderer + click hit-test + thumbnail`

---

## Task 12: Project wiring for sprite scripts (`core/sprite-project.ts` + `createEmptyProject`)

**Files:**
- Create: `src/core/sprite-project.ts`
- Modify: `src/core/project.ts` (`createEmptyProject` only)
- Test: `tests/unit/sprite-project.test.ts`, and extend `tests/unit/project.test.ts` for the new default costume

**Interfaces:**
- Consumes: `Project`, `SpriteData`, `AssetRef` from `./project`; `Sprite`, `createSprite` from `../runtime/sprite/sprite`; `Blockly` for workspace JSON typing (`Record<string, unknown>`).
- Produces:
  - `export function spriteWorkspaceJson(sprite: SpriteData): Record<string, unknown>` → `sprite.script` (or `{}`)
  - `export function withSpriteWorkspace(project: Project, spriteId: string, json: Record<string, unknown>): Project` — immutably replace that sprite's `script`, bump `meta.updatedAt`
  - `export function runtimeSpriteFrom(sprite: SpriteData): Sprite` — map `SpriteData` → runtime `Sprite` (costumes = `sprite.costumes.map(c => c.assetId)`, `costumeIndex = sprite.currentCostume`, `variables = {}` — Blockly holds variable *definitions*; their runtime values start empty each green-flag run)
  - `export function applyRuntimeSprite(sprite: SpriteData, rt: Sprite): SpriteData` — write back `x,y,direction,size,visible,currentCostume` (positions persist between runs like Scratch); ignore `variables`/`bubble` (transient)
  - `export function addSprite(project: Project, name: string): { project: Project; spriteId: string }` — new `SpriteData` (id `newId('sprite')`, default costume `{assetId:'builtin:cat'}`, `script:{}`), appended
  - `export function removeSprite(project: Project, spriteId: string): Project` — drop it; never remove the last sprite (throw Bahasa Indonesia `Error`)
  - `createEmptyProject` change: the single default sprite gets `costumes: [{ assetId: 'builtin:cat' }]`, `currentCostume: 0`, and `project.assets['builtin:cat'] = { kind: 'image', name: 'Kucing', source: 'builtin', ref: 'builtin:cat' }`.

- [ ] **Step 1: Write the failing tests** — `createEmptyProject('X')` sprite has one costume `builtin:cat` and `project.assets['builtin:cat']` exists with `source:'builtin'`; `validate` still returns ok; `withSpriteWorkspace` round-trips and doesn't mutate the input; `runtimeSpriteFrom`/`applyRuntimeSprite` round-trip position fields; `addSprite` yields 2 sprites with distinct ids; `removeSprite` on a 1-sprite project throws.

- [ ] **Steps 2–4: FAIL → implement → PASS** (run the whole `npm test` — `project.test.ts` must stay green with the new default).

- [ ] **Step 5: Commit** — `feat(core): per-sprite Blockly workspace + costume wiring on Project`

---

## Task 13: Sprite-mode UI shell (`app/editor/sprite-mode/`)

**Files:**
- Create: `src/app/editor/sprite-mode/sprite-mode.ts`, `sprite-panel.ts`, `costume-panel.ts`, `sprite-mode.css`
- Modify: `src/app/editor/editor-view.ts`
- Test: `tests/unit/sprite-mode-view.test.ts`

**Interfaces:**
- Consumes: `installSpriteBlockly`, `Blockly`, `spriteTheme`, `setCostumeOptionsProvider` from `../../../blocks`; `spriteToolbox` from `../../../blocks/sprite/toolbox`; `createRuntimeContext` from `../../../runtime/sprite/runtime-context`; `createScheduler`, `createSpriteEvents`, `createStage` from runtime; `runtimeSpriteFrom`/`applyRuntimeSprite`/`withSpriteWorkspace`/`addSprite`/`removeSprite`/`spriteWorkspaceJson` from `../../../core/sprite-project`; `BUILTIN_COSTUMES`/`loadUploadedImage`/`resolveAssetUrl` from `../../../runtime/sprite/assets`; `t` from i18n; `Project`, `Storage` types.
- Produces:
  - `export type SpriteModeDeps = { project: Project; markDirty: () => void; getThumbnail: { current: (() => string | undefined) | null } }` — the `getThumbnail.current` slot is filled by this module so `editor-view` can pass a thumbnail to `saveProject`.
  - `export function renderSpriteMode(host: HTMLElement, deps: SpriteModeDeps): () => void` — builds the layout, injects Blockly, mounts the stage + Green-flag/Stop, mounts sprite & costume panels; returns a cleanup fn (dispose Blockly, stage, scheduler rAF, listeners; final serialize of the active workspace into the project).
  - `editor-view.ts` change: after rendering the header, if `project.activeMode === 'sprite'`, call `renderSpriteMode(workspaceEl, { project, markDirty: scheduleSave, getThumbnail })` and keep its cleanup; in `scheduleSave` pass `getThumbnail.current?.()` as the 3rd arg to `storage.saveProject`. On `onModeChange` away from sprite, run the sprite-mode cleanup. (Keep the placeholder text for `html` mode.)

Layout (`sprite-mode.css`, CSS grid): left = `#blocklyDiv` (flex 1), right column 360px: top = stage `<canvas>` in a 480×360-ratio box + a toolbar (`▶ Jalankan` green button `[data-green-flag]`, `⏹ Stop` `[data-stop]`), bottom = a tabbed panel `[Sprite | Kostum]`.

Behaviour:
- `installSpriteBlockly()`; `Blockly.inject(blocklyDiv, { toolbox: spriteToolbox, theme: spriteTheme, renderer: 'geras', trashcan: true, zoom: { controls: true, wheel: true }, move: { scrollbars: true } })`.
- Track `selectedSpriteId` (default first). `loadWorkspace(spriteId)`: `Blockly.serialization.workspaces.load(spriteWorkspaceJson(sprite) , ws)` (guard empty). `persistWorkspace()`: `project = withSpriteWorkspace(project, selectedSpriteId, Blockly.serialization.workspaces.save(ws))` then `deps.markDirty()`.
- `ws.addChangeListener(e => { if (e.isUiEvent) return; persistWorkspace(); rebuildPrograms(); })`.
- `setCostumeOptionsProvider(() => currentSprite.costumes.map((c,i) => [BUILTIN_BY_ID.get(c.assetId)?.name ?? \`kostum${i+1}\`, String(i)]))`.
- Stage `getScene()` returns `{ sprites: project.sprites.map(runtimeSpriteFrom-merged-with-live-runtime), backdropUrl: resolveAssetUrl(project.sprite.stage.backdrop?.assetId ?? 'builtin:bg-plain', project.assets), costumeUrlFor }`.
- `▶` → serialize all workspaces, `rebuildPrograms()`, build a fresh `RuntimeContext` from `project.sprites` (via `runtimeSpriteFrom`), `events.greenFlag()`, start the rAF loop (`scheduler.attach`). `⏹` → `scheduler.stopAll()`, stop rAF, write runtime positions back via `applyRuntimeSprite` → `markDirty()`.
- Stage canvas `click` → `stage.hitTest` → `events.spriteClicked(id)` (only meaningful while running; also selects that sprite in the panel when idle).
- `window` `keydown`/`keyup` (only while running) → `events.keyDown/keyUp` with the raw `e.key`.
- After `⏹` (or when the run naturally ends), set `getThumbnail.current = () => stage.thumbnail()`.
- Block highlight: `onHighlight: (id) => id ? ws.highlightBlock(id) : ws.highlightBlock(null)`.

- [ ] **Step 1: Write the failing test** (jsdom; Blockly's `inject` works in jsdom well enough to mount, though rendering is partial — assert structure & wiring, not pixels):
  - `renderSpriteMode` into a detached div → contains `#blocklyDiv`, a `<canvas>`, `[data-green-flag]`, `[data-stop]`, a `[data-tab="sprite"]` and `[data-tab="kostum"]`.
  - Clicking `[data-green-flag]` doesn't throw and starts the scheduler (`isRunning()` true via an exported test hook `__spriteModeHandle` on the returned object or a `data-` attribute); `[data-stop]` stops it.
  - Switching to a second sprite (add via the panel) then back preserves each workspace's blocks (serialize/load round-trip through `project.sprites[*].script`).
  - `markDirty` is called after a simulated non-UI `Blockly.Events` change.
  - Cleanup empties the host and disposes Blockly (`Blockly.getMainWorkspace()` no longer the injected one / no throw on re-render).
  > If jsdom + Blockly `inject` proves too heavy for unit scope, guard the inject behind a tiny injected-workspace factory that the test can stub, and cover the real inject in the E2E (Task 16). Note whichever path you take in the report.

- [ ] **Steps 2–4: FAIL → implement → PASS**, then `npm run typecheck && npm run build`.

- [ ] **Step 5: Commit** — `feat(editor): sprite mode — Blockly workspace, stage, sprite & costume panels`

---

## Task 14: Sprite & costume panels + run wiring polish

**Files:**
- Modify: `src/app/editor/sprite-mode/sprite-panel.ts`, `costume-panel.ts`, `sprite-mode.ts`
- Test: `tests/unit/sprite-panels.test.ts`

**Interfaces:**
- `sprite-panel.ts` → `export function renderSpritePanel(host, { getProject, getSelectedId, onSelect, onAdd, onRemove, onRename, onField }): { refresh(): void; dispose(): void }` — a list of sprite chips (thumbnail via first costume url + name), `+ Sprite` button, and for the selected sprite: number inputs `x`, `y`, `arah`, `ukuran` and a `tampil` checkbox that call `onField(patch)`; a `Hapus` button (disabled when only one sprite) calling `onRemove`.
- `costume-panel.ts` → `export function renderCostumePanel(host, { getSelectedSprite, onAddBuiltin, onUpload, onPick }): { refresh(): void; dispose(): void }` — grid of `BUILTIN_COSTUMES` (click → `onAddBuiltin(assetId)`), an `Unggah gambar` `<input type=file accept="image/*">` (→ `loadUploadedImage` → `onUpload({dataUrl,name})`), and the current sprite's costume thumbnails with the active one marked (click → `onPick(index)`).
- `sprite-mode.ts` wires these: `onField` mutates `project.sprites[sel]` + `markDirty()` + stage redraw; `onAdd` → `addSprite` → select it → load empty workspace; `onRemove` → `removeSprite` (catch the last-sprite `Error` → ignore) → select first; `onAddBuiltin`/`onUpload` push into `sprite.costumes` (+ `project.assets` for uploads with `source:'embedded'`, `ref:dataUrl`) + `markDirty()`; `onPick` sets `currentCostume` + redraw.

- [ ] **Step 1: Write the failing test** — with a real `Project` (from `createEmptyProject`) and stub callbacks: panel renders one chip; `+ Sprite` calls `onAdd`; editing the `x` field calls `onField({x: <n>})`; `Hapus` is disabled with one sprite and enabled with two; costume grid renders 9 builtin tiles; picking tile 2 calls `onAddBuiltin('builtin:ball')` (order matches `BUILTIN_COSTUMES`); a fake image `File` through the upload input calls `onUpload` with a `data:` url.

- [ ] **Steps 2–4: FAIL → implement → PASS.**

- [ ] **Step 5: Commit** — `feat(editor): sprite list + costume panel with builtin picker and upload`

---

## Task 15: i18n keys + Bahasa Indonesia audit

**Files:**
- Modify: `src/app/i18n/id.json`
- Test: extend `tests/unit/i18n.test.ts`

**Interfaces:** add these keys (values in Bahasa Indonesia):
```
editor.sprite.run = "Jalankan"
editor.sprite.stop = "Stop"
editor.sprite.tabSprite = "Sprite"
editor.sprite.tabCostume = "Kostum"
editor.sprite.addSprite = "+ Sprite"
editor.sprite.removeSprite = "Hapus"
editor.sprite.fieldX = "x"
editor.sprite.fieldY = "y"
editor.sprite.fieldDirection = "Arah"
editor.sprite.fieldSize = "Ukuran"
editor.sprite.fieldVisible = "Tampil"
editor.sprite.newSpriteName = "Sprite"
editor.sprite.costumeBuiltinHeading = "Kostum bawaan"
editor.sprite.costumeCurrentHeading = "Kostum sprite ini"
editor.sprite.uploadImage = "Unggah gambar"
editor.sprite.uploadTooBig = "Gambar terlalu besar (maks 2 MB)."
editor.sprite.uploadNotImage = "File itu bukan gambar."
editor.sprite.backdropHeading = "Latar panggung"
error.spriteRunFailed = "Ada kesalahan saat menjalankan skrip."
error.lastSprite = "Tidak bisa menghapus sprite terakhir."
```
(Block captions themselves live in `blocks.ts` — already Bahasa Indonesia.)

- [ ] **Step 1: Add a test** asserting `t('editor.sprite.run') === 'Jalankan'`, `t('editor.sprite.uploadTooBig')` contains `2 MB`, and that no value in `id.json` contains an obvious English word from a small blocklist (`Run|Stop|Sprite list|Costume|Upload|Delete`) — allow `Stop` and `Sprite` as accepted loanwords, so blocklist = `["Run ","Costume","Upload","Delete","Backdrop"]`.

- [ ] **Step 2: Run — FAIL. Step 3: add keys. Step 4: Run — PASS.**

- [ ] **Step 5: Commit** — `feat(i18n): Bahasa Indonesia strings for sprite mode`

---

## Task 16: E2E green-flag flow + ROADMAP + final gate

**Files:**
- Create: `tests/e2e/sprite-mode.spec.ts`
- Modify: `docs/ROADMAP.md`, `src/app/editor/sprite-mode/sprite-mode.ts` (add a `window.__kodakoStage` debug hook exposing `{ spriteState: () => project.sprites.map(s=>({id:s.id,x:s.x,y:s.y,direction:s.direction})), isRunning: () => scheduler.isRunning() }` — guarded so it only attaches in the editor, harmless in prod)

**Interfaces:** none new.

- [ ] **Step 1: Write `tests/e2e/sprite-mode.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('green flag runs a script and the sprite moves; workspace persists', async ({ page }) => {
  await page.goto('/index.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

  // Sprite mode is the default (project.activeMode === 'sprite')
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  // Build a script by dropping blocks from the flyout via Blockly's API
  // (dragging is flaky in CI; use an eval hook that appends a known workspace).
  await page.evaluate(() => {
    const w = window as unknown as { Blockly?: any };
    const B = w.Blockly ?? (window as any).__kodakoBlockly;
    const ws = B.getMainWorkspace();
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sprite_hat_green_flag',
              x: 20,
              y: 20,
              next: {
                block: {
                  type: 'sprite_repeat',
                  inputs: {
                    TIMES: { shadow: { type: 'math_number', fields: { NUM: 4 } } },
                    DO: {
                      block: {
                        type: 'sprite_turn_right',
                        inputs: { DEG: { shadow: { type: 'math_number', fields: { NUM: 90 } } } },
                        next: {
                          block: {
                            type: 'sprite_move',
                            inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 30 } } } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      ws,
    );
  });

  const before = await page.evaluate(() => (window as any).__kodakoStage.spriteState()[0]);
  await page.getByRole('button', { name: 'Jalankan' }).click();
  await page.waitForFunction(() => (window as any).__kodakoStage.isRunning() === false, null, { timeout: 5000 });
  const after = await page.evaluate(() => (window as any).__kodakoStage.spriteState()[0]);
  // 4×(turn 90, move 30) returns to start-ish; assert it actually executed by direction wrapping back
  expect(after).not.toEqual(before);

  await page.getByRole('button', { name: 'Stop' }).click();
  await page.waitForTimeout(500); // debounced autosave
  await page.reload();
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  const blockCount = await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    return B.getMainWorkspace().getAllBlocks(false).length;
  });
  expect(blockCount).toBeGreaterThan(3);
});
```
> The editor must expose `window.__kodakoBlockly` (the `Blockly` namespace) and `window.__kodakoStage` from Task 13/16 for the test. Keep both behind `if (import.meta.env.DEV || <always>)` — they leak nothing sensitive and the app is offline-only.

- [ ] **Step 2: Run `npm run test:e2e`** — expect 3 passing (2 existing + this one). Fix flakes with `waitForFunction`, not fixed sleeps (except the one documented debounce wait).

- [ ] **Step 3: Tick `docs/ROADMAP.md` Fase 1 checkboxes** that are now done; leave `audio.ts` and full-Sensor items noted as deferred (add a line under the checklist: "Ditunda ke Fase 3: `audio.ts` + kategori Suara, Sensor tabrakan/mouse, tema Scratch penuh, aset CC0 asli.").

- [ ] **Step 4: Full gate** — `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e` all green. `git status --porcelain` clean.

- [ ] **Step 5: Commit** — `test(e2e): sprite-mode green-flag flow; mark Fase 1 roadmap items`

---

## Self-Review

**1. Spec coverage — `docs/ROADMAP.md` "Fase 1" deliverables → tasks**

| ROADMAP deliverable | Task(s) |
|---|---|
| Blockly + locale `id` + tema "rasa Scratch" (`blocks/theme.ts`) | 1 |
| `blocks/sprite/blocks.ts` + `toolbox.ts` (MVP categories) | 3 |
| `blocks/sprite/generator.ts` (workspace → JS, `ulangi terus` + yield) | 4 |
| `runtime/sprite/sprite.ts` (pure model + ops) | 2 |
| `runtime/sprite/stage.ts` (Canvas renderer + hit-test) | 11 |
| `runtime/sprite/interpreter.ts` (JS-Interpreter wrap + node→block map) | 7 |
| `runtime/sprite/scheduler.ts` (per-frame threads + loop safety + highlight) | 8 |
| `runtime/sprite/api.ts` (gerak/tampilan/kontrol/kejadian/sensor ringan) | 6 |
| `runtime/sprite/event-bus.ts` (greenFlag/spriteClicked/keyPressed/broadcast + AndWait) | 9 |
| Editor Sprite mode: sprite panel + costume panel + Bendera Hijau & Stop | 13, 14 |
| `runtime/sprite/assets.ts` (+ upload ≤2 MB); **`audio.ts` DEFERRED** | 10 (audio noted deferred in Global Constraints 9 + Task 16 Step 3) |
| Autosave scripts + state + stage thumbnail | 12 (state), 13 (thumbnail into `saveProject`) |
| Tests: generator snapshot + model; integration fixture→N frames→assert; E2E green flag | 4, 2, 8, 16 |

**"Definisi selesai" →** loop-4/turn/say sample runs with highlight (Tasks 4/7/8/13, E2E 16); `ulangi terus` doesn't freeze (Task 8 test); sprite-click hat (Tasks 9/13); multi-sprite persists across reload (Tasks 12/13, E2E 16). Covered.

**Gap accepted:** ROADMAP lists `audio.ts` under Fase 1; this plan defers it (no Sound blocks in the MVP set → nothing calls it). Recorded as a decision in Global Constraints 9 and written into ROADMAP in Task 16.

**2. Placeholder scan** — no "TBD"/"add error handling"/"similar to Task N". Tasks 5, 6, 9, 10, 11, 14 compress the Step 2/3 test-and-impl bodies into prose + explicit interface contracts + enumerated assertions rather than full code; each still names every function, type, and test case. Tasks 1–4, 7, 8, 12, 13, 16 carry full code for the novel/risky parts. Two tasks (4, 13) explicitly flag a Blockly-version / jsdom-capability uncertainty with a concrete fallback and "note it in the report" — that is a real instruction, not a deferral.

**3. Type/name consistency** — checked across tasks:
- `Sprite` shape (Task 2) is consumed unchanged by 5, 6, 8, 11, 12; `SpriteData` (existing) mapped via `runtimeSpriteFrom`/`applyRuntimeSprite` (Task 12) — no field drift.
- `DurationRequest` union (Task 6) is the sole park vocabulary used by 7 (`pending`) and 8 (`tick`).
- `ThreadInterpreter` (`step`/`state`/`pending`/`resume`) defined in 7, consumed in 8 and 9.
- `Scheduler` methods (`start`/`stopAll`/`stopSprite`/`stopOthers`/`tick`/`isRunning`/`threads`) defined in 8, consumed in 9 and 13.
- `SpriteEvents` (`greenFlag`/`spriteClicked`/`keyDown`/`keyUp`/`broadcast`/`broadcastAndWait`/`rebuild`) defined in 9, consumed in 13.
- Block `type` strings: the `SPRITE_BLOCK_TYPES` list (Task 3) is exactly the set the generator registers `forBlock` handlers for (Task 4) and the toolbox references (Task 3) — one source list, imported, not retyped.
- `resolveAssetUrl`/`BUILTIN_*` (Task 10) consumed by 11 and 13/14 with the same signatures.
- `renderSpriteMode(host, { project, markDirty, getThumbnail })` (Task 13) is what `editor-view.ts` calls (Task 13 modify step) — `getThumbnail` is the `{ current }` box, matched in both places.
- i18n keys added in Task 15 are the ones referenced by Tasks 13/14 (`editor.sprite.*`, `error.lastSprite`) — listed identically.

Fixes applied inline: unified the key-normalization rule (lowercase single chars, `Arrow*` verbatim, `' '` for space) between Tasks 5, 9, 13; made `getThumbnail` a mutable box rather than a bare function so `editor-view` and `sprite-mode` share it; pinned `sprite_stop` `this` scope to a generator-emitted `return;` (Task 4) so the scheduler needs no per-thread "this" handling.

---

## Deferred to later phases

- **Full Scratch block theme** (rounded shapes, custom renderer, icons) — Fase 3.
- **Sound**: `runtime/sprite/audio.ts`, the Suara block category, `mainkan suara …` — Fase 3.
- **Collision / mouse Sensor**: `menyentuh [tepi/sprite/warna]?`, `mouse ditekan?`, `jarak ke …`, `tanya/jawab` — Fase 3.
- **Real CC0 art** replacing the placeholder SVGs (costumes, backdrops, sounds) with attribution — Fase 3.
- **Tauri desktop build** (`tauri build`, real icons) — Fase 3, needs Rust + MSVC toolchain.
- **"kirim … dan tunggu" across sprites** is implemented minimally (poll for live receiver threads); a full Scratch-accurate wait-graph is out of scope.
