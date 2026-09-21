# Fase F — Blok kurikulum kelas 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the curriculum gap found by comparing "Jurnal Mengajar"'s grade-6 HTML/CSS lesson plan against Game HTML's block set — add table blocks, a flex-row layout block, and a handful of small structure/style blocks, across three PRs.

**Architecture:** Purely additive. `src/blocks/html/blocks.ts` gets new block JSON defs appended to `HTML_BLOCK_TYPES` and `registerHtmlBlocks()`; `src/blocks/html/generator.ts`'s existing `emitContainer` (generic `<tag>…</tag>` + style merge) gets its tag union widened and a couple of new `emitBlock`/`styleFragment` cases; `src/blocks/html/toolbox.ts` gets new entries appended to the existing three categories. No changes to `blocks/theme.ts`, `category-icons.ts`, `theme.css`, or `id.json` — three categories (Struktur/Konten/Gaya) already cover everything, and HTML block labels are hard-coded Indonesian strings in `blocks.ts`, not i18n keys.

**Tech Stack:** Blockly 11.2.2 (`zelos` renderer), Vite 6, TypeScript strict, Vitest + jsdom, Playwright, Prettier + ESLint 9. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-09-21-curriculum-gap-blocks-design.md`

## Global Constraints

- **No new npm dependencies.**
- **Do not touch** `src/blocks/theme.ts`, `src/blocks/category-icons.ts`, `src/blocks/theme.css`, or `src/app/i18n/id.json` — none of this work needs them (see spec).
- **Do not add validation** restricting which block types may nest inside which statement inputs — matches the existing `html_section`/`html_list` precedent (no type-checked connections).
- **Existing block field names are frozen** (`ASSET`, `ALT`, `URL`, `LABEL`, `TEXT`, `COLOR`, `ALIGN`, `SIZE` on `html_style_size` specifically, `LEVEL`) — only ADD new fields (`WIDTH` on the two image blocks), never rename or repurpose an existing one.
- **`html_image_asset`/`html_image_url`'s new `WIDTH` dropdown must default-render as `''` (natural size, no width style emitted)** — a project saved before this plan must look identical after it (Blockly gives a newly-added field its first option's value when a saved block doesn't specify one; `''` MUST be listed first in `WIDTH`'s options for this to hold).
- **Formatting:** run `npm run format` before each task's lint/commit step.
- **Commit trailers** — every commit message ends with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
  ```
- **Full gate (green before each PR):** `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`.
- **Branches:** `fase-f1-quick-win-blocks`, `fase-f2-table-blocks`, `fase-f3-flex-row-block` — each off `main`, each its own PR. `gh pr merge` is blocked in this environment — open the PR and stop; the user merges. PR-F2 and PR-F3 should each branch off `main` fresh (not off each other) unless PR-F1 has already merged when work starts — if an earlier PR in this plan is still open, branch the next one off `main` at the same commit PR-F1 branched from; do not stack branches.

---

# PR-F1 — Tambahan cepat: daftar bernomor, header/main/footer, ukuran gambar, 5 blok Gaya baru

Branch: `fase-f1-quick-win-blocks` off `main`.

### Task 1: Block defs + generator + toolbox (TDD)

**Files:**
- Modify: `src/blocks/html/blocks.ts`
- Modify: `src/blocks/html/generator.ts`
- Modify: `src/blocks/html/toolbox.ts`
- Test: `tests/unit/blocks-html-defs.test.ts`, `tests/unit/blocks-html-generator.test.ts`

