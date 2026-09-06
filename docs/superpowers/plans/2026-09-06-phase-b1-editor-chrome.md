# Fase B1 — Editor Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the editor's toolbox rail full-colour solid pills with an "open category merges into a washed flyout" state, give the editor chrome a restrained "playful-lite" pass, make the Run buttons icon-only, and fix the bug where zooming the workspace also scaled the toolbox flyout blocks.

**Architecture:** Two tiny new modules in `src/blocks/` — `flyout.ts` (a `KodakoVerticalFlyout` subclass pinning `getFlyoutScale()` to `1`, registered as the default vertical flyout) and `toolbox-wash.ts` (`attachToolboxWash(workspace)` — on `TOOLBOX_ITEM_SELECT` it sets `data-open` + a `--kodako-wash` custom property + an open-class on the injection div; CSS does the rest). Everything else is CSS: the rail restyle in `src/blocks/theme.css`, shared `--ed-*` chrome tokens in `src/app/editor/editor.css` consumed by the two mode stylesheets. Blockly blocks / renderer / theme are untouched.

**Tech Stack:** Blockly 11.2.2 (`zelos` renderer), Vite 6, TypeScript strict (`noUncheckedIndexedAccess` on), Vitest + jsdom, Playwright, Prettier + ESLint 9. No new npm deps, no CDN.

**Spec:** `docs/superpowers/specs/2026-09-06-phase-b1-editor-chrome-design.md`

## Global Constraints

- **No new npm dependencies. No CDN / no runtime network calls.**
- **Blockly blocks, the `zelos` renderer, and `spriteTheme` (`src/blocks/theme.ts`) are NOT changed.** Only the surrounding chrome + the flyout scale + the rail CSS.
- **Scope is the editor only.** Do NOT touch the Home page or the global `.btn` in `src/styles/base.css`.
- **Category colours** (verbatim from `src/blocks/theme.ts` `CATEGORY_COLORS`): `motion #4C97FF`, `looks #9966FF`, `sound #CF63CF`, `events #FFBF00`, `control #FFAB19`, `operators #59C059`, `sensing #5CB1D6`, `variables #FF8C1A`, `structure #1E88E5`, `content #43A047`, `style #8E24AA`.
- **Light categories** (label + glyph use ink `#2B2B38`, no text-shadow): **`events`, `control`, `sensing`**. Every other category: label is white with `text-shadow: 0 1px 2px rgb(0 0 0 / 35%)`, glyph fill white.
- **Flyout scale is pinned to `1`** — matches today's look at the default zoom.
- **Run buttons are icon-only** but keep `aria-label` and gain a `title`, both = `t('editor.sprite.run')` / `t('editor.html.run')` ("Jalankan"). Sprite uses a **green-flag SVG glyph**; HTML uses `▶`.
- **Formatting:** the code blocks here are not guaranteed Prettier-clean. After creating/editing any file in a task, run `npm run format` before that task's lint/commit step; a Prettier-only `lint` failure is fixed with `npm run format`, never by hand.
- **Commit trailers** — every commit message ends with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
  ```
- **Full gate (green before the PR):** `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`.

---

### Task 1: `flyout.ts` — pin the toolbox flyout scale

**Files:**
- Create: `src/blocks/flyout.ts`
- Modify: `src/blocks/index.ts`
- Test: `tests/unit/blocks-flyout.test.ts`

**Interfaces:**
- Consumes: `blockly/core`
- Produces:
  - `export class KodakoVerticalFlyout extends Blockly.VerticalFlyout` with `override getFlyoutScale(): number` → `1`
  - `export function registerKodakoFlyout(): void` — registers it as `FLYOUTS_VERTICAL_TOOLBOX` / `DEFAULT` with `allowOverrides = true`; safe to call more than once
  - `src/blocks/index.ts` calls `registerKodakoFlyout()` inside both `installSpriteBlockly()` and `installHtmlBlockly()`, and re-exports `KodakoVerticalFlyout`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/blocks-flyout.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import * as Blockly from 'blockly/core';
import { KodakoVerticalFlyout, registerKodakoFlyout } from '../../src/blocks/flyout';

describe('KodakoVerticalFlyout', () => {
  it('reports a fixed 1x flyout scale regardless of the workspace zoom', () => {
    const scale = KodakoVerticalFlyout.prototype.getFlyoutScale.call({
      targetWorkspace: { scale: 2.5 },
    });
    expect(scale).toBe(1);
  });

  it('registers as the default vertical-toolbox flyout, overriding the built-in', () => {
    const spy = vi.spyOn(Blockly.registry, 'register').mockImplementation(() => {});
    registerKodakoFlyout();
    expect(spy).toHaveBeenCalledWith(
      Blockly.registry.Type.FLYOUTS_VERTICAL_TOOLBOX,
      Blockly.registry.DEFAULT,
      KodakoVerticalFlyout,
      true,
    );
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run it — must fail**

Run: `npm test -- blocks-flyout`
Expected: FAIL — cannot find module `../../src/blocks/flyout`.

- [ ] **Step 3: Write `src/blocks/flyout.ts`**

```ts
import * as Blockly from 'blockly/core';

