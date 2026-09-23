# Fase G — Kesetiaan blok terhadap HTML asli — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close five HTML-fidelity gaps in existing blocks — table border control, numeric image width, full h1–h6 headings, ordered-list `type`/`start`, and link `target="_blank"` — without adding any new block type or npm dependency.

**Architecture:** All five changes add fields to blocks that already exist in `src/blocks/html/blocks.ts` and extend the corresponding cases in the hand-written tree-walk generator `src/blocks/html/generator.ts`. Four of the five are pure field additions (old serialized projects deserialize fine — Blockly fills missing fields with their JSON default). The image-width change retypes an existing field (dropdown → number) and is the one exception, made safe by extending the existing pure/idempotent migration function in `src/core/html-project.ts`.

**Tech Stack:** Blockly 11.2.2 (`field_dropdown`, `field_number`, `field_checkbox` — all built in, no new deps), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-html-fidelity-blocks-design.md`

## Global Constraints

- No new npm dependencies.
- HTML block field **names** are frozen — only ADD new fields; the one exception (image `WIDTH` retyped, not renamed) is covered by a migration function, per the spec's "Aturan yang tetap berlaku" section.
- Do not touch `src/blocks/theme.ts`, `src/blocks/category-icons.ts`, `src/blocks/theme.css`, `src/app/i18n/id.json`, or `src/blocks/html/toolbox.ts` — none of these five changes need theme/icon/i18n/toolbox work (no new block types, no new `input_value` connections needing shadow blocks).
- Run `npm run format` before every commit.
- Full gate before the PR: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
  ```

---

## Task 1: Table border control

**Files:**
- Modify: `src/blocks/html/blocks.ts` (the `html_table` block definition)
- Modify: `src/blocks/html/generator.ts` (`emitTable` and its call site)
- Test: `tests/unit/blocks-html-defs.test.ts`
- Test: `tests/unit/blocks-html-generator.test.ts`

**Interfaces:**
- Produces: `html_table` block gains fields `BORDER_WIDTH` (dropdown, values `'1px'|'2px'|'4px'|'0'`, default `'1px'`), `BORDER_STYLE` (dropdown, values `'solid'|'dashed'|'dotted'`, default `'solid'`), `BORDER_COLOR` (dropdown, reuses the existing `COLOR_OPTIONS` constant, default `'#000000'`). Generator emits `border-collapse:collapse;border:<w> <s> <c>` on `<table>` and `border:<w> <s> <c>` on every `<td>`, or nothing at all when width is `'0'`.

- [ ] **Step 1: Write the failing defs test**

In `tests/unit/blocks-html-defs.test.ts`, inside `describe('HTML block labels use real tags', ...)`, replace the existing `it('table blocks show <table>, <tr>, and <td>', ...)` test with this (keep the same assertions, add the new one right after it):

