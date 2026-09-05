# Scratch-Familiar Editor UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the block editor feel familiar to Scratch users — real HTML tags on blocks, a Scratch-style category rail, Scratch-Indonesia category names/order — and fix the "Lihat Kode kosong" bug by removing the draggable `html_page` root block.

**Architecture:** Five independent changes. (1) Rename/reorder sprite toolbox categories (UI grouping only, no runtime touch). (2) Drop the `html_page` block entirely: top-level blocks in the HTML canvas become the `<body>`; `generateHtml` walks every top-level block instead of one page root; a pure JSON migration lifts children out of any legacy `html_page` on load. (3) Rewrite HTML block `message0` strings to show real tags (`<section>` … `</section>`, `<p> … </p>`, `<img src= … >`); field names are untouched so the generator and snapshots still match. (4) Add a green **Jalankan** button to HTML mode; preview + code panel refresh only on click, not on every edit. (5) Restyle both toolboxes via CSS + a hand-authored inline-SVG icon map — no continuous-scroll flyout, no new deps.

**Tech Stack:** Blockly 11.2.2 (`zelos` renderer, shared `spriteTheme`), vanilla TypeScript (strict), Vitest + jsdom, Playwright, plain CSS. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-05-scratch-familiar-editor-ux-design.md` (read it first — this plan argues from it). Related: `docs/PRD.md` §6 (fitur per mode), `docs/Design.md` §4.3/§4.4 (block sets), `docs/ROADMAP.md` Fase 3.

## Global Constraints

Every task's requirements implicitly include this section.

1. **Bahasa Indonesia** for every user-facing string. New strings go in `src/app/i18n/id.json` and are read via `t()`. Block `message0` strings that are *HTML tags* (`<section>`, `<p>`, …) are code notation, not prose — those stay literal. Non-tag words in block labels stay Indonesian (`warna teks`, `rata`, `tebal`, `alt`, `href`).
2. **No new npm dependencies, no CDN.** Category glyphs are hand-authored inline SVG strings in a committed TS module, embedded as `data:image/svg+xml,...` URIs. No icon library.
3. **TypeScript strict** (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `noImplicitOverride`). Use `import type` / inline `type`. **No `any` in product code** (test files may use the existing `as unknown as` bridges already present).
4. **Blockly stays pinned at `blockly@11.2.2`.** Renderer `zelos`, theme `spriteTheme` (from `src/blocks/theme.ts`) — both modes share it. Do not add a second theme or change the renderer.
5. **HTML block field names are frozen:** `TEXT`, `LEVEL`, `ASSET`, `ALT`, `URL`, `LABEL`, `VALUE`, `BODY`, `ITEMS`. Only `message0` (and, for `html_heading`, the dropdown *labels* — not its values `h1`/`h2`/`h3`) may change. `generator.ts` and every generator snapshot key off these names.
6. **`generateHtml(workspace)` return shape is frozen:** `{ bodyHtml: string; assetIds: string[] }`.
7. **Conventional Commits**, one focused commit as each task's final step. `.gitattributes` enforces `eol=lf`; run `npm run format` before committing if Prettier would complain. Verify `git status --porcelain` is clean before calling a task done. `git add` every new file.
8. **No regressions.** Baseline: **341 unit tests / 10 E2E** green, `main` @ `858e64b`. Editor entry chunk must stay **< 400 kB** (`npm run check:chunks`). Full gate before the plan is done: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`.
9. Product name **"Game HTML"** and repo name **Kodako-HTML** both stay as-is.

---

## Task 1: Sprite toolbox — Scratch-Indonesia category names & order

**Files:**
- Modify: `src/blocks/sprite/toolbox.ts` (reorder the `contents` array; rename one `name`)
- Test: `tests/unit/blocks-sprite-toolbox.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `spriteToolbox` (unchanged export) with `contents` in the order
  `Gerakan, Tampilan, Suara, Kejadian, Kontrol, Sensor, Operator, Variabel`
  and the motion category `name` = `'Gerakan'` (was `'Gerak'`). Each entry keeps
  its existing `categorystyle` and block list verbatim.

- [ ] **Step 1: Write the failing test** — `tests/unit/blocks-sprite-toolbox.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { spriteToolbox } from '../../src/blocks/sprite/toolbox';

type Cat = { kind: string; name?: string; categorystyle?: string; custom?: string };

const categories = (spriteToolbox as { contents: Cat[] }).contents;