/**
 * A vertical toolbox flyout whose block previews always render at 1x, no matter
 * how the main workspace is zoomed. Blockly's stock flyout returns
 * `this.targetWorkspace.scale` from `getFlyoutScale()`, so zooming the canvas
 * blew up the flyout too — see
 * docs/superpowers/specs/2026-09-06-phase-b1-editor-chrome-design.md §4.
 */
export class KodakoVerticalFlyout extends Blockly.VerticalFlyout {
  override getFlyoutScale(): number {
    return 1;
  }
}

/**
 * Make KodakoVerticalFlyout the default vertical-toolbox flyout. Idempotent:
 * registered with `allowOverrides = true`, so calling it once per Blockly
 * install is harmless.
 */
export function registerKodakoFlyout(): void {
  Blockly.registry.register(
    Blockly.registry.Type.FLYOUTS_VERTICAL_TOOLBOX,
    Blockly.registry.DEFAULT,
    KodakoVerticalFlyout,
    true,
  );
}
```

- [ ] **Step 4: Wire into `src/blocks/index.ts`**

Add the import near the other block imports:

```ts
import { registerKodakoFlyout } from './flyout';
```

Add the re-export near the other `export {...}` lines:

```ts
export { KodakoVerticalFlyout } from './flyout';
```

In `installSpriteBlockly()`, add `registerKodakoFlyout();` as the first line inside the `if (spriteInstalled) return;` guard body (after the guard, before `Blockly.setLocale`). Do the same in `installHtmlBlockly()`.

- [ ] **Step 5: Run the test — must pass**

Run: `npm test -- blocks-flyout`
Expected: PASS (2 tests).

- [ ] **Step 6: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/blocks/flyout.ts src/blocks/index.ts tests/unit/blocks-flyout.test.ts
git commit -m "fix(editor): pin toolbox flyout scale to 1x (stop it zooming with the canvas)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 2: `toolbox-wash.ts` — flyout tint + open-category class

**Files:**
- Create: `src/blocks/toolbox-wash.ts`
- Test: `tests/unit/blocks-toolbox-wash.test.ts`

**Interfaces:**
- Consumes: `blockly/core`, DOM
- Produces:
  - `export function paleWash(hex: string, alpha: number): string` — `#RRGGBB` (or `RRGGBB`) → `rgba(r, g, b, alpha)`; junk input → `rgba(120, 130, 150, alpha)`
  - `export function attachToolboxWash(workspace: Blockly.WorkspaceSvg): () => void` — adds a change listener; on `Blockly.Events.TOOLBOX_ITEM_SELECT` sets `data-open="true"` + `--kodako-wash` on `workspace.getInjectionDiv()` and adds class `kodako-cat--open` to the selected category's div; returns a disposer that removes the listener and clears all three. No-op (returns a no-op disposer) when there is no toolbox; never throws.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/blocks-toolbox-wash.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import { attachToolboxWash, paleWash } from '../../src/blocks/toolbox-wash';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('paleWash', () => {
  it('converts #RRGGBB to rgba at the given alpha', () => {
    expect(paleWash('#4C97FF', 0.12)).toBe('rgba(76, 151, 255, 0.12)');
    expect(paleWash('4c97ff', 0.5)).toBe('rgba(76, 151, 255, 0.5)');
  });
  it('falls back to a neutral wash for junk input', () => {
    expect(paleWash('nope', 0.1)).toBe('rgba(120, 130, 150, 0.1)');
  });
});

function harness(item: unknown) {
  document.body.innerHTML =
    '<div class="injectionDiv"><div class="kodako-cat kodako-cat--events"></div></div>';
  const root = document.querySelector<HTMLElement>('.injectionDiv')!;
  const catDiv = document.querySelector<HTMLElement>('.kodako-cat')!;
  let listener: ((e: { type: string }) => void) | null = null;
  const ws = {
    getInjectionDiv: () => root,
    getToolbox: () => (item === null ? null : { getSelectedItem: () => item }),
    addChangeListener: (fn: (e: { type: string }) => void) => {
      listener = fn;
    },
    removeChangeListener: () => {
      listener = null;
    },
  } as unknown as Blockly.WorkspaceSvg;
  return { root, catDiv, ws, fire: (type: string) => listener?.({ type }) };
}