**Interfaces:**
- Consumes: existing `emitContainer(block, inputName, tag, depth, assetIds, styleFragments)`, `styleFragment(block)`, `withStyles`, `field`, `indent` from `generator.ts` (all already present — this task widens/extends them, doesn't replace them).
- Produces: 9 new block types (`html_list_ordered`, `html_header`, `html_main`, `html_footer`, `html_style_padding`, `html_style_margin`, `html_style_radius`, `html_style_shadow`, `html_style_font`) plus a new `WIDTH` field on `html_image_asset`/`html_image_url`.

- [ ] **Step 1: Write the failing def tests**

In `tests/unit/blocks-html-defs.test.ts`, add to the `HTML_BLOCK_TYPES` check in the `'registers the four document-skeleton blocks'`-style tests — actually no change needed there (that test only checks the 4 skeleton types by name). Instead add these NEW tests. In the `describe('HTML block labels use real tags', ...)` block, after the existing `it('list shows <ul> … </ul> and item shows <li> … </li>', ...)` test, add:

```ts
  it('ordered list shows <ol> … </ol>', () => {
    expect(message0('html_list_ordered')).toContain('<ol>');
    expect(message0('html_list_ordered')).toContain('</ol>');
  });
  it('header, main, and footer show their real tags', () => {
    expect(message0('html_header')).toContain('<header>');
    expect(message0('html_main')).toContain('<main>');
    expect(message0('html_footer')).toContain('<footer>');
  });
  it('image blocks expose a WIDTH size dropdown defaulting to natural size', () => {
    const ws = new Blockly.Workspace();
    for (const type of ['html_image_asset', 'html_image_url']) {
      const block = ws.newBlock(type);
      const dropdown = block.getField('WIDTH')!;
      const options = (
        dropdown as unknown as { getOptions: () => [string, string][] }
      ).getOptions();
      expect(options[0]![1], `${type} WIDTH default`).toBe('');
      expect(options.map((o) => o[1])).toEqual(['', '120px', '240px', '480px']);
    }
    ws.dispose();
  });
```

In `describe('HTML document + style block labels', ...)`, extend the existing `it.each` list (find the array starting `['html_style_color', 'color:'], ...`) by adding these four rows before the closing `])`:

```ts
    ['html_style_padding', 'padding:'],
    ['html_style_margin', 'margin:'],
    ['html_style_radius', 'border-radius:'],
    ['html_style_shadow', 'box-shadow:'],
```

(`html_style_font`'s label is `font-family:`, which collides with nothing existing — add it as a fifth row: `['html_style_font', 'font-family:'],`.)

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: FAIL — `html_list_ordered`/`html_header`/etc. not registered, `WIDTH` field missing.

- [ ] **Step 3: Add the new block definitions to `blocks.ts`**

In `HTML_BLOCK_TYPES`, add these 9 entries (anywhere in the array — order doesn't matter functionally, but for readability insert them near their thematic siblings):

```ts
  'html_list_ordered',
  'html_header',
  'html_main',
  'html_footer',
  'html_style_padding',
  'html_style_margin',
  'html_style_radius',
  'html_style_shadow',
  'html_style_font',
```

In `registerHtmlBlocks()`'s `Blockly.defineBlocksWithJsonArray([...])` array, immediately after the `html_list_item` block definition, add:

```ts
    {
      type: 'html_list_ordered',
      tooltip: 'Daftar bernomor (<ol>) — isi dengan blok <li>.',
      message0: '<ol> %1 </ol>',
      args0: [{ type: 'input_statement', name: 'ITEMS' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_header',
      tooltip: 'Bagian atas halaman, biasanya berisi judul/menu (<header>).',
      message0: '<header> %1 </header>',
      args0: [{ type: 'input_statement', name: 'BODY' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_main',
      tooltip: 'Bagian isi utama halaman (<main>).',
      message0: '<main> %1 </main>',
      args0: [{ type: 'input_statement', name: 'BODY' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_footer',
      tooltip: 'Bagian bawah halaman, biasanya berisi hak cipta (<footer>).',
      message0: '<footer> %1 </footer>',
      args0: [{ type: 'input_statement', name: 'BODY' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
```

Replace the existing `html_image_asset` block definition with (adds the `WIDTH` dropdown as a 3rd arg — `''` MUST be the first option):

```ts
    {
      type: 'html_image_asset',
      tooltip: 'Menampilkan gambar dari pustaka aset (<img>).',
      message0: '<img src= %1 alt= %2 ukuran %3 >',
      args0: [
        { type: 'field_dropdown', name: 'ASSET', options: () => getAssetOptions() },
        { type: 'field_input', name: 'ALT', text: '' },
        {
          type: 'field_dropdown',
          name: 'WIDTH',
          options: [
            ['asli', ''],
            ['kecil', '120px'],
            ['sedang', '240px'],
            ['besar', '480px'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'content_blocks',
    },
```

Replace the existing `html_image_url` block definition with:

```ts
    {
      type: 'html_image_url',
      tooltip: 'Menampilkan gambar dari alamat web (<img>).',
      message0: '<img src= %1 alt= %2 ukuran %3 >',
      args0: [
        { type: 'field_input', name: 'URL', text: 'https://' },
        { type: 'field_input', name: 'ALT', text: '' },
        {
          type: 'field_dropdown',
          name: 'WIDTH',
          options: [
            ['asli', ''],
            ['kecil', '120px'],
            ['sedang', '240px'],
            ['besar', '480px'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'content_blocks',
    },
```

Immediately after the `html_style_italic` block definition (the last one in the array), add:

```ts
    {
      type: 'html_style_padding',
      tooltip: 'Menambah jarak di dalam kotak isinya (CSS padding).',
      message0: 'padding: %1 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'SIZE',
          options: [
            ['kecil', '8px'],
            ['sedang', '16px'],
            ['besar', '32px'],
          ],
        },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
    {
      type: 'html_style_margin',
      tooltip: 'Menambah jarak di luar kotak isinya (CSS margin).',
      message0: 'margin: %1 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'SIZE',
          options: [
            ['kecil', '8px'],
            ['sedang', '16px'],
            ['besar', '32px'],
          ],
        },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
    {
      type: 'html_style_radius',
      tooltip: 'Melengkungkan sudut kotak isinya (CSS border-radius).',
      message0: 'border-radius: %1 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'SIZE',
          options: [
            ['kecil', '8px'],
            ['sedang', '16px'],
            ['bulat', '9999px'],
          ],
        },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
    {
      type: 'html_style_shadow',
      tooltip: 'Menambah bayangan lembut di sekitar isinya (CSS box-shadow).',
      message0: 'box-shadow: lembut %1',
      args0: [{ type: 'input_statement', name: 'BODY' }],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
    {
      type: 'html_style_font',
      tooltip: 'Mengubah jenis huruf isinya (CSS font-family).',
      message0: 'font-family: %1 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'FONT',
          options: [
            ['standar', 'inherit'],
            ['rapi', 'Georgia, serif'],
            ['mesin ketik', '"Courier New", monospace'],
          ],
        },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
```

- [ ] **Step 4: Run the def tests, watch them pass**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing generator tests**

In `tests/unit/blocks-html-generator.test.ts`, immediately after the existing `it('emits an indented unordered list', ...)` test, add:

```ts
  it('emits an indented ordered list', () => {
    const list = statement(workspace, 'html_list_ordered');
    const first = statement(workspace, 'html_list_item');
    const second = statement(workspace, 'html_list_item');
    connectText(first, 'x');
    connectText(second, 'y');
    append(first, second);
    connectStatement(list, 'ITEMS', first);

    expect(generateHtml(workspace).bodyHtml).toBe('<ol>\n  <li>x</li>\n  <li>y</li>\n</ol>\n');
  });

  it.each(['html_header', 'html_main', 'html_footer'])(
    'wraps children in a real %s tag',
    (type) => {
      const wrapper = statement(workspace, type);
      const paragraph = statement(workspace, 'html_paragraph');
      connectText(paragraph, 'A');
      connectStatement(wrapper, 'BODY', paragraph);
      const tag = type.replace('html_', '');

      expect(generateHtml(workspace).bodyHtml).toBe(`<${tag}>\n  <p>A</p>\n</${tag}>\n`);
    },
  );
```

Immediately after the existing style-fragment `it.each([['html_style_bg', ...`, add a second `it.each` block right after it:

```ts
  it.each([
    ['html_style_padding', 'SIZE', '16px', 'padding:16px'],
    ['html_style_margin', 'SIZE', '32px', 'margin:32px'],
    ['html_style_radius', 'SIZE', '9999px', 'border-radius:9999px'],
    ['html_style_font', 'FONT', 'Georgia, serif', 'font-family:Georgia, serif'],
  ])('emits the expected %s style fragment', (type, fieldName, value, fragment) => {
    const wrapper = statement(workspace, type);
    const paragraph = statement(workspace, 'html_paragraph');
    wrapper.setFieldValue(value, fieldName);
    connectText(paragraph, 'A');
    connectStatement(wrapper, 'BODY', paragraph);

    expect(generateHtml(workspace).bodyHtml).toBe(`<p style="${fragment}">A</p>\n`);
  });

  it('emits a fixed shadow fragment with no dropdown', () => {
    const shadow = statement(workspace, 'html_style_shadow');
    const paragraph = statement(workspace, 'html_paragraph');
    connectText(paragraph, 'A');
    connectStatement(shadow, 'BODY', paragraph);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<p style="box-shadow:0 4px 10px rgba(30,41,80,.15)">A</p>\n',
    );
  });
```

Immediately after the existing `it('emits and tracks an asset image while escaping alt text', ...)` test, add:

```ts
  it('emits an image at a chosen width and omits width at the natural-size default', () => {
    const sized = statement(workspace, 'html_image_url');
    sized.setFieldValue('https://x/y.png', 'URL');
    sized.setFieldValue('240px', 'WIDTH');
    expect(generateHtml(workspace).bodyHtml).toBe(
      '<img src="https://x/y.png" alt="" style="width:240px">\n',
    );

    workspace.clear();
    const natural = statement(workspace, 'html_image_url');
    natural.setFieldValue('https://x/y.png', 'URL');
    expect(generateHtml(workspace).bodyHtml).toBe('<img src="https://x/y.png" alt="">\n');
  });
```

- [ ] **Step 6: Run it, watch it fail**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: FAIL — new block types not handled by `emitBlock`/`styleFragment`, `WIDTH` field not read.

- [ ] **Step 7: Extend `generator.ts`**

Widen `emitContainer`'s `tag` parameter type. Change:
```ts
function emitContainer(
  block: Blockly.Block,
  inputName: string,
  tag: 'section' | 'ul',
```
to:
```ts
function emitContainer(
  block: Blockly.Block,
  inputName: string,
  tag: 'section' | 'ul' | 'ol' | 'header' | 'main' | 'footer' | 'div' | 'tr',
```

Add three new `Set`s near the top of the file, alongside `HEADING_LEVELS`/`COLORS`/`ALIGNS`/`FONT_SIZES`:

```ts
const SPACING_SIZES = new Set(['8px', '16px', '32px']);
const RADIUS_SIZES = new Set(['8px', '16px', '9999px']);
const FONTS = new Set(['inherit', 'Georgia, serif', '"Courier New", monospace']);
const IMAGE_WIDTHS = new Set(['120px', '240px', '480px']);
```

In `styleFragment()`, add these cases right before the `default:` line:

```ts
    case 'html_style_padding': {
      const value = field(block, 'SIZE');
      return `padding:${SPACING_SIZES.has(value) ? value : '8px'}`;
    }
    case 'html_style_margin': {
      const value = field(block, 'SIZE');
      return `margin:${SPACING_SIZES.has(value) ? value : '8px'}`;
    }
    case 'html_style_radius': {
      const value = field(block, 'SIZE');
      return `border-radius:${RADIUS_SIZES.has(value) ? value : '8px'}`;
    }
    case 'html_style_shadow':
      return 'box-shadow:0 4px 10px rgba(30,41,80,.15)';
    case 'html_style_font': {
      const value = field(block, 'FONT');
      return `font-family:${FONTS.has(value) ? value : 'inherit'}`;
    }
```

In `emitBlock()`'s `switch`, add `case 'html_list_ordered':` right after the `html_list` case:

```ts
    case 'html_list_ordered':
      return emitContainer(block, 'ITEMS', 'ol', depth, assetIds, styleFragments);
```

Add these three cases right after that:

```ts
    case 'html_header':
      return emitContainer(block, 'BODY', 'header', depth, assetIds, styleFragments);
    case 'html_main':
      return emitContainer(block, 'BODY', 'main', depth, assetIds, styleFragments);
    case 'html_footer':
      return emitContainer(block, 'BODY', 'footer', depth, assetIds, styleFragments);
```

Add the 5 new style-block types to the existing style-block case group (the one that reads `block.getInputTargetBlock('BODY')` and recurses via `emitChain`). Change:
```ts
    case 'html_style_color':
    case 'html_style_bg':
    case 'html_style_align':
    case 'html_style_size':
    case 'html_style_bold':
    case 'html_style_italic': {
```
to:
```ts
    case 'html_style_color':
    case 'html_style_bg':
    case 'html_style_align':
    case 'html_style_size':
    case 'html_style_bold':
    case 'html_style_italic':
    case 'html_style_padding':
    case 'html_style_margin':
    case 'html_style_radius':
    case 'html_style_shadow':
    case 'html_style_font': {
```

Finally, replace the `html_image_asset` and `html_image_url` cases with (reads the new `WIDTH` field, only contributes a `width:` fragment when non-empty):

```ts
    case 'html_image_asset': {
      const assetId = field(block, 'ASSET');
      if (assetId) assetIds.push(assetId);
      const width = field(block, 'WIDTH');
      const sizeFragment = IMAGE_WIDTHS.has(width) ? [`width:${width}`] : [];
      return withStyles(
        `${prefix}<img src="${escapeHtmlAttr(`asset:${assetId}`)}" alt="${escapeHtmlAttr(field(block, 'ALT'))}">\n`,
        [...sizeFragment, ...styleFragments],
      );
    }
    case 'html_image_url': {
      const width = field(block, 'WIDTH');
      const sizeFragment = IMAGE_WIDTHS.has(width) ? [`width:${width}`] : [];
      return withStyles(
        `${prefix}<img src="${escapeHtmlAttr(safeUrl(field(block, 'URL')))}" alt="${escapeHtmlAttr(field(block, 'ALT'))}">\n`,
        [...sizeFragment, ...styleFragments],
      );
    }
```

- [ ] **Step 8: Run the generator tests, watch them pass**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: PASS.

- [ ] **Step 9: Add the toolbox entries**

In `src/blocks/html/toolbox.ts`, in the `Struktur` category's `contents`, immediately after `{ kind: 'block', type: 'html_list_item', inputs: { TEXT: textShadow() } },`, add:

```ts
        { kind: 'block', type: 'html_list_ordered' },
        { kind: 'block', type: 'html_header' },
        { kind: 'block', type: 'html_main' },
        { kind: 'block', type: 'html_footer' },
```

In the `Gaya` category's `contents`, immediately after `{ kind: 'block', type: 'html_style_italic' },`, add:

```ts
        { kind: 'block', type: 'html_style_padding' },
        { kind: 'block', type: 'html_style_margin' },
        { kind: 'block', type: 'html_style_radius' },
        { kind: 'block', type: 'html_style_shadow' },
        { kind: 'block', type: 'html_style_font' },
```

- [ ] **Step 10: Run the full unit suite + typecheck**

Run: `npm run format && npm run typecheck && npx vitest run`
Expected: PASS. Every test file should pass, including `blocks-html-defs.test.ts`'s generic `HTML_BLOCK_TYPES` loop tests (tooltip non-empty, instantiation) — they cover the 9 new types automatically.

- [ ] **Step 11: Add one E2E assertion proving toolbox + registration wiring**

In `tests/e2e/html-mode.spec.ts`, add a new test after the existing two (the file currently ends after the "document skeleton…" test's closing `});`):

```ts
test('quick-win blocks (ol, header/footer, image size, spacing styles) render end to end', async ({
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
              type: 'html_header',
              x: 20,
              y: 20,
              inputs: {
                BODY: {
                  block: {
                    type: 'html_heading',
                    fields: { LEVEL: 'h1' },
                    inputs: { TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Judul' } } } },
                  },
                },
              },
              next: {
                block: {
                  type: 'html_list_ordered',
                  inputs: {
                    ITEMS: {
                      block: {
                        type: 'html_list_item',
                        inputs: {
                          TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Langkah 1' } } },
                        },
                      },
                    },
                  },
                  next: {
                    block: {
                      type: 'html_style_padding',
                      fields: { SIZE: '32px' },
                      inputs: {
                        BODY: {
                          block: {
                            type: 'html_footer',
                            inputs: {
                              BODY: {
                                block: {
                                  type: 'html_paragraph',
                                  inputs: {
                                    TEXT: {
                                      shadow: { type: 'html_text', fields: { VALUE: 'Hak cipta' } },
                                    },
                                  },
                                },
                              },
                            },
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
      (window as any).__kodakoBlockly.getMainWorkspace(),
    );
  });

  await page.getByRole('button', { name: 'Jalankan' }).click();
  await page.getByRole('tab', { name: 'Lihat Kode' }).click();
  const code = page.locator('.html-mode__code, [class*="code"]').first();
  await expect(code).toContainText('<header>');
  await expect(code).toContainText('<ol>');
  await expect(code).toContainText('<li>Langkah 1</li>');
  await expect(code).toContainText('<footer style="padding:32px">');
});
```

Run: `npx playwright test tests/e2e/html-mode.spec.ts`
Expected: PASS (3/3 tests in the file).

- [ ] **Step 12: Format + commit**

```bash
npm run format
git add src/blocks/html/blocks.ts src/blocks/html/generator.ts src/blocks/html/toolbox.ts tests/unit/blocks-html-defs.test.ts tests/unit/blocks-html-generator.test.ts tests/e2e/html-mode.spec.ts
git commit -m "feat(html): daftar bernomor, header/main/footer, ukuran gambar, 5 blok Gaya baru

Menutup gap kurikulum kelas 6 (Jurnal Mengajar) Pertemuan 5, 6, 10, 13, 14, 20:
- html_list_ordered (<ol>), html_header/html_main/html_footer
- WIDTH dropdown pada html_image_asset/html_image_url (default 'asli' -
  tidak mengubah project lama)
- html_style_padding/margin/radius/shadow/font (pola persis blok Gaya
  yang sudah ada)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

### Task 2: Docs, gate, PR

**Files:**
- Modify: `docs/Design.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Add rows to `docs/Design.md` §4.3's block table**

Find the `## 4.3 Daftar blok` table (it lists Struktur/Konten/Gaya rows). Add these rows to the Struktur group, after the `daftar (<ul>)` row:

```markdown
| | daftar bernomor (<ol>) | `<ol>` |
| | `<header>`/`<main>`/`<footer>` | tag sesuai nama |
```

Add these rows to the Gaya group, after the last existing style row:

```markdown
| | `padding:`/`margin:` [kecil/sedang/besar] { … } | `style="padding:…"` / `margin:…"` |
| | `border-radius:` [kecil/sedang/bulat] { … } | `style="border-radius:…"` |
| | `box-shadow:` lembut { … } | `style="box-shadow:0 4px 10px rgba(30,41,80,.15)"` |
| | `font-family:` [standar/rapi/mesin ketik] { … } | `style="font-family:…"` |
```

Add one sentence after the table: "Gambar (`html_image_asset`/`html_image_url`) punya dropdown ukuran opsional (`asli`/`kecil`/`sedang`/`besar`) yang menambah `style=\"width:…\"` bila bukan `asli`."

- [ ] **Step 2: Add the ROADMAP entry**

Append to the end of `docs/ROADMAP.md` (after the Fase E paragraph, before `## Fase 4`):

```markdown
Fase F (2026-09-21) — blok tambahan untuk menutup gap kurikulum kelas 6
("Pemrograman Web Statis HTML & CSS", dibandingkan dari project terpisah
Jurnal Mengajar). **PR-F1:** daftar bernomor, `<header>`/`<main>`/`<footer>`,
ukuran gambar, dan 5 blok Gaya baru (padding/margin/border-radius/box-shadow/
font-family). Lihat
`docs/superpowers/specs/2026-09-21-curriculum-gap-blocks-design.md`.
```

- [ ] **Step 3: Full gate**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`
Expected: all green.

- [ ] **Step 4: Commit, push, open PR**

```bash
git add docs/Design.md docs/ROADMAP.md
git commit -m "docs: Design.md + ROADMAP entry for Fase F PR-F1

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
git push -u origin fase-f1-quick-win-blocks
gh pr create --base main --title "Fase F · PR-F1 — Blok tambahan cepat (kurikulum kelas 6)" --body "$(cat <<'EOF'
## Ringkasan

Menutup gap kurikulum kelas 6 (dibandingkan dari project Jurnal Mengajar) Pertemuan 5, 6, 10, 13, 14, 20:

- `html_list_ordered` (`<ol>`), `html_header`/`html_main`/`html_footer` — pola persis `html_section`.
- Dropdown ukuran (`WIDTH`) pada blok gambar — default `asli`, project lama tidak berubah tampilannya.
- 5 blok Gaya baru: `padding:`/`margin:`/`border-radius:`/`box-shadow:`/`font-family:` — pola persis blok Gaya yang sudah ada.

Tidak ada perubahan tema/ikon/i18n — tiga kategori toolbox yang ada sudah cukup.

Spec: `docs/superpowers/specs/2026-09-21-curriculum-gap-blocks-design.md`

## Tes

- Unit baru di `blocks-html-defs.test.ts` + `blocks-html-generator.test.ts` untuk tiap blok/field baru.
- E2E baru: blok cepat ini dirakit dan diperiksa di panel Lihat Kode.
- Gate penuh hijau.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

Stop after `gh pr create`. The user merges.

---

# PR-F2 — Blok Tabel

Branch: `fase-f2-table-blocks` off `main`.

### Task 1: Table/row/cell blocks + generator + toolbox (TDD)

**Files:**
- Modify: `src/blocks/html/blocks.ts`
- Modify: `src/blocks/html/generator.ts`
- Modify: `src/blocks/html/toolbox.ts`
- Test: `tests/unit/blocks-html-defs.test.ts`, `tests/unit/blocks-html-generator.test.ts`

**Interfaces:**
- Consumes: `emitContainer`, `withStyles`, `indent`, `field`, `textInput` from `generator.ts`.
- Produces: `html_table`, `html_table_row`, `html_table_cell` block types; a new `emitTable()` generator function.

- [ ] **Step 1: Write the failing def tests**

In `tests/unit/blocks-html-defs.test.ts`, in `describe('HTML block labels use real tags', ...)`, add:

```ts
  it('table blocks show <table>, <tr>, and <td>', () => {
    expect(message0('html_table')).toContain('<table>');
    expect(message0('html_table_row')).toContain('<tr>');
    expect(message0('html_table_cell')).toContain('<td>');
  });
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: FAIL — block types not registered.

- [ ] **Step 3: Add the block definitions**

In `HTML_BLOCK_TYPES`, add:

```ts
  'html_table',
  'html_table_row',
  'html_table_cell',
```

In `registerHtmlBlocks()`'s definition array, add (anywhere — e.g. right after `html_footer` if PR-F1 already merged, or after `html_list_item` otherwise):

```ts
    {
      type: 'html_table',
      tooltip: 'Tabel untuk menyusun data dalam baris dan kolom (<table>), bergaris.',
      message0: '<table> %1 </table>',
      args0: [{ type: 'input_statement', name: 'ROWS' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_table_row',
      tooltip: 'Satu baris di dalam tabel (<tr>) — isi dengan blok <td>.',
      message0: '<tr> %1 </tr>',
      args0: [{ type: 'input_statement', name: 'CELLS' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_table_cell',
      tooltip: 'Satu sel/kotak di dalam baris tabel (<td>).',
      message0: '<td> %1 </td>',
      args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
```

- [ ] **Step 4: Run the def tests, watch them pass**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing generator tests**

In `tests/unit/blocks-html-generator.test.ts`, after the `'emits an indented unordered list'`-family tests, add:

```ts
  it('emits a table with border=1 and nested rows/cells', () => {
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
      '<table border="1">\n' +
        '  <tr>\n' +
        '    <td>Senin</td>\n' +
        '    <td>Selasa</td>\n' +
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
      '<table border="1">\n' +
        '  <tr>\n    <td>A</td>\n  </tr>\n' +
        '  <tr>\n    <td>B</td>\n  </tr>\n' +
        '</table>\n',
    );
  });

  it('applies a style wrapper to the whole table, not each row', () => {
    const bold = statement(workspace, 'html_style_bold');
    const table = statement(workspace, 'html_table');
    connectStatement(bold, 'BODY', table);

    expect(generateHtml(workspace).bodyHtml).toBe('<table border="1" style="font-weight:bold">\n</table>\n');
  });
```

- [ ] **Step 6: Run it, watch it fail**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: FAIL — `html_table`/`html_table_row`/`html_table_cell` not handled.

- [ ] **Step 7: Extend `generator.ts`**

Widen `emitContainer`'s tag union again (or, if PR-F1 already merged and already widened it, add `'tr'` if not already present):
```ts
  tag: 'section' | 'ul' | 'ol' | 'header' | 'main' | 'footer' | 'div' | 'tr',
```

Add a new function right after `emitContainer`:

```ts
function emitTable(
  block: Blockly.Block,
  depth: number,
  assetIds: string[],
  styleFragments: string[],
): string {
  const prefix = indent(depth);
  const rows = emitChain(block.getInputTargetBlock('ROWS'), depth + 1, assetIds);
  return withStyles(`${prefix}<table border="1">\n${rows}${prefix}</table>\n`, styleFragments);
}
```

In `emitBlock()`'s `switch`, add:

```ts
    case 'html_table':
      return emitTable(block, depth, assetIds, styleFragments);
    case 'html_table_row':
      return emitContainer(block, 'CELLS', 'tr', depth, assetIds, styleFragments);
    case 'html_table_cell':
      return withStyles(`${prefix}<td>${textInput(block, 'TEXT')}</td>\n`, styleFragments);
```

- [ ] **Step 8: Run the generator tests, watch them pass**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: PASS.

- [ ] **Step 9: Add toolbox entries**

In `src/blocks/html/toolbox.ts`, `Struktur` category, add (order: after the list/list-item block, or after PR-F1's additions if that PR is already merged):

```ts
        { kind: 'block', type: 'html_table' },
        { kind: 'block', type: 'html_table_row' },
        { kind: 'block', type: 'html_table_cell', inputs: { TEXT: textShadow() } },
```

- [ ] **Step 10: Run the full unit suite + typecheck**

Run: `npm run format && npm run typecheck && npx vitest run`
Expected: PASS.

- [ ] **Step 11: Add one E2E assertion**

In `tests/e2e/html-mode.spec.ts`, add a new test after the last one in the file:

```ts
test('table blocks render a bordered table end to end', async ({ page }) => {
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
              inputs: {
                ROWS: {
                  block: {
                    type: 'html_table_row',
                    inputs: {
                      CELLS: {
                        block: {
                          type: 'html_table_cell',
                          inputs: {
                            TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Senin' } } },
                          },
                          next: {
                            block: {
                              type: 'html_table_cell',
                              inputs: {
                                TEXT: {
                                  shadow: { type: 'html_text', fields: { VALUE: 'Selasa' } },
                                },
                              },
                            },
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
      B.getMainWorkspace(),
    );
  });

  await page.getByRole('button', { name: 'Jalankan' }).click();
  await page.getByRole('tab', { name: 'Lihat Kode' }).click();
  const code = page.locator('.html-mode__code, [class*="code"]').first();
  await expect(code).toContainText('<table border="1">');
  await expect(code).toContainText('<td>Senin</td>');
  await expect(code).toContainText('<td>Selasa</td>');
});
```

Run: `npx playwright test tests/e2e/html-mode.spec.ts`
Expected: PASS.

- [ ] **Step 12: Format + commit**

```bash
npm run format
git add src/blocks/html/blocks.ts src/blocks/html/generator.ts src/blocks/html/toolbox.ts tests/unit/blocks-html-defs.test.ts tests/unit/blocks-html-generator.test.ts tests/e2e/html-mode.spec.ts
git commit -m "feat(html): blok tabel (<table>/<tr>/<td>)

Menutup gap kurikulum kelas 6 Pertemuan 8. Border selalu nyala
(border=\"1\") - tidak ada saklar, sesuai tiap contoh di kurikulum.
Sel tabel teks polos (pola persis paragraf).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

### Task 2: Docs, gate, PR

**Files:**
- Modify: `docs/Design.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Add rows to `docs/Design.md` §4.3's block table**

Add to the Struktur group:

```markdown
| | tabel { baris… } | `<table border="1">` |
| | baris tabel { sel… } | `<tr>` |
| | sel tabel [teks] | `<td>` |
```

- [ ] **Step 2: Add/extend the ROADMAP entry**

If PR-F1's entry already exists in `docs/ROADMAP.md` (i.e. that PR merged first), extend its text with a new sentence: `**PR-F2:** blok Tabel (\`<table>\`/\`<tr>\`/\`<td>\`, border selalu nyala).` If PR-F1 has NOT merged yet (this branch forked before it), add a fresh paragraph following the same template as PR-F1's Step 2 in Task 2 above, describing only PR-F2's scope.

- [ ] **Step 3: Full gate**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`
Expected: all green.

- [ ] **Step 4: Commit, push, open PR**

```bash
git add docs/Design.md docs/ROADMAP.md
git commit -m "docs: Design.md + ROADMAP entry for Fase F PR-F2

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
git push -u origin fase-f2-table-blocks
gh pr create --base main --title "Fase F · PR-F2 — Blok Tabel" --body "$(cat <<'EOF'
## Ringkasan

Menutup gap kurikulum kelas 6 Pertemuan 8 (Tabel HTML).

- `html_table` (`<table border=\"1\">`, border selalu nyala), `html_table_row` (`<tr>`), `html_table_cell` (`<td>`, teks polos).
- Mekanisme dua tingkat pakai `input_statement` yang sudah ada — `emitContainer` diperluas, ditambah satu fungsi `emitTable()` kecil untuk atribut `border`.

Spec: `docs/superpowers/specs/2026-09-21-curriculum-gap-blocks-design.md`

## Tes

- Unit baru: tabel bersarang (baris ganda, sel ganda), gaya pada seluruh tabel.
- E2E baru: tabel dirakit dan diperiksa di panel Lihat Kode.
- Gate penuh hijau.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

Stop after `gh pr create`. The user merges.

---

# PR-F3 — Wadah Sejajar (Flexbox dasar)

Branch: `fase-f3-flex-row-block` off `main`.

### Task 1: `html_row` block + generator + toolbox (TDD)

**Files:**
- Modify: `src/blocks/html/blocks.ts`
- Modify: `src/blocks/html/generator.ts`
- Modify: `src/blocks/html/toolbox.ts`
- Test: `tests/unit/blocks-html-defs.test.ts`, `tests/unit/blocks-html-generator.test.ts`

**Interfaces:**
- Consumes: `emitContainer` (tag union must include `'div'` — already added if PR-F1/F2 merged first; add it here too if this is the first of the three to land).
- Produces: `html_row` block type.

- [ ] **Step 1: Write the failing def test**

In `tests/unit/blocks-html-defs.test.ts`, `describe('HTML block labels use real tags', ...)`, add:

```ts
  it('row (flex) shows a <div> and exposes 5 justify options', () => {
    expect(message0('html_row')).toContain('<div>');
    const ws = new Blockly.Workspace();
    const dropdown = ws.newBlock('html_row').getField('JUSTIFY')!;
    const options = (
      dropdown as unknown as { getOptions: () => [string, string][] }
    ).getOptions();
    expect(options.map((o) => o[1])).toEqual([
      'flex-start',
      'center',
      'flex-end',
      'space-between',
      'space-around',
    ]);
    ws.dispose();
  });
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add the block definition**

In `HTML_BLOCK_TYPES`, add: `'html_row',`

In `registerHtmlBlocks()`'s definition array, add:

```ts
    {
      type: 'html_row',
      tooltip:
        'Membuat isinya berjajar ke samping, bukan menumpuk ke bawah (<div> sejajar/flex).',
      message0: '<div> berjajar: %1 %2 </div>',
      args0: [
        {
          type: 'field_dropdown',
          name: 'JUSTIFY',
          options: [
            ['rata kiri', 'flex-start'],
            ['tengah', 'center'],
            ['rata kanan', 'flex-end'],
            ['renggang', 'space-between'],
            ['sebar rata', 'space-around'],
          ],
        },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
```

- [ ] **Step 4: Run the def test, watch it pass**

Run: `npx vitest run tests/unit/blocks-html-defs.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing generator tests**

In `tests/unit/blocks-html-generator.test.ts`, add:

```ts
  it('emits a flex row div with the chosen justify-content and always flex-wrap:wrap', () => {
    const row = statement(workspace, 'html_row');
    row.setFieldValue('space-between', 'JUSTIFY');
    const first = statement(workspace, 'html_paragraph');
    const second = statement(workspace, 'html_paragraph');
    connectText(first, 'A');
    connectText(second, 'B');
    append(first, second);
    connectStatement(row, 'BODY', first);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap">\n' +
        '  <p>A</p>\n  <p>B</p>\n' +
        '</div>\n',
    );
  });

  it('defaults an unrecognised JUSTIFY value to flex-start', () => {
    const row = statement(workspace, 'html_row');
    row.setFieldValue('nonsense', 'JUSTIFY');

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<div style="display:flex;justify-content:flex-start;flex-wrap:wrap">\n</div>\n',
    );
  });

  it('merges an outer style wrapper onto the row div alongside its own flex style', () => {
    const padding = statement(workspace, 'html_style_padding');
    padding.setFieldValue('16px', 'SIZE');
    const row = statement(workspace, 'html_row');
    row.setFieldValue('center', 'JUSTIFY');
    connectStatement(padding, 'BODY', row);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<div style="padding:16px;display:flex;justify-content:center;flex-wrap:wrap">\n</div>\n',
    );
  });
```

(The third test's fragment order — `padding:16px` before `display:flex;…` — follows `[...styleFragments, ownFragment]` order, matching how `styleFragments` already accumulate outer-to-inner throughout the file; confirm this order against the actual `withStyles`/`join(';')` behavior when you implement Step 7 below, and adjust the expected string only if the real order differs — don't change the implementation to chase a wrong guess in the test.)

- [ ] **Step 6: Run it, watch it fail**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: FAIL.

- [ ] **Step 7: Extend `generator.ts`**

Widen `emitContainer`'s tag union to include `'div'` (skip if PR-F1/F2 already added it):
```ts
  tag: 'section' | 'ul' | 'ol' | 'header' | 'main' | 'footer' | 'div' | 'tr',
```

Add a `Set` near the top of the file:

```ts
const JUSTIFY_VALUES = new Set(['flex-start', 'center', 'flex-end', 'space-between', 'space-around']);
```

In `emitBlock()`'s `switch`, add:

```ts
    case 'html_row': {
      const justify = field(block, 'JUSTIFY');
      const value = JUSTIFY_VALUES.has(justify) ? justify : 'flex-start';
      const fragment = `display:flex;justify-content:${value};flex-wrap:wrap`;
      return emitContainer(block, 'BODY', 'div', depth, assetIds, [...styleFragments, fragment]);
    }
```

- [ ] **Step 8: Run the generator tests, watch them pass**

Run: `npx vitest run tests/unit/blocks-html-generator.test.ts`
Expected: PASS. If Step 5's third test's expected fragment order doesn't match, fix the TEST's expected string to match the real (correct) output — the implementation in Step 7 is the source of truth for ordering, not a guess made before running it.

- [ ] **Step 9: Add the toolbox entry**

In `src/blocks/html/toolbox.ts`, `Struktur` category, add:

```ts
        { kind: 'block', type: 'html_row' },
```

- [ ] **Step 10: Run the full unit suite + typecheck**

Run: `npm run format && npm run typecheck && npx vitest run`
Expected: PASS.

- [ ] **Step 11: Add one E2E assertion**

In `tests/e2e/html-mode.spec.ts`, add:

```ts
test('flex row block lays children out with display:flex end to end', async ({ page }) => {
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
              type: 'html_row',
              x: 20,
              y: 20,
              fields: { JUSTIFY: 'center' },
              inputs: {
                BODY: {
                  block: {
                    type: 'html_paragraph',
                    inputs: {
                      TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Kotak 1' } } },
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
  await expect(code).toContainText('display:flex');
  await expect(code).toContainText('justify-content:center');
  await expect(code).toContainText('Kotak 1');
});
```

Run: `npx playwright test tests/e2e/html-mode.spec.ts`
Expected: PASS.

- [ ] **Step 12: Format + commit**

```bash
npm run format
git add src/blocks/html/blocks.ts src/blocks/html/generator.ts src/blocks/html/toolbox.ts tests/unit/blocks-html-defs.test.ts tests/unit/blocks-html-generator.test.ts tests/e2e/html-mode.spec.ts
git commit -m "feat(html): blok Wadah Sejajar (<div> flex dasar)

Menutup gap kurikulum kelas 6 Pertemuan 15-16, 19-20. Bukan blok Gaya
biasa (blok Gaya menempel style ke tiap anak satu-satu, bukan
membungkus jadi satu elemen) - blok Struktur baru yang menyusun
fragmen display:flex/justify-content dari field JUSTIFY-nya sendiri
lalu memanggil emitContainer(..., 'div', ...). flex-wrap:wrap selalu
aktif, bukan pilihan, supaya tidak berantakan di pratinjau sempit.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

### Task 2: Docs, gate, PR

**Files:**
- Modify: `docs/Design.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Add a row to `docs/Design.md` §4.3's block table**

Add to the Struktur group:

```markdown
| | wadah sejajar [posisi] { … } | `<div style="display:flex;justify-content:…;flex-wrap:wrap">` |
```

Also add one sentence right after the table (or extend the sentence PR-F1 added about image width, if that PR already merged): "Wadah Sejajar adalah satu-satunya blok yang menyusun gaya dari field-nya sendiri alih-alih lewat blok Gaya pembungkus — lihat catatan arsitektur di `docs/superpowers/specs/2026-09-21-curriculum-gap-blocks-design.md`."

- [ ] **Step 2: Add/extend the ROADMAP entry**

Same rule as PR-F2's Task 2 Step 2: extend the existing Fase F paragraph with `**PR-F3:** blok Wadah Sejajar (\`<div>\` flex dasar: rata kiri/tengah/kanan/renggang/sebar rata, \`flex-wrap\` selalu aktif).` if a Fase F paragraph already exists, otherwise add a fresh one covering only PR-F3.

- [ ] **Step 3: Full gate**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`
Expected: all green.

- [ ] **Step 4: Commit, push, open PR**

```bash
git add docs/Design.md docs/ROADMAP.md
git commit -m "docs: Design.md + ROADMAP entry for Fase F PR-F3

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
git push -u origin fase-f3-flex-row-block
gh pr create --base main --title "Fase F · PR-F3 — Blok Wadah Sejajar (Flexbox dasar)" --body "$(cat <<'EOF'
## Ringkasan

Menutup gap kurikulum kelas 6 Pertemuan 15-16, 19-20 (Flexbox) — dasar seluruh Semester Genap kurikulum yang sebelumnya tidak bisa dikerjakan sama sekali di editor.

- `html_row` ("Wadah Sejajar"): `<div style="display:flex;justify-content:…;flex-wrap:wrap">`.
- Dropdown posisi 5 opsi (rata kiri/tengah/rata kanan/renggang/sebar rata), sesuai istilah yang dipakai kurikulum.
- `flex-wrap:wrap` selalu aktif (bukan pilihan) — supaya di pratinjau sempit, kotak yang dijajarkan turun ke baris berikutnya, tidak meluber.
- Ini blok Struktur, bukan blok Gaya — dijelaskan kenapa di spec (blok Gaya menempel per-anak, Flexbox butuh satu pembungkus).

Spec: `docs/superpowers/specs/2026-09-21-curriculum-gap-blocks-design.md`

## Tes

- Unit baru: tiap opsi justify-content, default aman untuk nilai tak dikenal, gabungan dengan blok Gaya lain yang membungkus dari luar.
- E2E baru: wadah sejajar dirakit dan diperiksa di panel Lihat Kode.
- Gate penuh hijau.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
EOF
)"
```

Stop after `gh pr create`. The user merges.

---

## Self-Review

**1. Spec coverage**

| Spec item | Task |
|---|---|
| PR-F1: `html_list_ordered`, `header/main/footer`, image `WIDTH`, 5 style blocks | PR-F1 Task 1 |
| PR-F1 `WIDTH` default `''` = no visual change to old projects | PR-F1 Task 1 Step 1 (test), Step 3 (`''` listed first) |
| PR-F2: `html_table`/`html_table_row`/`html_table_cell`, border always on | PR-F2 Task 1 |
| PR-F3: `html_row` flex container, 5 justify options, `flex-wrap:wrap` always on | PR-F3 Task 1 |
| No theme/icon/i18n changes needed | Global Constraints; no task touches those files |
| No new validation/type-checking on statement connections | Global Constraints; no task adds `check` to new `previousStatement`/`nextStatement` |
| Design.md/ROADMAP.md incremental updates (not rewrites) | Task 2 of each PR |
| Testing: unit (defs generic loop + specific), e2e per PR | Present in every Task 1 |

No uncovered spec requirement.

**2. Placeholder scan**

No "TBD"/"handle edge cases" without code. Every block definition, generator case, toolbox entry, and test is given in full. The one explicit judgment call left to the implementer (PR-F3 Task 1 Step 5/8, style-fragment join order) is flagged as exactly that — resolve it by running the real code, not guessing — which is the correct way to handle a genuinely implementation-order-dependent assertion rather than a placeholder.

**3. Type consistency**

- `emitContainer`'s `tag` parameter is widened identically across PR-F1/F2/F3 (each task's Step 7 shows the full expected union at that point) — if PRs land in order F1→F2→F3, each widening step is a strict superset of the last; if they land out of order, each task's instruction to "add X if not already present" avoids a duplicate-type union error.
- `styleFragment()`'s new cases (Step 7 of PR-F1 Task 1) use the same `field()`/`Set.has()` fallback pattern as every existing case — no new helper invented.
- `emitTable()` (PR-F2) and the `html_row` case (PR-F3) both call the pre-existing `emitContainer` with the same 6-argument signature already used everywhere else in the file.
- Every new block type appended to `HTML_BLOCK_TYPES` in `blocks.ts` has a matching `registerHtmlBlocks()` definition in the same task, and a matching `emitBlock`/`styleFragment` case in `generator.ts` in the same task — no block is defined without generator support or vice versa.

No inconsistencies found.