describe('sprite toolbox', () => {
  it('lists categories in Scratch-Indonesia order', () => {
    expect(categories.map((c) => c.name)).toEqual([
      'Gerakan',
      'Tampilan',
      'Suara',
      'Kejadian',
      'Kontrol',
      'Sensor',
      'Operator',
      'Variabel',
    ]);
  });

  it('keeps the motion category style on the renamed Gerakan entry', () => {
    const motion = categories.find((c) => c.name === 'Gerakan');
    expect(motion?.categorystyle).toBe('motion_category');
  });

  it('keeps Variabel as the Blockly VARIABLE custom category', () => {
    const vars = categories.find((c) => c.name === 'Variabel');
    expect(vars?.custom).toBe('VARIABLE');
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run tests/unit/blocks-sprite-toolbox.test.ts`
Expected: FAIL — order is `Kejadian, Gerak, …`, name is `'Gerak'`.

- [ ] **Step 3: Edit `src/blocks/sprite/toolbox.ts`**

Reorder the objects inside `contents` to: motion, looks, sound, events, control, sensing, operators, variables. Change the motion category's `name: 'Gerak'` to `name: 'Gerakan'`. **Do not touch** any `contents`/`categorystyle`/block `type` inside the categories, and do not touch `src/blocks/sprite/blocks.ts` or generators.

- [ ] **Step 4: Run — PASS**

Run: `npx vitest run tests/unit/blocks-sprite-toolbox.test.ts`
Expected: PASS.

- [ ] **Step 5: Regression check**

Run: `npx vitest run` — Expected: 341 prior + 3 new all green (nothing else asserts category order/name; verified against the tree at `858e64b`).

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/blocks/sprite/toolbox.ts tests/unit/blocks-sprite-toolbox.test.ts
git commit -m "feat(editor): align sprite category names and order with Scratch Indonesia"
```

---

## Task 2: Remove the `html_page` root block; generator walks all top-level blocks

This is the bug fix. `generateHtml` currently does
`getTopBlocks(false).find((b) => b.type === 'html_page')` and emits only that
one page's `BODY`. Two `html_page` blocks (the toolbox lets you drag a second)
→ the empty one can win → preview *and* Lihat Kode go blank.

**Files:**
- Modify: `src/blocks/html/blocks.ts` — delete the `html_page` object from the `defineBlocksWithJsonArray` array; remove `'html_page'` from `HTML_BLOCK_TYPES`.
- Modify: `src/blocks/html/toolbox.ts` — delete `{ kind: 'block', type: 'html_page' }` from the Struktur category.
- Modify: `src/blocks/html/generator.ts` — `generateHtml` walks every top-level block.
- Modify: `src/core/html-project.ts` — add `migrateHtmlWorkspaceJson`.
- Modify: `src/app/editor/html-mode/html-mode.ts` — call the migration before load; replace the `workspace.newBlock('html_page')` starter; add the empty-canvas hint.
- Test: `tests/unit/blocks-html-generator.test.ts`, `tests/unit/html-mode-view.test.ts`, `tests/unit/html-mode-persistence.test.ts`, `tests/unit/html-export.test.ts`, `tests/e2e/html-mode.spec.ts`.

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `HTML_BLOCK_TYPES` — the same tuple minus `'html_page'` (17 entries).
  - `generateHtml(workspace: Blockly.Workspace): { bodyHtml: string; assetIds: string[] }` — now emits, in `workspace.getTopBlocks(true)` order, `emitChain(block, 0, assetIds)` for **each** top-level block, concatenated. No `html_page` lookup. Empty workspace → `{ bodyHtml: '', assetIds: [] }`.
  - `migrateHtmlWorkspaceJson(raw: Record<string, unknown>): Record<string, unknown>` in `src/core/html-project.ts` — pure. If `raw.blocks.blocks` (array) contains any entry with `type === 'html_page'`, each such entry is replaced *in place* by the chain of blocks found at `entry.inputs.BODY.block` (following `.next` links), with the first lifted block taking the page entry's `x`/`y`. Entries without `html_page` are returned structurally unchanged. Idempotent. Never throws on missing keys — treat any missing/oddly-shaped node as "nothing to migrate" and return `raw` untouched.

- [ ] **Step 1: Write the failing generator tests** — rewrite `tests/unit/blocks-html-generator.test.ts` helpers and cases so blocks are created at top level (no `html_page`). Replace the `statement(workspace, 'html_page')` + `connectStatement(page, 'BODY', …)` scaffolding. Concretely:

  - Change the first test to:
    ```ts
    it('returns an empty result for an empty workspace', () => {
      expect(generateHtml(workspace)).toEqual({ bodyHtml: '', assetIds: [] });
    });
    ```
  - For every test that did `const page = statement(workspace, 'html_page'); … connectStatement(page, 'BODY', child);`, drop the page and leave `child` as a top-level block (Blockly makes a newly created statement block top-level automatically). Assertions on `bodyHtml` stay byte-identical (the emitted HTML did not change).
  - Replace the `it('uses only the first page root', …)` test with:
    ```ts
    it('concatenates every top-level block into the body', () => {
      const first = statement(workspace, 'html_paragraph');
      connectText(first, 'pertama');
      const second = statement(workspace, 'html_paragraph');
      connectText(second, 'kedua');
      // two separate top-level stacks, first placed above second
      first.moveBy(0, 0);
      second.moveBy(0, 100);
      expect(generateHtml(workspace).bodyHtml).toBe('<p>pertama</p>\n<p>kedua</p>\n');
    });
    ```
  - Add a migration test in the same file (or a new `tests/unit/html-project-migrate.test.ts` — either is fine; keep it with the other html-project helpers if that file has tests, else new):
    ```ts
    import { migrateHtmlWorkspaceJson } from '../../src/core/html-project';

    it('lifts children out of a legacy html_page block', () => {
      const legacy = {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_page',
              x: 20,
              y: 20,
              inputs: {
                BODY: {
                  block: {
                    type: 'html_paragraph',
                    inputs: { TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Halo' } } } },
                    next: { block: { type: 'html_hr' } },
                  },
                },
              },
            },
          ],
        },
      };
      const out = migrateHtmlWorkspaceJson(legacy) as typeof legacy;
      const top = out.blocks.blocks;
      expect(top.map((b: { type: string }) => b.type)).toEqual(['html_paragraph', 'html_hr']);
      expect(top[0]).toMatchObject({ x: 20, y: 20 });
      expect(migrateHtmlWorkspaceJson(out)).toEqual(out); // idempotent
    });

    it('returns unrelated json untouched', () => {
      const j = { blocks: { languageVersion: 0, blocks: [{ type: 'html_hr' }] } };
      expect(migrateHtmlWorkspaceJson(j)).toEqual(j);
      expect(migrateHtmlWorkspaceJson({})).toEqual({});
    });
    ```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: FAIL — `migrateHtmlWorkspaceJson` undefined; `html_page` still required by old asserts; new concat test fails.

- [ ] **Step 3: Remove `html_page` from the block set**

In `src/blocks/html/blocks.ts`: delete the `{ type: 'html_page', … }` object (the first element of the `defineBlocksWithJsonArray([...])` array). In `HTML_BLOCK_TYPES`, delete the `'html_page',` line. In `src/blocks/html/toolbox.ts`, delete the `{ kind: 'block', type: 'html_page' },` line from the `Struktur` category `contents`.

- [ ] **Step 4: Rewrite the generator walk**

In `src/blocks/html/generator.ts`, replace the body of `generateHtml`:

```ts
export function generateHtml(workspace: Blockly.Workspace): GeneratedHtml {
  const assetIds: string[] = [];
  let bodyHtml = '';
  for (const block of workspace.getTopBlocks(true)) {
    bodyHtml += emitChain(block, 0, assetIds);
  }
  return { bodyHtml, assetIds };
}
```

`emitChain` already follows `.getNextBlock()`, so passing each top-level block once is correct and does not double-emit a stack. `emitBlock`'s existing `default: return ''` covers any stray non-HTML block. Leave `emitChain`/`emitBlock`/`emitContainer` untouched.

- [ ] **Step 5: Add `migrateHtmlWorkspaceJson` to `src/core/html-project.ts`**

```ts
type BlockNode = { type?: string; next?: { block?: BlockNode }; inputs?: Record<string, { block?: BlockNode }>; x?: number; y?: number; [k: string]: unknown };

function chainToArray(head: BlockNode | undefined): BlockNode[] {
  const out: BlockNode[] = [];
  let node = head;
  while (node && typeof node === 'object') {
    const { next, ...rest } = node;
    out.push(rest as BlockNode);
    node = next?.block;
  }
  return out;
}

export function migrateHtmlWorkspaceJson(raw: Record<string, unknown>): Record<string, unknown> {
  const blocksHolder = (raw as { blocks?: { blocks?: unknown } }).blocks;
  const list = blocksHolder?.blocks;
  if (!Array.isArray(list) || !list.some((b) => (b as BlockNode)?.type === 'html_page')) {
    return raw;
  }
  const nextList: BlockNode[] = [];
  for (const entry of list as BlockNode[]) {
    if (entry?.type !== 'html_page') {
      nextList.push(entry);
      continue;
    }
    const lifted = chainToArray(entry.inputs?.BODY?.block);
    if (lifted[0]) {
      if (typeof entry.x === 'number') lifted[0].x = entry.x;
      if (typeof entry.y === 'number') lifted[0].y = entry.y;
    }
    nextList.push(...lifted);
  }
  return { ...raw, blocks: { ...blocksHolder, blocks: nextList } };
}
```

- [ ] **Step 6: Wire migration + starter + hint into `src/app/editor/html-mode/html-mode.ts`**

  - Import `migrateHtmlWorkspaceJson` from `../../../core/html-project` (alongside the existing `htmlWorkspaceJson`, `withHtmlWorkspace` import).
  - Change the load block (currently lines ~101-106):
    ```ts
    const savedWorkspace = migrateHtmlWorkspaceJson(htmlWorkspaceJson(project));
    if (Object.keys(savedWorkspace).length > 0) {
      Blockly.serialization.workspaces.load(savedWorkspace, workspace);
    }
    // no starter block — an empty canvas is valid now
    ```
  - Add the hint element right after `host.innerHTML = ...`. Inside the `.html-mode__blocks` section markup add, after `<div id="htmlBlocklyDiv"></div>`:
    ```html
    <p class="html-mode__hint" data-html-hint>${t('editor.html.canvasHint')}</p>
    ```
    and after `workspace` is created + loaded, add:
    ```ts
    const hint = host.querySelector<HTMLElement>('[data-html-hint]')!;
    const syncHint = (): void => {
      hint.hidden = workspace.getTopBlocks(false).length > 0;
    };
    syncHint();
    ```
    call `syncHint()` at the end of `onWorkspaceChange` (after `persist()`), and remove the hint listener in the cleanup path is not needed (it's a plain element removed by `host.replaceChildren()`).
  - Add i18n key in `src/app/i18n/id.json`: `"editor.html.canvasHint": "Seret blok dari kiri untuk membuat halaman."` (keep the file's alph/section ordering consistent with neighbors — it sits with the other `editor.html.*` keys).

- [ ] **Step 7: Fix the affected view/persistence/export unit tests**

  - `tests/unit/html-mode-view.test.ts`: replace the `addTextElement` helper's first line
    `const page = workspace.getBlocksByType('html_page', false)[0]!;` and the trailing
    `page.getInput('BODY')?.connection?.connect(element.previousConnection!);` — instead
    leave `element` as a top-level block:
    ```ts
    function addTextElement(workspace: Blockly.Workspace, type: string, value: string): void {
      const element = workspace.newBlock(type);
      const text = workspace.newBlock('html_text');
      text.setFieldValue(value, 'VALUE');
      element.getInput('TEXT')?.connection?.connect(text.outputConnection!);
    }
    ```
    In the `'refreshes preview and code with styles on every wrapped sibling'` test, delete the
    `const page = workspace.getBlocksByType('html_page', false)[0]!;` line and the final
    `page.getInput('BODY')?.connection?.connect(bold.previousConnection!);` — `bold` is already
    top-level. (The style-wrapper assertions are unchanged.)
    NOTE: the `'shows generated code…'` and `'refreshes…'` tests currently rely on
    `onWorkspaceChange` calling `refresh()`. Task 4 changes that. For **this** task, keep those
    tests working by having them click `[data-tab="code"]` *after* firing the change — they
    already do. Do not add a Jalankan click here; Task 4 owns that.
  - `tests/unit/html-mode-persistence.test.ts`: the test that does
    `const page = htmlWorkspace.newBlock('html_page'); …` — rewrite to create a top-level
    `html_paragraph` (with an `html_text` child) instead, and keep the
    `expect(htmlJson).toContain('html_page')` → change to
    `expect(htmlJson).toContain('html_paragraph')`. Add one case: a project whose stored
    `html.workspace` contains a legacy `html_page` renders (after `renderHtmlMode`) a workspace
    whose `getAllBlocks` contains the lifted child and **no** `html_page`.
  - `tests/unit/html-export.test.ts`: `const page = workspace.newBlock('html_page'); …` →
    create the content block(s) at top level; keep the exported-HTML assertions identical.

- [ ] **Step 8: Update the E2E fixture** — `tests/e2e/html-mode.spec.ts`

  In the `B.serialization.workspaces.load({...})` call, remove the outer `html_page` wrapper:
  the `blocks: [ … ]` array should contain the `html_heading` block (with its `next` chain to
  `html_style_bold` → `html_image_url`) directly as a top-level block with `x: 20, y: 20`.
  Everything downstream (`waitForFunction` on `__kodakoHtml.bodyHtml()`, the srcdoc polls, the
  Lihat Kode assertions, the export, the mode round-trips) stays the same — `bodyHtml` output
  is unchanged. Do **not** add a Jalankan interaction here yet (Task 4).

- [ ] **Step 9: Run the unit gate — PASS**

Run: `npx vitest run`
Expected: all green. Count is baseline − (removed page-root asserts) + (new concat + migration + persistence cases). Record the new totals in the task report.

- [ ] **Step 10: Run E2E — PASS**

Run: `npm run test:e2e`
Expected: 10/10 green.

- [ ] **Step 11: Commit**

```bash
npm run format
git add src/blocks/html/blocks.ts src/blocks/html/toolbox.ts src/blocks/html/generator.ts \
  src/core/html-project.ts src/app/editor/html-mode/html-mode.ts src/app/i18n/id.json \
  tests/unit/blocks-html-generator.test.ts tests/unit/html-mode-view.test.ts \
  tests/unit/html-mode-persistence.test.ts tests/unit/html-export.test.ts \
  tests/e2e/html-mode.spec.ts
# plus tests/unit/html-project-migrate.test.ts if you put migration there
git commit -m "fix(html): drop html_page root block; body is the top-level block stack"
```

---

## Task 3: HTML block labels show real tags

**Files:**
- Modify: `src/blocks/html/blocks.ts` — `message0` for the 11 structure/content blocks; the `html_heading` `LEVEL` dropdown *labels*.
- Modify: `src/blocks/html/toolbox.ts` — the `textShadow` default still applies; no structural change, but re-verify shadow wiring for `html_heading`/`html_paragraph`/`html_list_item`/`html_button` still uses input `TEXT`.
- Test: `tests/unit/blocks-html-defs.test.ts` (create).

**Interfaces:**
- Consumes: `HTML_BLOCK_TYPES` (17 entries) from Task 2.
- Produces: block definitions whose `message0` renders the tag notation from the spec table. Field names and the `LEVEL` values (`h1`/`h2`/`h3`), `ALIGN`, `SIZE`, `COLOR` values are all unchanged. `generator.ts` is not touched.

- [ ] **Step 1: Write the failing test** — `tests/unit/blocks-html-defs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import { installHtmlBlockly } from '../../src/blocks';

installHtmlBlockly();

function message0(type: string): string {
  const ws = new Blockly.Workspace();
  const b = ws.newBlock(type);
  // Blockly stores the raw message on the block def; read via inputList labels
  const parts = b.inputList.flatMap((i) => i.fieldRow.map((f) => f.getText?.() ?? ''));
  ws.dispose();
  return parts.join(' ');
}

describe('HTML block labels use real tags', () => {
  it('section is a <section> C-block', () => {
    expect(message0('html_section')).toContain('<section>');
    expect(message0('html_section')).toContain('</section>');
  });
  it('paragraph shows <p> … </p>', () => {
    const m = message0('html_paragraph');
    expect(m).toContain('<p>');
    expect(m).toContain('</p>');
  });
  it('list shows <ul> … </ul> and item shows <li> … </li>', () => {
    expect(message0('html_list')).toContain('<ul>');
    expect(message0('html_list_item')).toContain('<li>');
  });
  it('image shows <img src= … alt= … >', () => {
    const m = message0('html_image_url');
    expect(m).toContain('<img');
    expect(m).toContain('src=');
    expect(m).toContain('alt=');
  });
  it('link shows <a href= … > … </a>', () => {
    const m = message0('html_link');
    expect(m).toContain('<a href=');
    expect(m).toContain('</a>');
  });
  it('button shows <button> … </button>', () => {
    expect(message0('html_button')).toContain('<button>');
  });
  it('hr shows <hr>', () => {
    expect(message0('html_hr')).toContain('<hr>');
  });
  it('heading level dropdown labels are the h-tags', () => {
    const ws = new Blockly.Workspace();
    const b = ws.newBlock('html_heading');
    const dropdown = b.getField('LEVEL')!;
    const options = (dropdown as unknown as { getOptions: () => [string, string][] }).getOptions();
    expect(options.map((o) => o[0])).toEqual(['<h1>', '<h2>', '<h3>']);
    expect(options.map((o) => o[1])).toEqual(['h1', 'h2', 'h3']); // values unchanged
    ws.dispose();
  });
  it('style blocks keep friendly Indonesian labels', () => {
    expect(message0('html_style_color')).toContain('warna teks');
    expect(message0('html_style_bold')).toContain('tebal');
  });
});
```

If `getText()` on a dropdown field returns the *selected* label (it does — first option by default), the `html_heading` `message0` assertion via `message0()` would include `<h1>`; the dedicated dropdown test above is the authoritative one. Adjust the helper if a field type lacks `getText` — fall back to reading `b.toString()` which concatenates the rendered label.

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: FAIL — current labels are `bagian`, `paragraf`, etc.

- [ ] **Step 3: Rewrite `message0` in `src/blocks/html/blocks.ts`** per the spec table:

```ts
{ type: 'html_section',
  message0: '<section> %1 </section>',
  args0: [{ type: 'input_statement', name: 'BODY' }],
  previousStatement: null, nextStatement: null, style: 'structure_blocks' },

{ type: 'html_heading',
  message0: '%1 %2',
  args0: [
    { type: 'field_dropdown', name: 'LEVEL', options: [['<h1>', 'h1'], ['<h2>', 'h2'], ['<h3>', 'h3']] },
    { type: 'input_value', name: 'TEXT', check: 'String' },
  ],
  previousStatement: null, nextStatement: null, style: 'structure_blocks' },

{ type: 'html_paragraph',
  message0: '<p> %1 </p>',
  args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
  previousStatement: null, nextStatement: null, style: 'structure_blocks' },

{ type: 'html_list',
  message0: '<ul> %1 </ul>',
  args0: [{ type: 'input_statement', name: 'ITEMS' }],
  previousStatement: null, nextStatement: null, style: 'structure_blocks' },

{ type: 'html_list_item',
  message0: '<li> %1 </li>',
  args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
  previousStatement: null, nextStatement: null, style: 'structure_blocks' },

{ type: 'html_text',
  message0: '<> %1',
  args0: [{ type: 'field_input', name: 'VALUE', text: 'Tulis di sini' }],
  output: 'String', style: 'content_blocks' },

{ type: 'html_image_asset',
  message0: '<img src= %1 alt= %2 >',
  args0: [
    { type: 'field_dropdown', name: 'ASSET', options: () => getAssetOptions() },
    { type: 'field_input', name: 'ALT', text: '' },
  ],
  previousStatement: null, nextStatement: null, style: 'content_blocks' },

{ type: 'html_image_url',
  message0: '<img src= %1 alt= %2 >',
  args0: [
    { type: 'field_input', name: 'URL', text: 'https://' },
    { type: 'field_input', name: 'ALT', text: '' },
  ],
  previousStatement: null, nextStatement: null, style: 'content_blocks' },

{ type: 'html_link',
  message0: '<a href= %1 > %2 </a>',
  args0: [
    { type: 'field_input', name: 'URL', text: 'https://' },
    { type: 'field_input', name: 'LABEL', text: 'Tulis di sini' },
  ],
  previousStatement: null, nextStatement: null, style: 'content_blocks' },

{ type: 'html_button',
  message0: '<button> %1 </button>',
  args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
  previousStatement: null, nextStatement: null, style: 'content_blocks' },

{ type: 'html_hr',
  message0: '<hr>',
  previousStatement: null, nextStatement: null, style: 'content_blocks' },
```

Leave `html_style_color`, `html_style_bg`, `html_style_align`, `html_style_size`,
`html_style_bold`, `html_style_italic` **exactly as they are**.

- [ ] **Step 4: Run — PASS**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: PASS.

- [ ] **Step 5: Full unit + E2E regression**

Run: `npx vitest run && npm run test:e2e`
Expected: all green. Generator snapshots are unaffected (field names + emitted HTML unchanged). The E2E fixture builds blocks from serialization JSON (types/fields, not labels) so it is unaffected.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/blocks/html/blocks.ts tests/unit/blocks-html-defs.test.ts
git commit -m "feat(html): label blocks with real HTML tags"
```

---

## Task 4: HTML mode — "Jalankan" button, preview & code on-demand

**Files:**
- Modify: `src/app/editor/html-mode/html-mode.ts` — add the button; `onWorkspaceChange` no longer calls `refresh()`; button handler runs `refresh()` + activates the Pratinjau tab.
- Modify: `src/app/editor/html-mode/html-mode.css` — `.html-mode__run` button; `.html-mode__code` min-height + explicit color; `.html-mode__hint` style.
- Modify: `src/app/i18n/id.json` — `"editor.html.run": "Jalankan"`.
- Test: `tests/unit/html-mode-view.test.ts`, `tests/unit/i18n.test.ts`, `tests/e2e/html-mode.spec.ts`.

**Interfaces:**
- Consumes: `renderHtmlMode` (from Task 2, with migration + hint wired).
- Produces: a `[data-run-html]` button in `.html-mode__toolbar`; `refresh()` invoked only on button click and once on mount; `onWorkspaceChange` calls `persist()` + `syncHint()` only.

- [ ] **Step 1: Write/adjust failing tests** in `tests/unit/html-mode-view.test.ts`:

  - Update `'shows generated code for blocks in the workspace'`: after `addTextElement` + `fireChangeListener`, the code panel is still stale; clicking `[data-run-html]` then `[data-tab="code"]` shows `<p>Halo</p>`. Rewrite:
    ```ts
    it('renders preview and code only after Jalankan', () => {
      const host = document.createElement('div');
      const cleanup = renderHtmlMode(host, { project: createEmptyProject('X'), storage: new FakeStorage(), markDirty: vi.fn() });
      const workspace = __htmlModeHandle.current!.workspace;
      addTextElement(workspace, 'html_paragraph', 'Halo');
      workspace.fireChangeListener({ isUiEvent: false } as Blockly.Events.Abstract);

      // not yet run → code panel empty
      expect(host.querySelector('[data-panel="code"]')?.textContent ?? '').not.toContain('<p>Halo</p>');

      host.querySelector<HTMLButtonElement>('[data-run-html]')!.click();
      host.querySelector<HTMLButtonElement>('[data-tab="code"]')!.click();
      expect(host.querySelector('[data-panel="code"]')?.textContent).toContain('<p>Halo</p>');
      cleanup();
    });
    ```
  - Update `'refreshes preview and code with styles on every wrapped sibling'`: after building the blocks and `fireChangeListener` + `vi.advanceTimersByTime(300)`, add `host.querySelector<HTMLButtonElement>('[data-run-html]')!.click();` **before** the srcdoc / code assertions.
  - Add: `it('activates the Pratinjau tab on Jalankan', …)` — after a run, `[data-tab="preview"]` has `aria-selected="true"` and `[data-panel="preview"]` is not hidden.
  - Keep `'mounts Blockly, secure preview, tabs, and export controls'` and add `expect(host.querySelector('[data-run-html]')).toBeTruthy();`.

  In `tests/unit/i18n.test.ts`, add near the other `editor.html.*` asserts:
  ```ts
  expect(t('editor.html.run')).toBe('Jalankan');
  ```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run tests/unit/html-mode-view.test.ts tests/unit/i18n.test.ts`
Expected: FAIL — no `[data-run-html]`, no `editor.html.run`.

- [ ] **Step 3: Add the i18n key** — `src/app/i18n/id.json`: `"editor.html.run": "Jalankan",` with the other `editor.html.*` keys.

- [ ] **Step 4: Edit `src/app/editor/html-mode/html-mode.ts`**

  - In the `host.innerHTML` template, inside `.html-mode__toolbar`, **before** `.html-mode__tabs`, add:
    ```html
    <button type="button" class="html-mode__run" data-run-html>▶ ${t('editor.html.run')}</button>
    ```
  - After `const errorElement = …`, get the button and tab helpers (the `tabButtons`/`panels` arrays are defined further down — move the button wiring after them, or capture `activateTab('preview')` as a helper). Simplest: extract a helper from the existing `onTabClick` logic:
    ```ts
    const activateTab = (tab: 'preview' | 'code'): void => {
      for (const button of tabButtons) button.setAttribute('aria-selected', String(button.dataset.tab === tab));
      for (const panel of panels) panel.hidden = panel.dataset.panel !== tab;
    };
    ```
    and make `onTabClick` call `activateTab(selected.dataset.tab as 'preview' | 'code')`.
  - Add the run handler:
    ```ts
    const runButton = host.querySelector<HTMLButtonElement>('[data-run-html]')!;
    const onRun = (): void => { refresh(); activateTab('preview'); };
    runButton.addEventListener('click', onRun);
    ```
  - In `onWorkspaceChange`, **remove** the `refresh();` call; keep `persist();` and add `syncHint();`:
    ```ts
    const onWorkspaceChange = (event: Blockly.Events.Abstract): void => {
      if (event.isUiEvent || loadingWorkspace) return;
      persist();
      syncHint();
    };
    ```
  - Keep the single `refresh();` call near the end of `renderHtmlMode` (initial paint) — and keep the `refresh()` inside `onUpload` (an explicit user action, like Jalankan).
  - In the cleanup function, add `runButton.removeEventListener('click', onRun);`.

- [ ] **Step 5: Edit `src/app/editor/html-mode/html-mode.css`**

```css
.html-mode__run {
  min-height: 40px;
  padding: 8px 16px;
  border: 1px solid var(--html-green);
  border-radius: 10px;
  background: var(--html-green);
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  justify-self: start;
}

.html-mode__run:focus-visible {
  outline: 3px solid #80b9ff;
  outline-offset: 2px;
}

.html-mode__hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 24px;
  color: #6b8a99;
  font-size: 0.95rem;
  text-align: center;
  pointer-events: none;
}

.html-mode__blocks {
  position: relative; /* anchor for the hint overlay */
}

.html-mode__code {
  min-height: 240px;
  color: var(--html-ink);
}
```

(`.html-mode__code` already has `padding`/`background`; only add the two new declarations — merge, don't duplicate the selector if the linter complains, edit the existing rule.)

- [ ] **Step 6: Update the E2E** — `tests/e2e/html-mode.spec.ts`

  After the `B.serialization.workspaces.load(...)` call and before the `waitForFunction` on `bodyHtml()`, add:
  ```ts
  await page.getByRole('button', { name: 'Jalankan' }).click();
  ```
  The `waitForFunction(() => __kodakoHtml.bodyHtml()…)` still works (that hook reads the generator directly, not the panel). The srcdoc polls now reflect the post-Jalankan render. Add one assertion that the button exists:
  ```ts
  await expect(page.getByRole('button', { name: 'Jalankan' })).toBeVisible();
  ```
  After switching Sprite→HTML and back later in the test, the preview will be stale until another Jalankan — the existing later assertions only check block presence via `__kodakoBlockly`, not the panel, so no extra click is needed. If any srcdoc/code assertion runs after a mode round-trip, insert a `Jalankan` click before it.

- [ ] **Step 7: Run unit + E2E — PASS**

Run: `npx vitest run && npm run test:e2e`
Expected: all green.

- [ ] **Step 8: Manual check (dev server)**

Run `npm run dev`, open the editor, switch to Mode HTML. Verify: empty canvas shows the hint; dragging a `<p>` block hides it; the preview/code stay blank until **▶ Jalankan**; clicking Jalankan fills both and jumps to Pratinjau; the code panel is visibly non-empty with a real height. Note the result in the task report (screenshot not required).

- [ ] **Step 9: Commit**

```bash
npm run format
git add src/app/editor/html-mode/html-mode.ts src/app/editor/html-mode/html-mode.css \
  src/app/i18n/id.json tests/unit/html-mode-view.test.ts tests/unit/i18n.test.ts \
  tests/e2e/html-mode.spec.ts
git commit -m "feat(html): add Jalankan button; preview and code refresh on demand"
```

---

## Task 5: Scratch-style toolbox rail (both modes)

CSS + a hand-authored SVG icon map. Per-category flyout is kept (no continuous scroll). Applies to `spriteToolbox` and `htmlToolbox`.

**Files:**
- Create: `src/blocks/category-icons.ts` — SVG data-URI map.
- Modify: `src/blocks/theme.css` — rail rows, colour discs, selected tint, flyout spacing.
- Modify: `src/blocks/sprite/toolbox.ts` — add `cssconfig: { icon: '…' }` to each of the 8 categories.
- Modify: `src/blocks/html/toolbox.ts` — add `cssconfig: { icon: '…' }` to the 3 categories.
- Test: `tests/unit/blocks-toolbox-icons.test.ts` (create); extend `tests/unit/blocks-sprite-toolbox.test.ts`.

**Interfaces:**
- Consumes: `spriteToolbox` (Task 1 order), `htmlToolbox` (Task 2, no `html_page`).
- Produces:
  - `CATEGORY_ICON: Record<IconKey, string>` where `IconKey` is `'motion' | 'looks' | 'sound' | 'events' | 'control' | 'sensing' | 'operators' | 'variables' | 'structure' | 'content' | 'style'` and each value is a `data:image/svg+xml,<url-encoded 20x20 svg, single white path>` string.
  - Every category entry in both toolboxes carries `cssconfig: { icon: 'kodako-cat-icon kodako-cat-icon--<key>' }`.

- [ ] **Step 1: Write the failing test** — `tests/unit/blocks-toolbox-icons.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { spriteToolbox } from '../../src/blocks/sprite/toolbox';
import { htmlToolbox } from '../../src/blocks/html/toolbox';
import { CATEGORY_ICON } from '../../src/blocks/category-icons';

type Cat = { kind: string; cssconfig?: { icon?: string } };

it('every sprite category declares a kodako icon class', () => {
  for (const c of (spriteToolbox as { contents: Cat[] }).contents) {
    expect(c.cssconfig?.icon).toMatch(/^kodako-cat-icon kodako-cat-icon--[a-z]+$/);
  }
});

it('every html category declares a kodako icon class', () => {
  for (const c of (htmlToolbox as { contents: Cat[] }).contents) {
    expect(c.cssconfig?.icon).toMatch(/^kodako-cat-icon kodako-cat-icon--[a-z]+$/);
  }
});

it('icon map covers every referenced key with an inline svg data URI', () => {
  const keys = [
    ...(spriteToolbox as { contents: Cat[] }).contents,
    ...(htmlToolbox as { contents: Cat[] }).contents,
  ].map((c) => c.cssconfig!.icon!.split('--')[1]);
  for (const k of keys) {
    expect(CATEGORY_ICON[k as keyof typeof CATEGORY_ICON]).toMatch(/^data:image\/svg\+xml,/);
  }
});
```

- [ ] **Step 2: Run — FAIL** (`category-icons` missing; no `cssconfig`).

Run: `npx vitest run tests/unit/blocks-toolbox-icons.test.ts`

- [ ] **Step 3: Create `src/blocks/category-icons.ts`**

One tiny white glyph per key, 20×20 viewBox, single `<path>` or basic shapes, URL-encoded. Keep each SVG under ~200 chars. Example shape (fill in all 11):

```ts
const svg = (body: string): string =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#fff">${body}</svg>`)}`;

export const CATEGORY_ICON = {
  motion: svg('<path d="M2 10h11l-4-4 1.5-1.5L18 10l-7.5 5.5L9 14l4-4H2z"/>'),
  looks: svg('<path d="M4 3h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 3v-3H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>'),
  sound: svg('<path d="M4 7h3l4-4v14l-4-4H4z"/><path d="M14 6a5 5 0 0 1 0 8" fill="none" stroke="#fff" stroke-width="2"/>'),
  events: svg('<path d="M5 2v16H3V2zm2 1h9l-2 3 2 3H7z"/>'),
  control: svg('<path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm1 3v4l3 2-1 1.5L9 11V6z"/><rect x="8" y="1" width="4" height="2"/>'),
  sensing: svg('<path d="M9 2a6 6 0 1 0 3.5 10.9l4 4L18 15l-4-4A6 6 0 0 0 9 2zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>'),
  operators: svg('<path d="M10 1l9 9-9 9-9-9z"/>'),
  variables: svg('<path d="M3 3h8l6 6-8 8-6-6zm4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>'),
  structure: svg('<path d="M8 3H4v14h4v-2H6V5h2zm4 0h4v14h-4v-2h2V5h-2z"/>'),
  content: svg('<path d="M3 4h14v12H3zm2 2v6l3-3 2 2 3-4 3 5H5z"/><circle cx="7" cy="8" r="1.5"/>'),
  style: svg('<path d="M10 2s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>'),
} as const;
```

(These are placeholder-quality paths — refine visually during Step 7. The *test* only checks the data-URI prefix and key coverage; the visual bar is the manual review.)

- [ ] **Step 4: Add `cssconfig` to `src/blocks/sprite/toolbox.ts`**

Add to each category object (keys match the Task-1 order): `cssconfig: { icon: 'kodako-cat-icon kodako-cat-icon--motion' }` on Gerakan, `--looks` on Tampilan, `--sound` on Suara, `--events` on Kejadian, `--control` on Kontrol, `--sensing` on Sensor, `--operators` on Operator, `--variables` on Variabel.

- [ ] **Step 5: Add `cssconfig` to `src/blocks/html/toolbox.ts`**

`--structure` on Struktur, `--content` on Konten, `--style` on Gaya.

- [ ] **Step 6: Style the rail in `src/blocks/theme.css`**

Append (keep the existing rules):

```css
.blocklyTreeRow {
  min-height: 44px;
  padding: 4px 10px 4px 6px;
  border-radius: 10px;
  margin: 2px 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.blocklyTreeRow[aria-selected='true'] {
  background: color-mix(in srgb, currentColor 14%, transparent);
  box-shadow: inset 3px 0 0 currentColor;
}

.blocklyTreeIcon.kodako-cat-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: #9aa4b2; /* overridden per category below */
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 16px 16px;
  mask-size: 16px 16px;
}

.kodako-cat-icon--motion { background-color: #4c97ff; -webkit-mask-image: var(--i); mask-image: var(--i); }
/* …one line per key, each setting background-color to the CATEGORY_COLORS value
   and mask-image to the matching data URI. Define --i inline is not possible in a
   stylesheet; instead inline the url() directly: */
```

Because CSS can't read the TS map, write the mask URLs directly in `theme.css` — copy each `data:image/svg+xml,...` string from `category-icons.ts` into a `mask-image: url("data:image/svg+xml,...")` for the matching `.kodako-cat-icon--<key>` rule, and set `background-color` to the hex from `CATEGORY_COLORS` in `theme.ts`. Keep `category-icons.ts` as the **source of truth** referenced by the test; the CSS duplication is deliberate and small (11 short strings). Add a comment in both files pointing at each other.

Also bump flyout spacing:
```css
.blocklyFlyout { padding-top: 6px; }
.blocklyFlyoutButton { min-height: 40px; }
```

- [ ] **Step 7: Run tests + manual visual pass**

Run: `npx vitest run` — Expected: green (new file + updated sprite-toolbox test if you extended it).
Then `npm run dev`: check both modes. The rail should show coloured discs with white glyphs and labels; the selected row a tinted pill with a left accent bar; the flyout a touch roomier. Iterate on the SVG paths in `category-icons.ts` **and** the mirrored `theme.css` URLs until it reads clearly at 26px. Record before/after notes in the task report.

- [ ] **Step 8: Full gate**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`
Expected: all green; editor entry chunk still < 400 kB (the icon strings add ~2 kB total).

- [ ] **Step 9: Commit**

```bash
npm run format
git add src/blocks/category-icons.ts src/blocks/theme.css src/blocks/sprite/toolbox.ts \
  src/blocks/html/toolbox.ts tests/unit/blocks-toolbox-icons.test.ts tests/unit/blocks-sprite-toolbox.test.ts
git commit -m "feat(editor): Scratch-style category rail with colour discs and glyphs"
```

---

## Task 6: Help copy + docs + final gate

**Files:**
- Modify: `src/app/i18n/id.json` — `help.html` (remove `"halaman"` block reference), `help.sprite` (unchanged text is fine; verify it still matches the UI).
- Modify: `tests/unit/i18n.test.ts` — the `help.html` exact-string assertion.
- Modify: `docs/ROADMAP.md` — tick the relevant Fase 3 polish note or add a one-line entry under a "Perbaikan pasca-rilis" heading noting the UX pass.
- Modify: `C:/Users/Predator/.claude/...` memory is NOT part of the repo — do not touch.

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: help text with no stale `html_page` mention; green full gate.

- [ ] **Step 1: Update the failing i18n assertion** in `tests/unit/i18n.test.ts`

Change the expected `help.html` string to (new copy):
```
Seret blok Struktur (judul, paragraf, gambar, daftar) langsung ke area kerja — blok yang tersusun dari atas ke bawah menjadi isi halaman. Bungkus dengan blok Gaya untuk warna/ukuran. Klik "Jalankan" untuk melihat hasilnya di tab Pratinjau, atau kodenya di tab Lihat Kode.
```

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run tests/unit/i18n.test.ts`
Expected: FAIL — value mismatch.

- [ ] **Step 3: Update `src/app/i18n/id.json`** `help.html` to the exact string above. Leave `help.sprite`, `help.start`, `help.save`, `help.trouble` as-is (they don't reference `html_page`; `help.sprite` mentions categories generically). Re-check `help.trouble` — it says *"blok saat bendera hijau diklik"* which is sprite-only and still correct.

- [ ] **Step 4: Run — PASS**

Run: `npx vitest run tests/unit/i18n.test.ts`

- [ ] **Step 5: ROADMAP note** — under `## Fase 3 — Poles & paket desktop`, after the existing "Fase 3c … selesai" paragraph, add:

```
Perbaikan UX pasca-rilis (2026-09-05): blok `halaman` HTML dihapus (isi
`<body>` = blok top-level, memperbaiki bug "Lihat Kode kosong"), label
blok HTML memakai tag asli, rail kategori bergaya Scratch, nama/urutan
kategori Mode Sprite disamakan dengan Scratch Indonesia, dan tombol
"Jalankan" untuk pratinjau HTML. Lihat
`docs/superpowers/specs/2026-09-05-scratch-familiar-editor-ux-design.md`.
```

- [ ] **Step 6: Full gate**

```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e
```
Expected: all green. Record final unit/E2E counts.

- [ ] **Step 7: Commit**

```bash
npm run format
git add src/app/i18n/id.json tests/unit/i18n.test.ts docs/ROADMAP.md
git commit -m "docs(help): reword HTML guidance for the no-page-block model"
```

---

## Self-Review notes (for the executor)

- **Spec coverage:** Task 1 ↔ spec §4; Task 2 ↔ spec §1 + bug section; Task 3 ↔ spec §2; Task 4 ↔ spec §5; Task 5 ↔ spec §3; Task 6 ↔ spec Testing (help text) + ROADMAP. Every spec decision maps to a task.
- **Type consistency:** `migrateHtmlWorkspaceJson` signature identical in Task 2 interface + Step 5. `generateHtml` return shape frozen (Global Constraint 6). `CATEGORY_ICON` key set in Task 5 interface matches the `cssconfig` suffixes in Steps 4–5.
- **Frozen names:** field names (Constraint 5) untouched in Task 3; `LEVEL` values stay `h1/h2/h3` (only labels change).
- **Ordering:** Task 2 must land before 3/4/6 (they assume no `html_page`). Task 1 and Task 5's sprite-toolbox edits both touch `src/blocks/sprite/toolbox.ts` — do Task 1 first; Task 5 only *adds* `cssconfig` keys.
- **Risk:** the `message0()` test helper in Task 3 Step 1 depends on Blockly field `getText()` behaviour — if it proves flaky, fall back to `block.toString()` (documented in the step).