```ts
  it('table blocks show <table>, <tr>, and <td>', () => {
    expect(message0('html_table')).toContain('<table>');
    expect(message0('html_table_row')).toContain('<tr>');
    expect(message0('html_table_cell')).toContain('<td>');
  });
  it('table exposes border width/style/color controls defaulting to a visible thin black border', () => {
    const ws = new Blockly.Workspace();
    const table = ws.newBlock('html_table');
    const width = table.getField('BORDER_WIDTH')!;
    const widthOptions = (
      width as unknown as { getOptions: () => [string, string][] }
    ).getOptions();
    expect(widthOptions.map((o) => o[1])).toEqual(['1px', '2px', '4px', '0']);
    expect(width.getValue()).toBe('1px');

    const style = table.getField('BORDER_STYLE')!;
    const styleOptions = (
      style as unknown as { getOptions: () => [string, string][] }
    ).getOptions();
    expect(styleOptions.map((o) => o[1])).toEqual(['solid', 'dashed', 'dotted']);
    expect(style.getValue()).toBe('solid');

    expect(table.getField('BORDER_COLOR')!.getValue()).toBe('#000000');
    ws.dispose();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: FAIL — `table.getField('BORDER_WIDTH')` is `null`.

- [ ] **Step 3: Add the border fields to `html_table` in `src/blocks/html/blocks.ts`**

Find the `html_table` block definition (currently `message0: '<table> %1 </table>'`, `args0: [{ type: 'input_statement', name: 'ROWS' }]`) and replace it with:

```ts
    {
      type: 'html_table',
      tooltip: 'Tabel untuk menyusun data dalam baris dan kolom (<table>), bergaris.',
      message0: '<table> garis: %1 %2 %3 %4 </table>',
      args0: [
        {
          type: 'field_dropdown',
          name: 'BORDER_WIDTH',
          options: [
            ['tipis', '1px'],
            ['sedang', '2px'],
            ['tebal', '4px'],
            ['tidak ada', '0'],
          ],
        },
        {
          type: 'field_dropdown',
          name: 'BORDER_STYLE',
          options: [
            ['penuh', 'solid'],
            ['putus-putus', 'dashed'],
            ['titik-titik', 'dotted'],
          ],
        },
        { type: 'field_dropdown', name: 'BORDER_COLOR', options: COLOR_OPTIONS },
        { type: 'input_statement', name: 'ROWS' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing generator tests**

In `tests/unit/blocks-html-generator.test.ts`, replace the three existing table tests (`'emits a table with border=1 and nested rows/cells'`, `'emits multiple table rows in order'`, `'applies a style wrapper to the whole table, not each row'`) with:

```ts
  it('emits a table with the default thin black border, cascading onto every cell', () => {
    const table = statement(workspace, 'html_table');
    const row1 = statement(workspace, 'html_table_row');
    const cellA = statement(workspace, 'html_table_cell');
    const cellB = statement(workspace, 'html_table_cell');
    connectText(cellA, 'Senin');
    connectText(cellB, 'Selasa');
    append(cellA, cellB);
    connectStatement(row1, 'CELLS', cellA);
    connectStatement(table, 'ROWS', row1);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table style="border-collapse:collapse;border:1px solid #000000">\n' +
        '  <tr>\n' +
        '    <td style="border:1px solid #000000">Senin</td>\n' +
        '    <td style="border:1px solid #000000">Selasa</td>\n' +
        '  </tr>\n' +
        '</table>\n',
    );
  });

  it('emits multiple table rows in order', () => {
    const table = statement(workspace, 'html_table');
    const row1 = statement(workspace, 'html_table_row');
    const row2 = statement(workspace, 'html_table_row');
    const cell1 = statement(workspace, 'html_table_cell');
    const cell2 = statement(workspace, 'html_table_cell');
    connectText(cell1, 'A');
    connectText(cell2, 'B');
    connectStatement(row1, 'CELLS', cell1);
    connectStatement(row2, 'CELLS', cell2);
    append(row1, row2);
    connectStatement(table, 'ROWS', row1);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table style="border-collapse:collapse;border:1px solid #000000">\n' +
        '  <tr>\n    <td style="border:1px solid #000000">A</td>\n  </tr>\n' +
        '  <tr>\n    <td style="border:1px solid #000000">B</td>\n  </tr>\n' +
        '</table>\n',
    );
  });

  it('customizes table border width, style, and color, cascading onto every cell', () => {
    const table = statement(workspace, 'html_table');
    table.setFieldValue('2px', 'BORDER_WIDTH');
    table.setFieldValue('dashed', 'BORDER_STYLE');
    table.setFieldValue('#1e88e5', 'BORDER_COLOR');
    const row = statement(workspace, 'html_table_row');
    const cell = statement(workspace, 'html_table_cell');
    connectText(cell, 'A');
    connectStatement(row, 'CELLS', cell);
    connectStatement(table, 'ROWS', row);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table style="border-collapse:collapse;border:2px dashed #1e88e5">\n' +
        '  <tr>\n' +
        '    <td style="border:2px dashed #1e88e5">A</td>\n' +
        '  </tr>\n' +
        '</table>\n',
    );
  });

  it('omits all border styling when width is set to "tidak ada"', () => {
    const table = statement(workspace, 'html_table');
    table.setFieldValue('0', 'BORDER_WIDTH');
    const row = statement(workspace, 'html_table_row');
    const cell = statement(workspace, 'html_table_cell');
    connectText(cell, 'A');
    connectStatement(row, 'CELLS', cell);
    connectStatement(table, 'ROWS', row);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table>\n  <tr>\n    <td>A</td>\n  </tr>\n</table>\n',
    );
  });

  it('applies a style wrapper to the whole table only, not each cell', () => {
    const bold = statement(workspace, 'html_style_bold');
    const table = statement(workspace, 'html_table');
    connectStatement(bold, 'BODY', table);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table style="font-weight:bold;border-collapse:collapse;border:1px solid #000000">\n</table>\n',
    );
  });
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: FAIL (still emits `border="1"`, no `BORDER_WIDTH` field read).

- [ ] **Step 7: Rewrite `emitTable` in `src/blocks/html/generator.ts`**

Add two new `Set`s near the top of the file, right after the existing `const FONTS = ...` line:

```ts
const BORDER_WIDTHS = new Set(['1px', '2px', '4px', '0']);
const BORDER_STYLES = new Set(['solid', 'dashed', 'dotted']);
```

Replace the whole `emitTable` function with:

```ts
function tableBorderFragment(block: Blockly.Block): string {
  const width = field(block, 'BORDER_WIDTH');
  const w = BORDER_WIDTHS.has(width) ? width : '1px';
  if (w === '0') return '';
  const style = field(block, 'BORDER_STYLE');
  const s = BORDER_STYLES.has(style) ? style : 'solid';
  const color = field(block, 'BORDER_COLOR');
  const c = COLORS.has(color) ? color : '#000000';
  return `border:${w} ${s} ${c}`;
}

function emitTableCell(block: Blockly.Block, depth: number, cellBorder: string): string {
  const prefix = indent(depth);
  return withStyles(`${prefix}<td>${textInput(block, 'TEXT')}</td>\n`, cellBorder ? [cellBorder] : []);
}

function emitTableRow(block: Blockly.Block, depth: number, cellBorder: string): string {
  const prefix = indent(depth);
  let cells = '';
  let cell = block.getInputTargetBlock('CELLS');
  while (cell) {
    cells += emitTableCell(cell, depth + 1, cellBorder);
    cell = cell.getNextBlock();
  }
  return `${prefix}<tr>\n${cells}${prefix}</tr>\n`;
}

function emitTable(block: Blockly.Block, depth: number, styleFragments: string[]): string {
  const prefix = indent(depth);
  const border = tableBorderFragment(block);
  const tableFragments = border
    ? [...styleFragments, 'border-collapse:collapse', border]
    : styleFragments;
  let rows = '';
  let row = block.getInputTargetBlock('ROWS');
  while (row) {
    rows += emitTableRow(row, depth + 1, border);
    row = row.getNextBlock();
  }
  return withStyles(`${prefix}<table>\n${rows}${prefix}</table>\n`, tableFragments);
}
```

This bypasses the generic `emitContainer`/`emitChain` dispatch for a table's own rows/cells (needed so the border fragment can cascade down to every `<td>` — `emitContainer`'s recursive call always resets `styleFragments` to `[]` for its children, by design, so it can't be reused here). The `emitBlock` switch's existing `case 'html_table_row'`/`case 'html_table_cell'` (generic, via `emitContainer`/`withStyles`) stay exactly as they are — they're an unused-in-practice fallback for a stray `tr`/`td` outside a table, not touched by this task.

Update the one call site — find `case 'html_table': return emitTable(block, depth, assetIds, styleFragments);` in `emitBlock`'s switch and change it to:

```ts
    case 'html_table':
      return emitTable(block, depth, styleFragments);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: PASS.

- [ ] **Step 9: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS (no other test references `border="1"`).

- [ ] **Step 10: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/blocks/html/blocks.ts src/blocks/html/generator.ts tests/unit/blocks-html-defs.test.ts tests/unit/blocks-html-generator.test.ts
git commit -m "feat(html): kontrol border tabel (warna/gaya/tebal)

Field BORDER_WIDTH/BORDER_STYLE/BORDER_COLOR baru di html_table,
ganti border=\"1\" yang di-hardcode. emitTable ditulis ulang supaya
gaya border ikut menempel ke tiap <td>, bukan cuma <table> (mekanisme
emitContainer generik tidak meneruskan style ke cucu blok).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

## Task 2: Image width — numeric field + migration

**Files:**
- Modify: `src/blocks/html/blocks.ts` (`html_image_asset`, `html_image_url`)
- Modify: `src/blocks/html/generator.ts` (`IMAGE_WIDTHS` removed; both image cases)
- Modify: `src/core/html-project.ts` (`migrateHtmlWorkspaceJson` extended)
- Test: `tests/unit/blocks-html-defs.test.ts`
- Test: `tests/unit/blocks-html-generator.test.ts`
- Test: `tests/unit/html-project-migrate.test.ts`

**Interfaces:**
- Produces: `WIDTH` field on `html_image_asset`/`html_image_url` is now `field_number` (min `0`, default `0` = "ukuran asli", no `px` suffix). Generator emits a raw `width="<n>"` HTML attribute (not CSS) when `> 0`. `migrateHtmlWorkspaceJson(raw)` (existing export from `src/core/html-project.ts`) additionally rewrites any legacy string `WIDTH` (`''`/`'120px'`/`'240px'`/`'480px'`) found anywhere in the block tree to its numeric equivalent (`0`/`120`/`240`/`480`).

**Note:** this is the one field *retype* in this plan (not a pure addition) — land the block/generator change and the migration together; do not split into separate commits, since a project saved between them could open incorrectly.

- [ ] **Step 1: Write the failing defs test**

In `tests/unit/blocks-html-defs.test.ts`, replace the existing `it('image blocks expose a WIDTH size dropdown defaulting to natural size', ...)` test with:

```ts
  it('image blocks expose a numeric WIDTH field defaulting to natural size (0)', () => {
    const ws = new Blockly.Workspace();
    for (const type of ['html_image_asset', 'html_image_url']) {
      const block = ws.newBlock(type);
      const field = block.getField('WIDTH')!;
      expect(field.getValue(), `${type} WIDTH default`).toBe(0);
    }
    ws.dispose();
  });
  it('image shows a "lebar ... piksel" label for the width field', () => {
    const m = message0('html_image_url');
    expect(m).toContain('lebar');
    expect(m).toContain('piksel');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: FAIL (`field.getValue()` is `''`, not `0`; message0 doesn't contain "lebar"/"piksel" yet).

- [ ] **Step 3: Retype the `WIDTH` field in `src/blocks/html/blocks.ts`**

In both `html_image_asset` and `html_image_url`, change `message0` from
`'<img src= %1 alt= %2 ukuran %3 >'` to `'<img src= %1 alt= %2 lebar %3 piksel >'`,
and replace the `WIDTH` arg (currently a `field_dropdown` with `asli`/`kecil`/`sedang`/`besar` options) with:

```ts
        { type: 'field_number', name: 'WIDTH', value: 0, min: 0, precision: 1 },
```

(Both blocks' `ASSET`/`URL` and `ALT` args stay exactly as they are — only the third arg changes, in both blocks.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing generator test**

In `tests/unit/blocks-html-generator.test.ts`, replace `it('emits an image at a chosen width and omits width at the natural-size default', ...)` with:

```ts
  it('emits an image with a numeric width attribute and omits it at 0 (natural size)', () => {
    const sized = statement(workspace, 'html_image_url');
    sized.setFieldValue('https://x/y.png', 'URL');
    sized.setFieldValue(240, 'WIDTH');
    expect(generateHtml(workspace).bodyHtml).toBe(
      '<img src="https://x/y.png" alt="" width="240">\n',
    );

    workspace.clear();
    const natural = statement(workspace, 'html_image_url');
    natural.setFieldValue('https://x/y.png', 'URL');
    expect(generateHtml(workspace).bodyHtml).toBe('<img src="https://x/y.png" alt="">\n');
  });
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: FAIL.

- [ ] **Step 7: Update the generator**

Remove the `const IMAGE_WIDTHS = new Set([...]);` line entirely (no longer used).

Replace the `html_image_asset` and `html_image_url` cases in `emitBlock`'s switch with:

```ts
    case 'html_image_asset': {
      const assetId = field(block, 'ASSET');
      if (assetId) assetIds.push(assetId);
      const width = Number(field(block, 'WIDTH'));
      const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${width}"` : '';
      return withStyles(
        `${prefix}<img src="${escapeHtmlAttr(`asset:${assetId}`)}" alt="${escapeHtmlAttr(field(block, 'ALT'))}"${widthAttr}>\n`,
        styleFragments,
      );
    }
    case 'html_image_url': {
      const width = Number(field(block, 'WIDTH'));
      const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${width}"` : '';
      return withStyles(
        `${prefix}<img src="${escapeHtmlAttr(safeUrl(field(block, 'URL')))}" alt="${escapeHtmlAttr(field(block, 'ALT'))}"${widthAttr}>\n`,
        styleFragments,
      );
    }
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: PASS.

- [ ] **Step 9: Write the failing migration tests**

Read `src/core/html-project.ts` and `tests/unit/html-project-migrate.test.ts` first so the fixtures below match the file's existing style exactly (`describe('migrateHtmlWorkspaceJson', ...)` block, `as typeof legacy` casts).

Append this new `describe` block at the end of `tests/unit/html-project-migrate.test.ts`:

```ts
describe('migrateHtmlWorkspaceJson — legacy image WIDTH', () => {
  it('converts each legacy WIDTH string to its numeric equivalent', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'html_image_asset', fields: { ASSET: 'img_1', ALT: '', WIDTH: '' } },
          { type: 'html_image_url', fields: { URL: 'https://x/y.png', ALT: '', WIDTH: '240px' } },
        ],
      },
    };
    const out = migrateHtmlWorkspaceJson(legacy) as typeof legacy;
    expect(out.blocks.blocks[0]!.fields.WIDTH).toBe(0);
    expect(out.blocks.blocks[1]!.fields.WIDTH).toBe(240);
  });

  it('migrates an image nested inside other blocks, not just top-level', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'html_section',
            inputs: {
              BODY: {
                block: {
                  type: 'html_image_url',
                  fields: { URL: 'https://x/y.png', ALT: '', WIDTH: '120px' },
                  next: {
                    block: {
                      type: 'html_image_asset',
                      fields: { ASSET: 'img_2', ALT: '', WIDTH: '480px' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    };
    const out = migrateHtmlWorkspaceJson(legacy) as typeof legacy;
    const nested = out.blocks.blocks[0]!.inputs.BODY.block;
    expect(nested.fields.WIDTH).toBe(120);
    expect(nested.next.block.fields.WIDTH).toBe(480);
  });

  it('leaves an already-numeric WIDTH untouched', () => {
    const modern = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'html_image_url', fields: { URL: 'https://x/y.png', ALT: '', WIDTH: 200 } }],
      },
    };
    expect(migrateHtmlWorkspaceJson(modern)).toEqual(modern);
  });

  it('is idempotent', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'html_image_asset', fields: { ASSET: 'img_1', ALT: '', WIDTH: '240px' } }],
      },
    };
    const once = migrateHtmlWorkspaceJson(legacy);
    expect(migrateHtmlWorkspaceJson(once)).toEqual(once);
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run tests/unit/html-project-migrate.test.ts`
Expected: FAIL (WIDTH stays as the old string).

- [ ] **Step 11: Extend `migrateHtmlWorkspaceJson` in `src/core/html-project.ts`**

Replace the whole file with:

```ts
import type { Project } from './project';

export function htmlWorkspaceJson(project: Project): Record<string, unknown> {
  return project.html.workspace ?? {};
}

type BlockNode = {
  type?: string;
  fields?: Record<string, unknown>;
  next?: { block?: BlockNode };
  inputs?: Record<string, { block?: BlockNode }>;
  x?: number;
  y?: number;
  [k: string]: unknown;
};

const LEGACY_IMAGE_WIDTHS: Record<string, number> = {
  '': 0,
  '120px': 120,
  '240px': 240,
  '480px': 480,
};

function migrateImageWidthField(node: BlockNode): BlockNode {
  if (
    (node.type === 'html_image_asset' || node.type === 'html_image_url') &&
    node.fields &&
    typeof node.fields.WIDTH === 'string' &&
    node.fields.WIDTH in LEGACY_IMAGE_WIDTHS
  ) {
    return {
      ...node,
      fields: { ...node.fields, WIDTH: LEGACY_IMAGE_WIDTHS[node.fields.WIDTH as string] },
    };
  }
  return node;
}

function migrateBlockNode(node: BlockNode | undefined): BlockNode | undefined {
  if (!node || typeof node !== 'object') return node;
  let current = migrateImageWidthField(node);
  if (current.next?.block) {
    current = { ...current, next: { ...current.next, block: migrateBlockNode(current.next.block) } };
  }
  if (current.inputs) {
    const nextInputs: typeof current.inputs = {};
    for (const [key, value] of Object.entries(current.inputs)) {
      nextInputs[key] = value.block
        ? { ...value, block: migrateBlockNode(value.block) }
        : value;
    }
    current = { ...current, inputs: nextInputs };
  }
  return current;
}

/**
 * One-time migration for projects saved before the `html_page` root block was
 * removed. Lifts the child stack of a legacy `html_page` block up to the top
 * level (so the top-level block stack is the `<body>`) **as a single connected
 * stack** — the head block keeps its whole `.next` chain, and inherits the
 * page's x/y so the kid's arrangement survives the upgrade.
 *
 * Also rewrites any legacy string `html_image_asset`/`html_image_url` `WIDTH`
 * field (`''`/`'120px'`/`'240px'`/`'480px'`, from before the field became a
 * plain pixel number) to its numeric equivalent, anywhere in the block tree
 * (not just top-level).
 *
 * Pure and idempotent; any missing/oddly-shaped node is treated as "nothing
 * to migrate" and `raw` is returned untouched.
 */
export function migrateHtmlWorkspaceJson(raw: Record<string, unknown>): Record<string, unknown> {
  const blocksHolder = (raw as { blocks?: { blocks?: unknown } }).blocks;
  const list = blocksHolder?.blocks;
  if (!Array.isArray(list)) {
    return raw;
  }

  let nextList = list as BlockNode[];
  if (nextList.some((b) => b?.type === 'html_page')) {
    const lifted: BlockNode[] = [];
    for (const entry of nextList) {
      if (entry?.type !== 'html_page') {
        lifted.push(entry);
        continue;
      }
      const head = entry.inputs?.BODY?.block;
      if (head && typeof head === 'object') {
        if (typeof entry.x === 'number') head.x = entry.x;
        if (typeof entry.y === 'number') head.y = entry.y;
        lifted.push(head);
      }
    }
    nextList = lifted;
  }

  nextList = nextList.map((entry) => migrateBlockNode(entry) as BlockNode);

  return { ...raw, blocks: { ...blocksHolder, blocks: nextList } };
}

export function withHtmlWorkspace(project: Project, workspace: Record<string, unknown>): Project {
  return {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
    html: { ...project.html, workspace },
  };
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run tests/unit/html-project-migrate.test.ts`
Expected: PASS.

- [ ] **Step 13: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 14: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/blocks/html/blocks.ts src/blocks/html/generator.ts src/core/html-project.ts tests/unit/blocks-html-defs.test.ts tests/unit/blocks-html-generator.test.ts tests/unit/html-project-migrate.test.ts
git commit -m "feat(html): lebar gambar jadi angka piksel bebas + migrasi

Field WIDTH pada html_image_asset/html_image_url berubah dari dropdown
preset (kecil/sedang/besar) jadi field_number bebas, meniru atribut
asli <img width=\"200\"> alih-alih style CSS. migrateHtmlWorkspaceJson
diperluas jadi penelusuran rekursif seluruh pohon blok supaya project
lama yang masih menyimpan nilai dropdown lama (string, mis. '240px')
otomatis dikonversi ke angka murni saat dibuka.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

## Task 3: Heading h1–h6, ordered-list type/start, link target-blank

**Files:**
- Modify: `src/blocks/html/blocks.ts` (`html_heading`, `html_list_ordered`, `html_link`)
- Modify: `src/blocks/html/generator.ts` (`HEADING_LEVELS`, `emitContainer`, `html_list_ordered` case, `html_link` case)
- Test: `tests/unit/blocks-html-defs.test.ts`
- Test: `tests/unit/blocks-html-generator.test.ts`

**Interfaces:**
- Produces: `html_heading`'s `LEVEL` dropdown now has 6 options (`h1`–`h6`). `html_list_ordered` gains `TYPE` (dropdown `'1'|'A'|'a'|'I'|'i'`, default `'1'`) and `START` (`field_number`, min `1`, default `1`) — emits `type="…"`/`start="…"` only when non-default. `html_link` gains `NEW_TAB` (`field_checkbox`, default unchecked) — emits `target="_blank"` when checked. `emitContainer` gains an optional 7th parameter `attrs = ''` (inserted between the tag name and `>`); every existing call site is unaffected since it defaults to `''`.

### Part A — Heading h1–h6

- [ ] **Step 1: Write the failing defs test**

In `tests/unit/blocks-html-defs.test.ts`, replace `it('heading level dropdown labels are the h-tags', ...)` with:

```ts
  it('heading level dropdown labels are the h-tags, full h1-h6', () => {
    const ws = new Blockly.Workspace();
    const b = ws.newBlock('html_heading');
    const dropdown = b.getField('LEVEL')!;
    const options = (dropdown as unknown as { getOptions: () => [string, string][] }).getOptions();
    expect(options.map((o) => o[0])).toEqual(['<h1>', '<h2>', '<h3>', '<h4>', '<h5>', '<h6>']);
    expect(options.map((o) => o[1])).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    ws.dispose();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: FAIL.

- [ ] **Step 3: Extend the `LEVEL` dropdown in `src/blocks/html/blocks.ts`**

In `html_heading`'s `args0`, change the `LEVEL` dropdown's `options` from 3 entries to:

```ts
          options: [
            ['<h1>', 'h1'],
            ['<h2>', 'h2'],
            ['<h3>', 'h3'],
            ['<h4>', 'h4'],
            ['<h5>', 'h5'],
            ['<h6>', 'h6'],
          ],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing generator test**

In `tests/unit/blocks-html-generator.test.ts`, add after `it('emits the selected heading level', ...)`:

```ts
  it.each(['h4', 'h5', 'h6'])('emits heading level %s', (level) => {
    const heading = statement(workspace, 'html_heading');
    heading.setFieldValue(level, 'LEVEL');
    connectText(heading, 'Judul');

    expect(generateHtml(workspace).bodyHtml).toBe(`<${level}>Judul</${level}>\n`);
  });
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: FAIL (`h4`/`h5`/`h6` not in `HEADING_LEVELS`, falls back to `h1`).

- [ ] **Step 7: Extend `HEADING_LEVELS` in `src/blocks/html/generator.ts`**

Change `const HEADING_LEVELS = new Set(['h1', 'h2', 'h3']);` to:

```ts
const HEADING_LEVELS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: PASS.

### Part B — Ordered-list `type`/`start`

- [ ] **Step 9: Write the failing defs test**

In `tests/unit/blocks-html-defs.test.ts`, add after `it('ordered list shows <ol> … </ol>', ...)`:

```ts
  it('ordered list exposes a TYPE dropdown and numeric START field, both defaulting to plain numbering', () => {
    const ws = new Blockly.Workspace();
    const block = ws.newBlock('html_list_ordered');
    const type = block.getField('TYPE')!;
    const options = (type as unknown as { getOptions: () => [string, string][] }).getOptions();
    expect(options.map((o) => o[1])).toEqual(['1', 'A', 'a', 'I', 'i']);
    expect(type.getValue()).toBe('1');
    expect(block.getField('START')!.getValue()).toBe(1);
    ws.dispose();
  });
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: FAIL.

- [ ] **Step 11: Add `TYPE`/`START` fields to `html_list_ordered` in `src/blocks/html/blocks.ts`**

Replace the `html_list_ordered` block definition (currently `message0: '<ol> %1 </ol>'`, `args0: [{ type: 'input_statement', name: 'ITEMS' }]`) with:

```ts
    {
      type: 'html_list_ordered',
      tooltip: 'Daftar bernomor (<ol>) — isi dengan blok <li>.',
      message0: '<ol> tipe %1 mulai %2 %3 </ol>',
      args0: [
        {
          type: 'field_dropdown',
          name: 'TYPE',
          options: [
            ['angka', '1'],
            ['huruf besar', 'A'],
            ['huruf kecil', 'a'],
            ['romawi besar', 'I'],
            ['romawi kecil', 'i'],
          ],
        },
        { type: 'field_number', name: 'START', value: 1, min: 1, precision: 1 },
        { type: 'input_statement', name: 'ITEMS' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: PASS.

- [ ] **Step 13: Write the failing generator tests**

In `tests/unit/blocks-html-generator.test.ts`, add right after `it('emits an indented ordered list', ...)`:

```ts
  it('emits ordered list type and start attributes when non-default', () => {
    const list = statement(workspace, 'html_list_ordered');
    list.setFieldValue('A', 'TYPE');
    list.setFieldValue(5, 'START');
    const item = statement(workspace, 'html_list_item');
    connectText(item, 'x');
    connectStatement(list, 'ITEMS', item);

    expect(generateHtml(workspace).bodyHtml).toBe('<ol type="A" start="5">\n  <li>x</li>\n</ol>\n');
  });

  it('omits type/start attributes at their defaults (angka/1)', () => {
    const list = statement(workspace, 'html_list_ordered');
    expect(generateHtml(workspace).bodyHtml).toBe('<ol>\n</ol>\n');
  });
```

- [ ] **Step 14: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: FAIL (`emitContainer` has no `attrs` parameter yet).

- [ ] **Step 15: Extend `emitContainer` and the `html_list_ordered` case in `src/blocks/html/generator.ts`**

Add near the other `Set`s (after `BORDER_STYLES` from Task 1):

```ts
const LIST_TYPES = new Set(['1', 'A', 'a', 'I', 'i']);
```

Change `emitContainer`'s signature and body to:

```ts
function emitContainer(
  block: Blockly.Block,
  inputName: string,
  tag: 'section' | 'ul' | 'ol' | 'header' | 'main' | 'footer' | 'div' | 'tr',
  depth: number,
  assetIds: string[],
  styleFragments: string[],
  attrs = '',
): string {
  const prefix = indent(depth);
  const children = emitChain(block.getInputTargetBlock(inputName), depth + 1, assetIds);
  return withStyles(`${prefix}<${tag}${attrs}>\n${children}${prefix}</${tag}>\n`, styleFragments);
}
```

Change the `case 'html_list_ordered':` line in `emitBlock`'s switch from
`return emitContainer(block, 'ITEMS', 'ol', depth, assetIds, styleFragments);` to:

```ts
    case 'html_list_ordered': {
      const type = field(block, 'TYPE');
      const typeAttr = LIST_TYPES.has(type) && type !== '1' ? ` type="${type}"` : '';
      const start = Number(field(block, 'START'));
      const startAttr = Number.isFinite(start) && start !== 1 ? ` start="${start}"` : '';
      return emitContainer(block, 'ITEMS', 'ol', depth, assetIds, styleFragments, `${typeAttr}${startAttr}`);
    }
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: PASS.

### Part C — Link `target="_blank"`

- [ ] **Step 17: Write the failing defs test**

In `tests/unit/blocks-html-defs.test.ts`, add after `it('link shows <a href= … > … </a>', ...)`:

```ts
  it('link exposes a NEW_TAB checkbox defaulting to unchecked', () => {
    const ws = new Blockly.Workspace();
    const field = ws.newBlock('html_link').getField('NEW_TAB')!;
    expect(field.getValue()).toBe('FALSE');
    ws.dispose();
  });
```

- [ ] **Step 18: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: FAIL.

- [ ] **Step 19: Add the `NEW_TAB` checkbox to `html_link` in `src/blocks/html/blocks.ts`**

Replace the `html_link` block definition with:

```ts
    {
      type: 'html_link',
      tooltip: 'Tautan yang bisa diklik ke halaman lain (<a>).',
      message0: '<a href= %1 > %2 </a> tab baru? %3',
      args0: [
        { type: 'field_input', name: 'URL', text: 'https://' },
        { type: 'field_input', name: 'LABEL', text: 'Tulis di sini' },
        { type: 'field_checkbox', name: 'NEW_TAB', checked: false },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'content_blocks',
    },
```

- [ ] **Step 20: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: PASS.

- [ ] **Step 21: Write the failing generator test**

In `tests/unit/blocks-html-generator.test.ts`, add right after `it('emits a link with escaped attributes and label text', ...)`:

```ts
  it('adds target="_blank" when the new-tab checkbox is checked', () => {
    const link = statement(workspace, 'html_link');
    link.setFieldValue('https://a.b', 'URL');
    link.setFieldValue('klik', 'LABEL');
    link.setFieldValue(true, 'NEW_TAB');

    expect(generateHtml(workspace).bodyHtml).toBe('<a href="https://a.b" target="_blank">klik</a>\n');
  });
```

- [ ] **Step 22: Run test to verify it fails**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: FAIL.

- [ ] **Step 23: Update the `html_link` case in `src/blocks/html/generator.ts`**

Replace:

```ts
    case 'html_link':
      return withStyles(
        `${prefix}<a href="${escapeHtmlAttr(safeUrl(field(block, 'URL')))}">${escapeHtmlText(field(block, 'LABEL'))}</a>\n`,
        styleFragments,
      );
```

with:

```ts
    case 'html_link': {
      const newTab = field(block, 'NEW_TAB') === 'TRUE';
      const targetAttr = newTab ? ' target="_blank"' : '';
      return withStyles(
        `${prefix}<a href="${escapeHtmlAttr(safeUrl(field(block, 'URL')))}"${targetAttr}>${escapeHtmlText(field(block, 'LABEL'))}</a>\n`,
        styleFragments,
      );
    }
```

- [ ] **Step 24: Run test to verify it passes**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: PASS.

- [ ] **Step 25: Run the full unit suite**

Run: `npx vitest run`
Expected: PASS (270+ tests, no other test asserts on `html_heading`/`html_list_ordered`/`html_link`'s old shape).

- [ ] **Step 26: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/blocks/html/blocks.ts src/blocks/html/generator.ts tests/unit/blocks-html-defs.test.ts tests/unit/blocks-html-generator.test.ts
git commit -m "feat(html): heading h1-h6, tipe/mulai daftar bernomor, tautan tab baru

Tiga tambahan kecil independen: dropdown LEVEL diperluas ke h4-h6;
html_list_ordered dapat field TYPE (angka/A/a/I/i) dan START (field
mulai) yang memancarkan atribut type=/start= hanya saat bukan default;
html_link dapat checkbox NEW_TAB yang memancarkan target=\"_blank\".
emitContainer dapat parameter attrs opsional (default kosong, tidak
mengubah 7 pemanggilan lain yang sudah ada) untuk menyisipkan atribut
tambahan ke tag pembuka.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

## Task 4: E2E test, docs, final gate, PR

**Files:**
- Modify: `tests/e2e/html-mode.spec.ts`
- Modify: `docs/Design.md`
- Modify: `docs/ROADMAP.md`

This task is done by the coordinator directly (not a fresh subagent), matching the Fase F pattern — it's bookkeeping + one integration test that depends on Tasks 1–3 all being merged into the working tree already.

- [ ] **Step 1: Add the combined E2E test**

Append to the end of `tests/e2e/html-mode.spec.ts`:

```ts
test('table border, numeric image width, ordered-list type/start, and link target render end to end', async ({
  page,
}) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();

  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_table',
              x: 20,
              y: 20,
              fields: { BORDER_WIDTH: '2px', BORDER_STYLE: 'dashed', BORDER_COLOR: '#1e88e5' },
              inputs: {
                ROWS: {
                  block: {
                    type: 'html_table_row',
                    inputs: {
                      CELLS: {
                        block: {
                          type: 'html_table_cell',
                          inputs: { TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'A' } } } },
                        },
                      },
                    },
                  },
                },
              },
              next: {
                block: {
                  type: 'html_image_url',
                  fields: { URL: 'https://x/y.png', ALT: 'gbr', WIDTH: 300 },
                  next: {
                    block: {
                      type: 'html_list_ordered',
                      fields: { TYPE: 'A', START: 5 },
                      inputs: {
                        ITEMS: {
                          block: {
                            type: 'html_list_item',
                            inputs: {
                              TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Langkah' } } },
                            },
                          },
                        },
                      },
                      next: {
                        block: {
                          type: 'html_link',
                          fields: { URL: 'https://x', LABEL: 'Buka', NEW_TAB: true },
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
      B.getMainWorkspace(),
    );
  });

  await page.getByRole('button', { name: 'Jalankan' }).click();
  await page.getByRole('tab', { name: 'Lihat Kode' }).click();
  const code = page.locator('.html-mode__code, [class*="code"]').first();
  await expect(code).toContainText('border:2px dashed #1e88e5');
  await expect(code).toContainText('width="300"');
  await expect(code).toContainText('<ol type="A" start="5">');
  await expect(code).toContainText('target="_blank"');
});
```

- [ ] **Step 2: Run the E2E suite**

Run: `npx playwright test tests/e2e/html-mode.spec.ts`
Expected: PASS.

- [ ] **Step 3: Update `docs/Design.md` §4.3**

Change these rows (exact current text on the left, replacement on the right):

```
| | tabel { baris… } | `<table border="1">` |
```
→
```
| | tabel bergaris [tebal/gaya/warna] { baris… } | `<table style="border-collapse:collapse;border:…">` (+ `<td>` ikut bergaris) |
```

```
| | judul besar [teks] (level 1–3) | `<h1>`/`<h2>`/`<h3>` |
```
→
```
| | judul besar [teks] (level 1–6) | `<h1>`–`<h6>` |
```

```
| | daftar bernomor { item… } | `<ol>` |
```
→
```
| | daftar bernomor [tipe/mulai] { item… } | `<ol type=… start=…>` (hanya ditulis bila bukan default) |
```

```
| | tautan ke [url] tulisan [teks] | `<a>` |
```
→
```
| | tautan ke [url] tulisan [teks], tab baru? | `<a>` (+ `target="_blank"` bila dicentang) |
```

Then replace the closing paragraph after the table (currently ending "…project yang disimpan sebelum Fase F tampil tak berubah.") by appending one new paragraph right after it:

```markdown
Fase G (2026-09-23) mengganti `WIDTH` gambar dari dropdown preset jadi
angka piksel bebas (atribut `width="…"` asli, meniru kurikulum
langsung) — project lama yang masih menyimpan nilai dropdown lama
dikonversi otomatis oleh `migrateHtmlWorkspaceJson` saat dibuka (lihat
§3, pola yang sama dengan pelonggaran skema `activeMode`/`sprite` di
Fase E).
```

- [ ] **Step 4: Update `docs/ROADMAP.md`**

Add a new paragraph right before the closing `---` that follows the Fase F paragraph:

```markdown
Fase G (2026-09-23) — kesetiaan blok terhadap HTML asli, dipicu laporan
user bahwa blok tabel tidak punya kontrol border. Border tabel jadi
field warna/gaya/tebal (bukan `border="1"` yang di-*hardcode*, cascading
ke tiap `<td>`); lebar gambar jadi angka piksel bebas (`width="…"` asli,
bukan dropdown preset — dengan migrasi otomatis untuk project lama);
heading lengkap `<h1>`–`<h6>`; daftar bernomor dapat `type`/`start`;
tautan dapat `target="_blank"`. Lihat
`docs/superpowers/specs/2026-09-23-html-fidelity-blocks-design.md`.
```

- [ ] **Step 5: Run the full gate**

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check:chunks
npm run test:e2e
```

Expected: all green.

- [ ] **Step 6: Commit and push**

```bash
npm run format
git add tests/e2e/html-mode.spec.ts docs/Design.md docs/ROADMAP.md
git commit -m "docs+test(html): Fase G — e2e gabungan + dokumentasi

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
git push -u origin fase-g-html-fidelity
```

- [ ] **Step 7: Open the PR**

```bash
gh pr create --title "Fase G · Kesetiaan blok terhadap HTML asli" --body "$(cat <<'EOF'
## Summary
- Border tabel jadi field warna/gaya/tebal (bukan `border="1"` hardcode), cascading ke tiap `<td>`.
- Lebar gambar jadi angka piksel bebas (`width="…"` atribut asli, bukan dropdown preset CSS) + migrasi otomatis untuk project lama.
- Heading lengkap `<h1>`–`<h6>`.
- Daftar bernomor dapat `type`/`start`.
- Tautan dapat `target="_blank"`.

Spec: `docs/superpowers/specs/2026-09-23-html-fidelity-blocks-design.md`

## Test plan
- [x] `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e` — semua hijau
- [x] Test migrasi WIDTH lama→baru (nested + idempotent)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** all 5 items from the spec have a task (border → Task 1; image width + migration → Task 2; heading, ordered-list, link → Task 3 parts A/B/C; docs/e2e/PR → Task 4). The spec's "Non-tujuan" section requires no task (nothing to build for a non-goal).
- **Type consistency:** `emitContainer`'s tag union stays `'section' | 'ul' | 'ol' | 'header' | 'main' | 'footer' | 'div' | 'tr'` (unchanged from Fase F) across all tasks; its new `attrs` parameter is additive (default `''`) so Tasks 1's `emitTable` (which no longer calls `emitContainer` at all) and the other 7 unchanged call sites are unaffected. `field()` helper (returns `String(...)`) is reused for reading `BORDER_WIDTH`/`BORDER_STYLE`/`BORDER_COLOR`/`WIDTH`/`TYPE`/`START`/`NEW_TAB` — no new field-reading helper introduced.
- **Placeholder scan:** no TBD/TODO; every step has literal, runnable code.