describe('attachToolboxWash', () => {
  it('sets data-open + --kodako-wash + open class on a category select', () => {
    const item = {
      getColour: () => '#FFBF00',
      getDiv: () => document.querySelector('.kodako-cat'),
    };
    const h = harness(item);
    const dispose = attachToolboxWash(h.ws);

    h.fire(Blockly.Events.TOOLBOX_ITEM_SELECT);
    expect(h.root.getAttribute('data-open')).toBe('true');
    expect(h.root.style.getPropertyValue('--kodako-wash')).toBe('rgba(255, 191, 0, 0.12)');
    expect(h.catDiv.classList.contains('kodako-cat--open')).toBe(true);

    dispose();
    expect(h.root.hasAttribute('data-open')).toBe(false);
    expect(h.catDiv.classList.contains('kodako-cat--open')).toBe(false);
  });

  it('ignores non-select events', () => {
    const item = { getColour: () => '#FFBF00', getDiv: () => document.querySelector('.kodako-cat') };
    const h = harness(item);
    attachToolboxWash(h.ws);
    h.fire('move');
    expect(h.root.hasAttribute('data-open')).toBe(false);
  });

  it('is a no-op and does not throw when the workspace has no toolbox', () => {
    const h = harness(null);
    expect(() => attachToolboxWash(h.ws)()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it — must fail**

Run: `npm test -- blocks-toolbox-wash`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/blocks/toolbox-wash.ts`**

```ts
import * as Blockly from 'blockly/core';

const OPEN_CLASS = 'kodako-cat--open';

/** `#RRGGBB` (or bare `RRGGBB`) → `rgba(r, g, b, alpha)`. Junk → a neutral wash. */
export function paleWash(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return `rgba(120, 130, 150, ${alpha})`;
  const n = parseInt(match[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

interface ColouredItem {
  getColour?: () => string;
  getDiv?: () => Element | null;
}

/**
 * "Open category" visual glue. On `TOOLBOX_ITEM_SELECT`, tint the flyout to a
 * pale wash of the selected category's colour (`--kodako-wash` on the injection
 * div), flag it with `data-open`, and put `kodako-cat--open` on that category's
 * container (CSS then merges it into the flyout and dims the rest). Returns a
 * disposer. No-op when the workspace has no toolbox; never throws.
 */
export function attachToolboxWash(workspace: Blockly.WorkspaceSvg): () => void {
  const root = workspace.getInjectionDiv() as HTMLElement | null;
  const toolbox = workspace.getToolbox();
  if (!root || !toolbox) return () => {};

  const clearOpen = (): void => {
    for (const el of Array.from(root.querySelectorAll(`.${OPEN_CLASS}`))) {
      el.classList.remove(OPEN_CLASS);
    }
  };
  const clearAll = (): void => {
    clearOpen();
    root.removeAttribute('data-open');
    root.style.removeProperty('--kodako-wash');
  };

  const onEvent = (event: Blockly.Events.Abstract): void => {
    if (event.type !== Blockly.Events.TOOLBOX_ITEM_SELECT) return;
    clearOpen();
    const item = toolbox.getSelectedItem() as ColouredItem | null;
    if (!item || typeof item.getColour !== 'function') {
      root.removeAttribute('data-open');
      root.style.removeProperty('--kodako-wash');
      return;
    }
    root.style.setProperty('--kodako-wash', paleWash(item.getColour(), 0.12));
    root.setAttribute('data-open', 'true');
    const div = item.getDiv?.();
    (div instanceof HTMLElement ? div : div?.closest?.('.kodako-cat'))?.classList.add(OPEN_CLASS);
  };

  workspace.addChangeListener(onEvent);
  return () => {
    workspace.removeChangeListener(onEvent);
    clearAll();
  };
}
```

- [ ] **Step 4: Run the test — must pass**

Run: `npm test -- blocks-toolbox-wash`
Expected: PASS (5 tests).

Note on `getDiv()`: `ToolboxCategory` exposes `getDiv(): Element | null` (returns the category's container element — the one that carries the `cssconfig.container` classes from Task 3). If a Blockly upgrade ever drops it, the `.closest('.kodako-cat')` branch and the fake in the test both still work.

- [ ] **Step 5: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/blocks/toolbox-wash.ts tests/unit/blocks-toolbox-wash.test.ts
git commit -m "feat(editor): toolbox-wash — tint the flyout + mark the open category

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 3: Category `cssconfig.container` + wire `attachToolboxWash` into both modes

**Files:**
- Modify: `src/blocks/sprite/toolbox.ts`
- Modify: `src/blocks/html/toolbox.ts`
- Modify: `src/app/editor/sprite-mode/sprite-mode.ts`
- Modify: `src/app/editor/html-mode/html-mode.ts`
- Modify: `tests/unit/blocks-sprite-toolbox.test.ts`
- Modify: `tests/unit/blocks-toolbox-icons.test.ts`

**Interfaces:**
- Consumes: `attachToolboxWash` (Task 2)
- Produces: every category now has `cssconfig: { container: 'blocklyToolboxCategory kodako-cat kodako-cat--<key>', icon: 'kodako-cat-icon kodako-cat-icon--<key>' }` (same `<key>` as the icon). Both modes call `attachToolboxWash(workspace)` after `Blockly.inject` and dispose it on teardown. Task 4's CSS keys off `.kodako-cat--<key>`.

- [ ] **Step 1: Update the toolbox tests first (they will fail)**

In `tests/unit/blocks-sprite-toolbox.test.ts`, extend the `Cat` type and add a case:

```ts
type Cat = {
  kind: string;
  name?: string;
  categorystyle?: string;
  custom?: string;
  cssconfig?: { icon?: string; container?: string };
};
```

```ts
  it('gives every category a matching rail container + icon class', () => {
    for (const category of categories) {
      const icon = category.cssconfig?.icon ?? '';
      const container = category.cssconfig?.container ?? '';
      expect(icon).toMatch(/^kodako-cat-icon kodako-cat-icon--[a-z]+$/);
      const key = icon.split('--')[1];
      expect(container).toBe(`blocklyToolboxCategory kodako-cat kodako-cat--${key}`);
    }
  });
```

In `tests/unit/blocks-toolbox-icons.test.ts`, extend its `Cat` type the same way and add, inside each of the two "every X category declares a kodako icon class" tests, a line:

```ts
      const key = c.cssconfig!.icon!.split('--')[1];
      expect(c.cssconfig?.container).toBe(`blocklyToolboxCategory kodako-cat kodako-cat--${key}`);
```

- [ ] **Step 2: Run — must fail**

Run: `npm test -- blocks-sprite-toolbox blocks-toolbox-icons`
Expected: FAIL — `container` is `undefined`.

- [ ] **Step 3: Add `container` to every category**

In `src/blocks/sprite/toolbox.ts` and `src/blocks/html/toolbox.ts`, for **every** category object, replace:

```ts
      cssconfig: { icon: 'kodako-cat-icon kodako-cat-icon--motion' },
```

with (matching the `--<key>` suffix per category):

```ts
      cssconfig: {
        container: 'blocklyToolboxCategory kodako-cat kodako-cat--motion',
        icon: 'kodako-cat-icon kodako-cat-icon--motion',
      },
```

Keys per category — sprite: `motion, looks, sound, events, control, sensing, operators, variables`; html: `structure, content, style`. The `Variabel` category (has `custom: 'VARIABLE'`) still gets the `cssconfig` block.

- [ ] **Step 4: Run — must pass**

Run: `npm test -- blocks-sprite-toolbox blocks-toolbox-icons`
Expected: PASS.

- [ ] **Step 5: Call `attachToolboxWash` in Sprite mode**

In `src/app/editor/sprite-mode/sprite-mode.ts`:
- import: add `attachToolboxWash` to the existing import from `'../../../blocks'` (check the exact relative path used for other blocks imports in this file and match it; `src/blocks/index.ts` must re-export it — add `export { attachToolboxWash } from './toolbox-wash';` to `src/blocks/index.ts`).
- after the workspace is created by `Blockly.inject` (the line assigning the inject result), add:
  ```ts
  const detachWash = attachToolboxWash(workspace);
  ```
- in the teardown/dispose function for this mode (where `detachAnimation?.()` and `workspace.dispose()` are called), add `detachWash();` before `workspace.dispose()`.

- [ ] **Step 6: Call `attachToolboxWash` in HTML mode**

Same edit in `src/app/editor/html-mode/html-mode.ts`: import `attachToolboxWash`, `const detachWash = attachToolboxWash(workspace);` after inject, `detachWash();` in the cleanup path (next to where the run-listener cleanup / `workspace.dispose()` lives).

- [ ] **Step 7: Format, typecheck, unit, commit**

```bash
npm run format
npm run typecheck
npm test -- blocks-sprite-toolbox blocks-toolbox-icons blocks-flyout blocks-toolbox-wash
git add src/blocks/sprite/toolbox.ts src/blocks/html/toolbox.ts src/blocks/index.ts \
  src/app/editor/sprite-mode/sprite-mode.ts src/app/editor/html-mode/html-mode.ts \
  tests/unit/blocks-sprite-toolbox.test.ts tests/unit/blocks-toolbox-icons.test.ts
git commit -m "feat(editor): per-category rail container class + wire toolbox-wash

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 4: `theme.css` — solid-pill rail + open-category state

**Files:**
- Modify: `src/blocks/theme.css`

**Interfaces:**
- Consumes: `.kodako-cat--<key>` on category containers (Task 3), `data-open` + `--kodako-wash` + `.kodako-cat--open` on the injection div (Task 2)
- Produces: the finished rail look. No test (no jsdom toolbox render — verified in the coordinator visual QA, Task 6).

- [ ] **Step 1: Replace the rail section of `src/blocks/theme.css`**

Keep the top of the file (`.blocklyToolboxDiv` padding/radius/shadow, `.blocklyFlyout`, `.blocklyText`, `.blocklyMainBackground`, `.blocklyFlyoutButton`). Replace everything from the `/* Scratch-style category rail: … */` comment down to (but not including) `.blocklyFlyoutButton { min-height: 40px; }` with:

```css
/* ============================================================
   Category rail — full-colour solid pills.
   Row background = category colour via `.kodako-cat--<key>` (from each
   category's cssconfig.container). Glyph mask URIs mirror
   src/blocks/category-icons.ts (source of truth). The "open" category is
   marked by src/blocks/toolbox-wash.ts (`.kodako-cat--open` + `data-open` +
   `--kodako-wash` on `.injectionDiv`).
   ============================================================ */

.blocklyToolboxDiv .blocklyTreeRow {
  min-height: 44px;
  margin: 3px 4px;
  border-radius: 11px;
  color: #fff;
  font-weight: 700;
  transition:
    filter 0.1s ease,
    transform 0.1s ease,
    opacity 0.12s ease,
    border-radius 0.12s ease,
    margin 0.12s ease;
}

.blocklyToolboxDiv .blocklyTreeRowContentContainer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
}

.blocklyToolboxDiv .blocklyTreeLabel {
  text-shadow: 0 1px 2px rgb(0 0 0 / 35%);
}

/* glyph: sits directly on the pill now (no disc). Fill = white by default. */
.blocklyToolboxDiv .kodako-cat-icon {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  background-color: #fff;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}

/* pill colour per category */
.blocklyToolboxDiv .kodako-cat--motion .blocklyTreeRow { background: #4c97ff; }
.blocklyToolboxDiv .kodako-cat--looks .blocklyTreeRow { background: #9966ff; }
.blocklyToolboxDiv .kodako-cat--sound .blocklyTreeRow { background: #cf63cf; }
.blocklyToolboxDiv .kodako-cat--events .blocklyTreeRow { background: #ffbf00; }
.blocklyToolboxDiv .kodako-cat--control .blocklyTreeRow { background: #ffab19; }
.blocklyToolboxDiv .kodako-cat--sensing .blocklyTreeRow { background: #5cb1d6; }
.blocklyToolboxDiv .kodako-cat--operators .blocklyTreeRow { background: #59c059; }
.blocklyToolboxDiv .kodako-cat--variables .blocklyTreeRow { background: #ff8c1a; }
.blocklyToolboxDiv .kodako-cat--structure .blocklyTreeRow { background: #1e88e5; }
.blocklyToolboxDiv .kodako-cat--content .blocklyTreeRow { background: #43a047; }
.blocklyToolboxDiv .kodako-cat--style .blocklyTreeRow { background: #8e24aa; }

/* light categories: dark ink label + glyph, no text-shadow */
.blocklyToolboxDiv .kodako-cat--events .blocklyTreeRow,
.blocklyToolboxDiv .kodako-cat--control .blocklyTreeRow,
.blocklyToolboxDiv .kodako-cat--sensing .blocklyTreeRow {
  color: #2b2b38;
}
.blocklyToolboxDiv .kodako-cat--events .blocklyTreeLabel,
.blocklyToolboxDiv .kodako-cat--control .blocklyTreeLabel,
.blocklyToolboxDiv .kodako-cat--sensing .blocklyTreeLabel {
  text-shadow: none;
}
.blocklyToolboxDiv .kodako-cat--events .kodako-cat-icon,
.blocklyToolboxDiv .kodako-cat--control .kodako-cat-icon,
.blocklyToolboxDiv .kodako-cat--sensing .kodako-cat-icon {
  background-color: #2b2b38;
}

/* hover */
.blocklyToolboxDiv .kodako-cat:hover .blocklyTreeRow {
  filter: brightness(1.08);
  transform: translateX(2px);
}

/* open category: grows, loses its right corners, bleeds into the flyout */
.blocklyToolboxDiv .kodako-cat--open .blocklyTreeRow {
  border-radius: 11px 0 0 11px;
  margin-right: -12px;
  transform: scale(1.03);
  transform-origin: left center;
  position: relative;
  z-index: 2;
  box-shadow: -1px 3px 10px rgb(20 25 45 / 18%);
  filter: none;
}

/* dim the other pills while a drawer is open */
.blocklyToolboxDiv[data-open] .kodako-cat:not(.kodako-cat--open) .blocklyTreeRow {
  opacity: 0.82;
}

/* flyout tinted to a pale wash of the open category's colour */
.blocklyFlyoutBackground {
  fill: var(--kodako-wash, #eef0f5);
  transition: fill 0.15s ease;
}

.blocklyFlyoutButton {
  min-height: 40px;
}
```

- [ ] **Step 2: Verify the `data-open` selector target**

`src/blocks/toolbox-wash.ts` sets `data-open` / `--kodako-wash` on `workspace.getInjectionDiv()`. The CSS above uses `.blocklyToolboxDiv[data-open]` for the dim rule and a bare `.blocklyFlyoutBackground` for the wash (custom properties inherit from the injection div down into the flyout SVG). If `.blocklyToolboxDiv` is **not** the element carrying `data-open` (it is the injection div that gets it), change the dim selector to `.injectionDiv[data-open] .blocklyToolboxDiv .kodako-cat:not(.kodako-cat--open) .blocklyTreeRow`. Load the editor (`npm run dev`) and confirm in DevTools which element has `data-open` after clicking a category, then keep whichever selector matches. Adjust and note it in the commit.

- [ ] **Step 3: Build + quick visual check**

```bash
npm run format
npm run build
npm run dev   # open http://localhost:5173/editor.html#/ , new project
```
Confirm: every category row is a solid colour pill; `events`/`control`/`sensing` have dark text; hover brightens + nudges; clicking a category grows it, squares its right edge, tints the flyout, dims the others; the PR-7 glyphs still show (now white/ink, no disc).

- [ ] **Step 4: Commit**

```bash
git add src/blocks/theme.css
git commit -m "feat(editor): solid-pill toolbox rail with an open-drawer merge state

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 5: Playful-lite chrome + icon-only Run buttons

**Files:**
- Modify: `src/app/editor/editor.css`
- Modify: `src/app/editor/sprite-mode/sprite-mode.css`
- Modify: `src/app/editor/html-mode/html-mode.css`
- Modify: `src/app/editor/sprite-mode/sprite-mode.ts` (run-button markup)
- Modify: `src/app/editor/html-mode/html-mode.ts` (run-button markup)

**Interfaces:**
- Consumes: the mode markup from the existing files
- Produces: shared `--ed-*` tokens on `.editor`; the two mode stylesheets consume them; Run buttons are icon-only. No new test — covered by the E2E update in Task 6 + the coordinator visual QA.

- [ ] **Step 1: Add shared tokens + chrome rules to `src/app/editor/editor.css`**

At the top of `.editor { … }`, add the token block; then append the new rules. Full new `editor.css`:

```css
.editor {
  --ed-ink: #2b2b38;
  --ed-line: #e2e6f0;
  --ed-ground: #eef3ff;
  --ed-card: #ffffff;
  --ed-radius: 16px;
  --ed-shadow:
    0 1px 3px rgb(30 41 80 / 8%),
    0 6px 16px rgb(30 41 80 / 6%);
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.editor__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 2px solid var(--ed-line);
  background: var(--ed-card);
}
.editor__name {
  font: inherit;
  font-weight: 600;
  border: 2px solid transparent;
  border-radius: 10px;
  padding: 4px 8px;
  min-width: 180px;
}
.editor__name:hover,
.editor__name:focus {
  border-color: var(--ed-line);
}
.editor__spacer {
  flex: 1;
}
.editor__modes {
  display: flex;
  gap: 6px;
}
.editor .btn {
  border: 2px solid var(--ed-line);
  border-radius: 999px;
  box-shadow: var(--ed-shadow);
}
.editor__modes .btn[aria-pressed='true'] {
  background: #4c97ff;
  border-color: #4c97ff;
  color: #fff;
}
.editor__workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  color: #6b7280;
  background: var(--ed-ground);
}
.editor__workspace:has(.sprite-mode),
.editor__workspace:has(.html-mode) {
  place-items: stretch;
  overflow: hidden;
}
```

- [ ] **Step 2: `sprite-mode.css` — consume the tokens + icon Run button**

Make these replacements (leave everything else untouched):

- In `.sprite-mode { … }`: delete the local `--sprite-line: #d8deec;` line; add `--sprite-line: var(--ed-line);` (keep `--sprite-ink`, `--sprite-panel`, `--sprite-green`). Change `background: #eef1f7;` → `background: var(--ed-ground);`.
- `#blocklyDiv`, `.sprite-stage-card`, `.sprite-inspector`: change `border: 1px solid var(--sprite-line);` → `border: 2px solid var(--sprite-line);`, `border-radius: 14px;` → `border-radius: var(--ed-radius);`, and the `box-shadow: 0 8px 24px rgb(42 56 90 / 8%);` → `box-shadow: var(--ed-shadow);`.
- `.sprite-stage-toolbar button, .sprite-tabs button, .sprite-panel__add, .sprite-chip`: `border: 1px solid var(--sprite-line);` → `border: 2px solid var(--sprite-line);`, `border-radius: 9px;` → `border-radius: 12px;`.
- Add a rule for the icon Run button:
  ```css
  .sprite-stage-toolbar [data-green-flag] {
    flex: 0 0 auto;
    width: 46px;
    min-width: 46px;
    padding: 0;
    display: grid;
    place-items: center;
  }
  .sprite-stage-toolbar [data-green-flag] svg {
    width: 20px;
    height: 20px;
  }
  .sprite-stage-toolbar [data-stop] {
    flex: 1;
  }
  ```
  (The existing `.sprite-stage-toolbar [data-green-flag] { flex: 1; border-color…; background…; color…; font-weight… }` rule stays — the new `flex: 0 0 auto` / `width` override it because it comes later; keep the green background + border colour.)

- [ ] **Step 3: `sprite-mode.ts` — green-flag glyph, no text**

Replace the green-flag button line (currently `sprite-mode.ts:81`):

```ts
            <button type="button" data-green-flag aria-label="${t('editor.sprite.run')}">▶ ${t('editor.sprite.run')}</button>
```

with:

```ts
            <button type="button" data-green-flag aria-label="${t('editor.sprite.run')}" title="${t('editor.sprite.run')}">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 3v18" fill="none" stroke="#1f3b2e" stroke-width="2.4" stroke-linecap="round"/>
                <path d="M7 4c3-2 6 2 9 0v8c-3 2-6-2-9 0z" fill="#20a464" stroke="#1f3b2e" stroke-width="1.6" stroke-linejoin="round"/>
              </svg>
            </button>
```

**Leave the Stop button on the next line exactly as it is** (`■` + text) — only the Run button goes icon-only per the spec.

- [ ] **Step 4: `html-mode.css` — tokens + icon Run button**

- In `.html-mode { … }`: `--html-line: #cfdde4;` → `--html-line: var(--ed-line);` (keep `--html-ink`, `--html-paper`, `--html-blue`, `--html-green`). `background: #edf4f6;` → `background: var(--ed-ground);`.
- `#htmlBlocklyDiv, .html-mode__output`: `border: 1px solid var(--html-line);` → `2px solid var(--html-line);`, `border-radius: 14px;` → `var(--ed-radius);`, `box-shadow: 0 10px 28px rgb(30 72 90 / 9%);` → `var(--ed-shadow);`.
- `.html-mode__tabs button, .html-mode__actions button, .html-mode__upload`: `border: 1px solid var(--html-line);` → `2px solid var(--html-line);`, `border-radius: 9px;` → `12px;`.
- Replace the whole `.html-mode__run { … }` rule with:
  ```css
  .html-mode__run {
    width: 44px;
    height: 40px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 2px solid var(--html-green);
    border-radius: 12px;
    background: var(--html-green);
    color: #fff;
    font: inherit;
    font-size: 1rem;
    cursor: pointer;
    justify-self: start;
  }
  ```
  (`.html-mode__run:focus-visible` rule stays.)

- [ ] **Step 5: `html-mode.ts` — `▶` only, add aria-label + title**

Replace (currently `html-mode.ts:73`):

```ts
          <button type="button" class="html-mode__run" data-run-html>▶ ${t('editor.html.run')}</button>
```

with:

```ts
          <button type="button" class="html-mode__run" data-run-html aria-label="${t('editor.html.run')}" title="${t('editor.html.run')}">▶</button>
```

- [ ] **Step 6: Format, build, visual check**

```bash
npm run format
npm run build
npm run dev
```
Confirm both modes: 2px borders + bigger radii + soft shadows (no chunky lip); warm-tint ground; pill header buttons; Sprite Run button shows a small green flag only (tooltip on hover); HTML Run button shows `▶` only.

- [ ] **Step 7: Commit**

```bash
git add src/app/editor/editor.css src/app/editor/sprite-mode/sprite-mode.css \
  src/app/editor/html-mode/html-mode.css src/app/editor/sprite-mode/sprite-mode.ts \
  src/app/editor/html-mode/html-mode.ts
git commit -m "feat(editor): playful-lite chrome + icon-only Run buttons

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 6: E2E, docs, full gate, PR

**Files:**
- Modify: `tests/e2e/polish.spec.ts`
- Modify: `docs/Design.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Extend the Zelos E2E test with a zoom check**

In `tests/e2e/polish.spec.ts`, at the end of the `'the themed (Zelos) sprite workspace still loads a block and runs it'` test (after the existing assertions), append:

```ts
  // Zooming the canvas must not break or resize the toolbox rail.
  const railBefore = await page.locator('.blocklyToolboxDiv').boundingBox();
  await page.locator('.blocklyZoom > image').first().click(); // zoom-in control
  await page.locator('.blocklyZoom > image').first().click();
  await expect(page.locator('.blocklyToolboxDiv')).toBeVisible();
  const railAfter = await page.locator('.blocklyToolboxDiv').boundingBox();
  expect(Math.abs((railAfter?.width ?? 0) - (railBefore?.width ?? 0))).toBeLessThan(2);
  // a category still opens
  await page.locator('.blocklyToolboxDiv .blocklyTreeRow').first().click();
  await expect(page.locator('.blocklyFlyout')).toBeVisible();
```

If `.blocklyZoom > image` is not the right selector for the zoom-in button in this Blockly build, inspect the rendered DOM (`npm run dev`) and use the correct one; the intent is "click zoom-in twice, assert the toolbox width is unchanged and a category still opens."

- [ ] **Step 2: Run E2E**

Run: `npm run test:e2e`
Expected: 10 passed.

- [ ] **Step 3: `docs/Design.md`**

Find the toolbox / "rasa Scratch" description (around §4.3 or the theme section) and add a short paragraph:

```markdown
Rail kategori toolbox (Fase B1): tiap kategori adalah pil warna penuh
(warna dari `CATEGORY_COLORS`), label/glyph putih atau ink `#2B2B38`
menurut kontras. Kategori yang dibuka membesar dan "menyatu" dengan
flyout yang di-*wash* warna kategori; kategori lain diredupkan — digerakkan
oleh `src/blocks/toolbox-wash.ts` pada event `TOOLBOX_ITEM_SELECT`.
Blok pratinjau di flyout dikunci skala 1× (`src/blocks/flyout.ts`,
`KodakoVerticalFlyout`) supaya zoom workspace tidak ikut memperbesarnya.
Chrome editor: token `--ed-*` di `editor.css` (border 2px, sudut 16px,
bayangan halus, tombol pil). Tombol jalankan = ikon saja (bendera hijau
di Sprite, `▶` di HTML) dengan `aria-label` + `title`.
```

- [ ] **Step 4: `docs/ROADMAP.md`**

Under the Fase 3 "Perbaikan UX pasca-rilis" area, add a line:

```markdown
Fase B1 (2026-09-06): rail kategori jadi pil warna penuh + state
"drawer terbuka" menyatu ke flyout, chrome editor "playful-lite", tombol
jalankan ikon saja, dan perbaikan bug zoom-workspace-memperbesar-flyout.
Lihat `docs/superpowers/specs/2026-09-06-phase-b1-editor-chrome-design.md`.
```

- [ ] **Step 5: Full gate**

```bash
npm run format
npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e
```
Expected: all green. Unit count = previous + 7 (Task 1 +2, Task 2 +5). E2E = 10. `check:chunks` OK (editor entry chunk grows ~1–2 kB, well under 400 kB).

- [ ] **Step 6: Commit + PR**

```bash
git add tests/e2e/polish.spec.ts docs/Design.md docs/ROADMAP.md
git commit -m "test(editor): e2e zoom/rail check + docs for Fase B1

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
git push -u origin phase-b1-editor-chrome
gh pr create --base main --head phase-b1-editor-chrome \
  --title "Fase B1: editor chrome — colour rail, playful-lite, flyout-zoom fix" \
  --body "Implements docs/superpowers/specs/2026-09-06-phase-b1-editor-chrome-design.md. Solid-pill toolbox rail with an open-drawer merge state (toolbox-wash.ts); KodakoVerticalFlyout pins the flyout scale to 1x so canvas zoom no longer resizes the flyout; playful-lite chrome via shared --ed-* tokens; icon-only Run buttons (green flag / play, aria-label + title kept). Blocks/renderer/theme untouched; Home page untouched. Full gate green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
| --- | --- |
| §1 rail: solid pills per `.kodako-cat--<key>` | Task 3 (container class) + Task 4 (CSS) |
| §1 label/glyph contrast (white / ink `#2B2B38`, text-shadow) | Task 4 (explicit `events`/`control`/`sensing` = ink) |
| §1 hover (brighten + nudge) | Task 4 |
| §1 open category: grow + square right edge + flyout wash + dim others | Task 2 (`attachToolboxWash`) + Task 4 (CSS) |
| §1 `paleWash(hex, a)` helper | Task 2 |
| §2 `--ed-*` tokens, 2px borders, radius 16, subtle shadow, pill buttons | Task 5 |
| §2 mode CSS switch to tokens, keep accents | Task 5 steps 2 & 4 |
| §2 blocks / Home / base.css `.btn` untouched | not modified in any task |
| §3 Run buttons icon-only, aria-label + title, green flag (Sprite) / `▶` (HTML) | Task 5 steps 3 & 5 |
| §4 `KodakoVerticalFlyout.getFlyoutScale()` → 1, registered default | Task 1 |
| §4 `registerKodakoFlyout()` in both `install*Blockly()` | Task 1 step 4 |
| Unit & boundary table | Tasks 1–5 create exactly those files |
| Testing section | Task 1, Task 2, Task 3 (toolbox tests), Task 6 (e2e) |
| Out of scope (resize panels, blocks, Home, HTML block model) | nothing here touches them |

No gaps.

**2. Placeholder scan** — every code step has real code; every test step has real assertions. The two "inspect the DOM and confirm the selector" steps (Task 4 step 2, Task 6 step 1) are deliberate verification steps with a concrete fallback selector given, not placeholders.

**3. Type consistency** — `attachToolboxWash(workspace: Blockly.WorkspaceSvg): () => void` and `paleWash(hex: string, alpha: number): string` are identical in Task 2's definition, its interface block, Task 3's usage, and the self-review. `KodakoVerticalFlyout` / `registerKodakoFlyout()` identical across Task 1 and its re-export in `index.ts`. The `cssconfig.container` string `blocklyToolboxCategory kodako-cat kodako-cat--<key>` is identical in Task 3's toolbox edit, both updated tests, and Task 4's CSS selectors (`.kodako-cat--<key>`, `.kodako-cat--open`, `.kodako-cat:not(.kodako-cat--open)`). `--kodako-wash` and `data-open` are written by Task 2 and read by Task 4's CSS with matching names.
