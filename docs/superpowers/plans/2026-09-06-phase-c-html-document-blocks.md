# Fase C — HTML Document Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional `<html>` / `<head>` / `<body>` / `<title>` blocks to HTML mode, change `generateHtml`'s contract to carry head content, show the full document in "Lihat Kode", relabel the style blocks to real CSS property names, and add per-block tooltips plus an "Info blok" strip.

**Architecture:** Four new C-blocks in `src/blocks/html/blocks.ts` (top of the Struktur category). `generateHtml` returns `{ headHtml, bodyHtml, assetIds }`: the first top-level `html_document` drives the page (its `html_head` → `<title>`, its `html_body` → body); with no `html_document`, `headHtml` is `''` and every top-level block is body content — byte-identical to today. `runtime/html/document.ts` gains a `headHtml` option on `wrapBodyInDocument` (real preview/export, keeps CSP) plus a new `composeDisplayDocument()` (kid-facing full doc for the code panel, no CSP). A new `src/app/editor/html-mode/block-info.ts` wires a click-delegated selection watcher to a read-only strip.

**Tech Stack:** Blockly 11.2.2, Vite 6, TypeScript strict (`noUncheckedIndexedAccess`), Vitest + jsdom, Playwright, Prettier + ESLint 9. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-09-06-phase-c-html-document-blocks-design.md`

## Global Constraints

- **No new npm dependencies. No CDN.**
- **Renderer, Blockly theme, and existing block *field names* are frozen.** Style blocks change `message0` only — `COLOR` / `ALIGN` / `SIZE` / `BODY` and every dropdown value string stay exactly as they are.
- **`generateHtml` new return shape: `{ headHtml: string; bodyHtml: string; assetIds: string[] }`.** With no `html_document` block, `headHtml === ''` and `bodyHtml` is byte-identical to the current output for the same blocks (there is an equivalence test).
- **The CSP `<meta>` and `<meta charset>` are mandatory in preview and export** (`wrapBodyInDocument`) and **must not appear in the code panel** (`composeDisplayDocument`).
- **`migrateHtmlWorkspaceJson` is not touched.** Old projects hit the no-document fallback.
- **Tooltips:** every one of the 21 HTML block types gets a non-empty Indonesian `tooltip`.
- **Block-info wiring uses click delegation** on `#htmlBlocklyDiv` + a microtask + `Blockly.getSelected()` — NOT a `Blockly.Events.SELECTED` change listener (Fase B1 lesson: `TOOLBOX_ITEM_SELECT` never reached `addChangeListener`; do not assume `SELECTED` does either).
- **Formatting:** run `npm run format` after editing files in a task, before its lint/commit step. A Prettier-only lint failure is fixed with `npm run format`, never by hand, and is not a reason to stop.
- **Commit trailers** — every commit message ends with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf
  ```
- **Full gate (green before the PR):** `npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e`.

---

### Task 1: New blocks + tooltips + style-label relabel

**Files:**
- Modify: `src/blocks/html/blocks.ts`
- Modify: `src/blocks/html/toolbox.ts`
- Modify: `tests/unit/blocks-html-defs.test.ts`
- Modify: `tests/unit/blocks-toolbox-icons.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `HTML_BLOCK_TYPES` gains `'html_document'`, `'html_head'`, `'html_body'`, `'html_title'`. Every HTML block def has a `tooltip`. Style blocks' `message0` are CSS-property strings. Struktur toolbox lists the 4 new blocks first. Task 2's generator relies on the new block types + input names (`CONTENT` on document/head/body, `TEXT` on title).

- [ ] **Step 1: Update `blocks-html-defs.test.ts` (will fail)**

Add to the `HTML block definitions` describe:

```ts
  it('registers the four document-skeleton blocks', () => {
    for (const type of ['html_document', 'html_head', 'html_body', 'html_title']) {
      expect(HTML_BLOCK_TYPES).toContain(type);
      expect(Blockly.Blocks[type], `missing ${type}`).toBeTruthy();
    }
  });

  it('gives every HTML block a non-empty Indonesian tooltip', () => {
    const ws = new Blockly.Workspace();
    for (const type of HTML_BLOCK_TYPES) {
      const b = ws.newBlock(type);
      const tip = typeof b.tooltip === 'function' ? b.tooltip() : b.tooltip;
      expect(typeof tip === 'string' && tip.trim().length > 0, `no tooltip on ${type}`).toBe(true);
    }
    ws.dispose();
  });
```

Add a new describe:

```ts
describe('HTML document + style block labels', () => {
  it('document skeleton blocks show their real tags', () => {
    expect(message0('html_document')).toContain('<html>');
    expect(message0('html_document')).toContain('</html>');
    expect(message0('html_head')).toContain('<head>');
    expect(message0('html_body')).toContain('<body>');
    expect(message0('html_title')).toContain('<title>');
  });

  it.each([
    ['html_style_color', 'color:'],
    ['html_style_bg', 'background:'],
    ['html_style_align', 'text-align:'],
    ['html_style_size', 'font-size:'],
    ['html_style_bold', 'font-weight: bold'],
    ['html_style_italic', 'font-style: italic'],
  ])('%s label is CSS-property notation (%s)', (type, needle) => {
    expect(message0(type)).toContain(needle);
  });

  it('style blocks keep their field names', () => {
    const ws = new Blockly.Workspace();
    expect(ws.newBlock('html_style_color').getField('COLOR')).toBeTruthy();
    expect(ws.newBlock('html_style_align').getField('ALIGN')).toBeTruthy();
    expect(ws.newBlock('html_style_size').getField('SIZE')).toBeTruthy();
    ws.dispose();
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test -- blocks-html-defs`
Expected: FAIL (new types not in `HTML_BLOCK_TYPES`, no tooltips).

- [ ] **Step 3: Edit `src/blocks/html/blocks.ts`**

Extend `HTML_BLOCK_TYPES` — insert the four new types **at the front**:

```ts
export const HTML_BLOCK_TYPES = [
  'html_document',
  'html_head',
  'html_body',
  'html_title',
  'html_section',
  // …rest unchanged…
] as const;
```

Inside `registerHtmlBlocks()`, in the `defineBlocksWithJsonArray([...])` array, add these four objects **first** (before `html_section`):

```ts
    {
      type: 'html_document',
      message0: '<html> %1 </html>',
      args0: [{ type: 'input_statement', name: 'CONTENT' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
      tooltip: 'Kerangka satu halaman HTML lengkap (<html>).',
    },
    {
      type: 'html_head',
      message0: '<head> %1 </head>',
      args0: [{ type: 'input_statement', name: 'CONTENT' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
      tooltip: 'Bagian info halaman yang tak tampil di layar, mis. judul tab (<head>).',
    },
    {
      type: 'html_body',
      message0: '<body> %1 </body>',
      args0: [{ type: 'input_statement', name: 'CONTENT' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
      tooltip: 'Isi halaman yang tampil di layar (<body>).',
    },
    {
      type: 'html_title',
      message0: '<title> %1 </title>',
      args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
      tooltip: 'Judul halaman yang muncul di tab browser (<title>).',
    },
```

Add a `tooltip` field to **every** other block object in the array (do not change anything else on them). Use exactly:

| type | tooltip |
| --- | --- |
| `html_section` | `Satu bagian halaman untuk mengelompokkan isi (<section>).` |
| `html_heading` | `Judul bagian dengan ukuran h1, h2, atau h3 (<h1>).` |
| `html_paragraph` | `Satu paragraf teks (<p>).` |
| `html_list` | `Daftar berpoin (<ul>) — isi dengan blok <li>.` |
| `html_list_item` | `Satu butir di dalam daftar (<li>).` |
| `html_text` | `Sepotong teks biasa untuk diisikan ke blok lain.` |
| `html_image_asset` | `Menampilkan gambar dari pustaka aset (<img>).` |
| `html_image_url` | `Menampilkan gambar dari alamat web (<img>).` |
| `html_link` | `Tautan yang bisa diklik ke halaman lain (<a>).` |
| `html_button` | `Tombol yang bisa ditekan (<button>).` |
| `html_hr` | `Garis pemisah mendatar (<hr>).` |
| `html_style_color` | `Mengubah warna teks isinya (CSS color).` |
| `html_style_bg` | `Mengubah warna latar isinya (CSS background).` |
| `html_style_align` | `Mengatur perataan teks isinya: kiri, tengah, kanan (CSS text-align).` |
| `html_style_size` | `Mengubah ukuran teks isinya (CSS font-size).` |
| `html_style_bold` | `Menebalkan teks isinya (CSS font-weight: bold).` |
| `html_style_italic` | `Memiringkan teks isinya (CSS font-style: italic).` |

Change the six style `message0` values (nothing else on those objects):

| type | new `message0` |
| --- | --- |
| `html_style_color` | `'color: %1 %2'` |
| `html_style_bg` | `'background: %1 %2'` |
| `html_style_align` | `'text-align: %1 %2'` |
| `html_style_size` | `'font-size: %1 %2'` |
| `html_style_bold` | `'font-weight: bold %1'` |
| `html_style_italic` | `'font-style: italic %1'` |

- [ ] **Step 4: Edit `src/blocks/html/toolbox.ts`**

In the `Struktur` category `contents`, prepend the four blocks:

```ts
      contents: [
        { kind: 'block', type: 'html_document' },
        { kind: 'block', type: 'html_head' },
        { kind: 'block', type: 'html_title', inputs: { TEXT: textShadow('Halaman Saya') } },
        { kind: 'block', type: 'html_body' },
        { kind: 'block', type: 'html_section' },
        { kind: 'block', type: 'html_heading', inputs: { TEXT: textShadow() } },
        { kind: 'block', type: 'html_paragraph', inputs: { TEXT: textShadow() } },
        { kind: 'block', type: 'html_list' },
        { kind: 'block', type: 'html_list_item', inputs: { TEXT: textShadow() } },
      ],
```

- [ ] **Step 5: `blocks-toolbox-icons.test.ts`**

If any test there enumerates the Struktur block list exactly, update it to expect `html_document`, `html_head`, `html_title`, `html_body` first. If it only checks `cssconfig`/icon classes per category (not block lists), no change needed — run it to confirm.

- [ ] **Step 6: Run — must pass**

Run: `npm test -- blocks-html-defs blocks-toolbox-icons`
Expected: PASS.

- [ ] **Step 7: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/blocks/html/blocks.ts src/blocks/html/toolbox.ts tests/unit/blocks-html-defs.test.ts tests/unit/blocks-toolbox-icons.test.ts
git commit -m "feat(html): <html>/<head>/<body>/<title> blocks, tooltips, CSS-property style labels

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 2: Generator contract + head emission + `<section>` fix

**Files:**
- Modify: `src/blocks/html/generator.ts`
- Modify: `tests/unit/blocks-html-generator.test.ts`

**Interfaces:**
- Consumes: block types + input names from Task 1
- Produces: `generateHtml(ws): { headHtml: string; bodyHtml: string; assetIds: string[] }`. Task 3/4/7 consume `headHtml`.

- [ ] **Step 1: Update `blocks-html-generator.test.ts`**

Change `GeneratedHtml`-shape expectations:
- `it('returns an empty result for an empty workspace')` → `expect(generateHtml(workspace)).toEqual({ headHtml: '', bodyHtml: '', assetIds: [] })`.
- `it('emits and tracks an asset image while escaping alt text')` → add `headHtml: ''` to the `toEqual({...})`.
- The three `html_section` tests currently expecting `<div>` → change to `<section>`:
  - `'indents section children by two spaces'` → `'<section>\n  <p>A</p>\n  <p>B</p>\n</section>\n'`
  - `'emits an html_text value inside a paragraph in a section'` → `'<section>\n  <p>Isi</p>\n</section>\n'`
  - `'applies style wrappers directly to section and list opening tags'` → `'<section style="font-weight:bold">\n</section>\n<ul style="font-style:italic">\n</ul>\n'`

Add new cases:

```ts
  it('renders the full document skeleton via html_document', () => {
    const doc = statement(workspace, 'html_document');
    const head = statement(workspace, 'html_head');
    const title = statement(workspace, 'html_title');
    const body = statement(workspace, 'html_body');
    const p = statement(workspace, 'html_paragraph');
    connectText(title, 'Halaman Saya');
    connectText(p, 'Halo');
    connectStatement(body, 'CONTENT', p);
    connectStatement(head, 'CONTENT', title);
    append(head, body);
    connectStatement(doc, 'CONTENT', head);

    const out = generateHtml(workspace);
    expect(out.headHtml).toBe('<title>Halaman Saya</title>\n');
    expect(out.bodyHtml).toBe('<p>Halo</p>\n');
  });

  it('ignores loose top-level blocks when an html_document is present', () => {
    const doc = statement(workspace, 'html_document');
    const body = statement(workspace, 'html_body');
    const inside = statement(workspace, 'html_paragraph');
    connectText(inside, 'dipakai');
    connectStatement(body, 'CONTENT', inside);
    connectStatement(doc, 'CONTENT', body);

    const loose = statement(workspace, 'html_paragraph');
    connectText(loose, 'diabaikan');
    loose.moveBy(0, 200);

    const out = generateHtml(workspace);
    expect(out.bodyHtml).toBe('<p>dipakai</p>\n');
    expect(out.bodyHtml).not.toContain('diabaikan');
  });

  it('no html_document: headHtml is empty and body matches the flat output', () => {
    const first = statement(workspace, 'html_paragraph');
    connectText(first, 'a');
    const second = statement(workspace, 'html_paragraph');
    connectText(second, 'b');
    second.moveBy(0, 100);
    const out = generateHtml(workspace);
    expect(out.headHtml).toBe('');
    expect(out.bodyHtml).toBe('<p>a</p>\n<p>b</p>\n');
  });

  it('ignores a <body> or <title> placed in the body path', () => {
    const outerBody = statement(workspace, 'html_document');
    const b1 = statement(workspace, 'html_body');
    const nestedBody = statement(workspace, 'html_body');
    const title = statement(workspace, 'html_title');
    const p = statement(workspace, 'html_paragraph');
    connectText(title, 'x');
    connectText(p, 'ok');
    append(p, nestedBody);
    append(nestedBody, title);
    connectStatement(b1, 'CONTENT', p);
    connectStatement(outerBody, 'CONTENT', b1);
    expect(generateHtml(workspace).bodyHtml).toBe('<p>ok</p>\n');
  });
```

- [ ] **Step 2: Run — must fail**

Run: `npm test -- blocks-html-generator`
Expected: FAIL (shape + `<section>` + new cases).

- [ ] **Step 3: Edit `src/blocks/html/generator.ts`**

Change the type:

```ts
export type GeneratedHtml = {
  headHtml: string;
  bodyHtml: string;
  assetIds: string[];
};
```

`emitContainer` — allow `'section'`:

```ts
function emitContainer(
  block: Blockly.Block,
  inputName: string,
  tag: 'section' | 'ul',
  depth: number,
  assetIds: string[],
  styleFragments: string[],
): string {
```

`emitBlock` — `html_section` case:

```ts
    case 'html_section':
      return emitContainer(block, 'BODY', 'section', depth, assetIds, styleFragments);
```

`emitBlock` — add cases that render nothing when a skeleton block is reached on the body walk (they are only meaningful at the top, handled by `generateHtml`):

```ts
    case 'html_document':
    case 'html_head':
    case 'html_body':
    case 'html_title':
      return '';
```

Add helpers + `emitHead` above `generateHtml`:

```ts
function firstChildOfType(
  block: Blockly.Block,
  inputName: string,
  type: string,
): Blockly.Block | null {
  let current = block.getInputTargetBlock(inputName);
  while (current) {
    if (current.type === type) return current;
    current = current.getNextBlock();
  }
  return null;
}

function emitHead(headBlock: Blockly.Block): string {
  const title = firstChildOfType(headBlock, 'CONTENT', 'html_title');
  if (!title) return '';
  return `<title>${escapeHtmlText(textInput(title, 'TEXT'))}</title>\n`;
}
```

Rewrite `generateHtml`:

```ts
export function generateHtml(workspace: Blockly.Workspace): GeneratedHtml {
  const assetIds: string[] = [];
  const top = workspace.getTopBlocks(true);
  const doc = top.find((b) => b.type === 'html_document') ?? null;

  if (doc) {
    const head = firstChildOfType(doc, 'CONTENT', 'html_head');
    const body = firstChildOfType(doc, 'CONTENT', 'html_body');
    const headHtml = head ? emitHead(head) : '';
    const bodyHtml = body
      ? emitChain(body.getInputTargetBlock('CONTENT'), 0, assetIds)
      : '';
    return { headHtml, bodyHtml, assetIds };
  }

  let bodyHtml = '';
  for (const block of top) {
    bodyHtml += emitChain(block, 0, assetIds);
  }
  return { headHtml: '', bodyHtml, assetIds };
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test -- blocks-html-generator`
Expected: PASS.

- [ ] **Step 5: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/blocks/html/generator.ts tests/unit/blocks-html-generator.test.ts
git commit -m "feat(html): generator emits { headHtml, bodyHtml, assetIds }; <section> fix

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 3: `document.ts` — `headHtml` option + `composeDisplayDocument`

**Files:**
- Modify: `src/runtime/html/document.ts`
- Create: `tests/unit/html-document.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces:
  - `wrapBodyInDocument(title, bodyHtml, opts?: { lang?: string; headHtml?: string })` — when `opts.headHtml` contains `<title`, it is inserted verbatim and the auto `<title>` is skipped
  - `composeDisplayDocument(input: { headHtml: string; bodyHtml: string; lang?: string; fallbackTitle: string }): string` — a multi-line, CSP-free full document for the code panel

- [ ] **Step 1: Write `tests/unit/html-document.test.ts` (failing)**

```ts
import { describe, expect, it } from 'vitest';
import { composeDisplayDocument, wrapBodyInDocument } from '../../src/runtime/html/document';

describe('wrapBodyInDocument', () => {
  it('keeps the CSP + charset meta and auto title when no headHtml', () => {
    const doc = wrapBodyInDocument('Proyek', '<p>x</p>');
    expect(doc).toContain('Content-Security-Policy');
    expect(doc).toContain('<meta charset="utf-8">');
    expect(doc).toContain('<title>Proyek</title>');
    expect(doc).toContain('<body><p>x</p></body>');
  });

  it('uses the block-provided <title> and drops the auto one', () => {
    const doc = wrapBodyInDocument('Proyek', '<p>x</p>', {
      headHtml: '<title>Dari Blok</title>\n',
    });
    expect(doc).toContain('<title>Dari Blok</title>');
    expect(doc).not.toContain('<title>Proyek</title>');
    expect(doc).toContain('Content-Security-Policy');
  });
});

describe('composeDisplayDocument', () => {
  it('produces a multi-line CSP-free full document', () => {
    const out = composeDisplayDocument({
      headHtml: '<title>Halaman Saya</title>\n',
      bodyHtml: '<p>Halo</p>\n',
      fallbackTitle: 'Proyek',
    });
    expect(out).toContain('<!doctype html>');
    expect(out).toContain('<html lang="id">');
    expect(out).toContain('<head>');
    expect(out).toContain('<title>Halaman Saya</title>');
    expect(out).toContain('<body>');
    expect(out).toContain('<p>Halo</p>');
    expect(out).toContain('</html>');
    expect(out).not.toContain('Content-Security-Policy');
    expect(out).not.toContain('<meta charset');
    expect(out.split('\n').length).toBeGreaterThan(5);
  });

  it('falls back to the project title when headHtml is empty', () => {
    const out = composeDisplayDocument({ headHtml: '', bodyHtml: '', fallbackTitle: 'Proyek' });
    expect(out).toContain('<title>Proyek</title>');
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test -- html-document`
Expected: FAIL (`composeDisplayDocument` not exported).

- [ ] **Step 3: Edit `src/runtime/html/document.ts`**

```ts
import { escapeHtmlAttr, escapeHtmlText } from './escape';

export const HTML_DOCUMENT_RESET =
  '*{box-sizing:border-box} body{margin:16px;font-family:system-ui,sans-serif;line-height:1.5} img{max-width:100%}';

export function wrapBodyInDocument(
  title: string,
  bodyHtml: string,
  opts: { lang?: string; headHtml?: string } = {},
): string {
  const lang = escapeHtmlAttr(opts.lang ?? 'id');
  const headHtml = opts.headHtml ?? '';
  const titleTag = /<title[\s>]/i.test(headHtml)
    ? headHtml
    : `<title>${escapeHtmlText(title)}</title>`;
  return (
    `<!doctype html><html lang="${lang}"><head>` +
    '<meta charset="utf-8">' +
    "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'none'; object-src 'none'; base-uri 'none'\">" +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    titleTag +
    `<style>${HTML_DOCUMENT_RESET}</style>` +
    `</head><body>${bodyHtml}</body></html>`
  );
}

export function composeDisplayDocument(input: {
  headHtml: string;
  bodyHtml: string;
  lang?: string;
  fallbackTitle: string;
}): string {
  const lang = escapeHtmlAttr(input.lang ?? 'id');
  const titleLine = /<title[\s>]/i.test(input.headHtml)
    ? input.headHtml.trim()
    : `<title>${escapeHtmlText(input.fallbackTitle)}</title>`;
  return [
    '<!doctype html>',
    `<html lang="${lang}">`,
    '<head>',
    titleLine,
    '</head>',
    '<body>',
    input.bodyHtml.replace(/\n$/, ''),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test -- html-document`
Expected: PASS.

- [ ] **Step 5: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/runtime/html/document.ts tests/unit/html-document.test.ts
git commit -m "feat(html): document.ts — headHtml option + composeDisplayDocument for the code panel

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 4: Thread `headHtml` through preview + export

**Files:**
- Modify: `src/runtime/html/preview.ts`
- Modify: `src/runtime/html/export.ts`
- Modify: `tests/unit/html-export.test.ts`

**Interfaces:**
- Consumes: `generateHtml` new shape (Task 2), `wrapBodyInDocument` new opts (Task 3)
- Produces:
  - `HtmlPreview.update(bodyHtml: string, headHtml?: string)`
  - `buildStandaloneDocument(title, bodyHtml, assets, headHtml?)`

- [ ] **Step 1: `preview.ts`**

- `HtmlPreview` type: `update(bodyHtml: string, headHtml?: string): void`.
- Add `let pendingHead: string | undefined;`.
- In `update`: `pendingHead = headHtml;` alongside `pendingBody = bodyHtml;`.
- In `render`: capture `const headHtml = pendingHead ?? ''; pendingHead = undefined;` and pass `{ headHtml }` as the 3rd arg:
  ```ts
  iframe.srcdoc = wrapBodyInDocument(
    iframe.title || 'Pratinjau',
    resolveAssetSources(bodyHtml, opts.getAssets()),
    { headHtml },
  );
  ```
- `dispose()`: also `pendingHead = undefined;`.

- [ ] **Step 2: `export.ts`**

```ts
export function buildStandaloneDocument(
  title: string,
  bodyHtml: string,
  assets: Record<string, { ref: string }>,
  headHtml = '',
): string {
  return wrapBodyInDocument(title, inlineAssetSources(bodyHtml, assets), { headHtml });
}
```

In `exportHtmlProject`:

```ts
    const { headHtml, bodyHtml } = generateHtml(workspace);
    const html = buildStandaloneDocument(project.meta.name, bodyHtml, project.assets, headHtml);
```

- [ ] **Step 3: `html-export.test.ts`**

- Any `generateHtml(...)` destructure or `buildStandaloneDocument(...)` call: add `headHtml`.
- Add a case: a workspace with `html_document > html_head > html_title("Halaman Saya")` and a `html_body > html_paragraph`, export, and assert the produced HTML contains `<title>Halaman Saya</title>` and the paragraph, and still contains `Content-Security-Policy`.

- [ ] **Step 4: Run — must pass**

Run: `npm test -- html-export preview`
Expected: PASS.

- [ ] **Step 5: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/runtime/html/preview.ts src/runtime/html/export.ts tests/unit/html-export.test.ts
git commit -m "feat(html): pass headHtml through preview + export

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 5: `block-info.ts` — the "Info blok" strip

**Files:**
- Create: `src/app/editor/html-mode/block-info.ts`
- Test: `tests/unit/block-info.test.ts`

**Interfaces:**
- Consumes: `#htmlBlocklyDiv`, a strip element
- Produces: `attachBlockInfo(workspace: Blockly.WorkspaceSvg, el: HTMLElement | null): () => void`

- [ ] **Step 1: Write `tests/unit/block-info.test.ts` (failing)**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import type * as Blockly from 'blockly/core';
import { attachBlockInfo, BLOCK_INFO_HINT } from '../../src/app/editor/html-mode/block-info';

afterEach(() => {
  document.body.innerHTML = '';
});

function harness(selected: { tooltip: string | (() => string) } | null) {
  document.body.innerHTML =
    '<div id="htmlBlocklyDiv"></div><p data-block-info></p>';
  const el = document.querySelector<HTMLElement>('[data-block-info]')!;
  const host = document.querySelector<HTMLElement>('#htmlBlocklyDiv')!;
  const ws = {
    getInjectionDiv: () => document.body,
    addChangeListener: () => {},
    removeChangeListener: () => {},
  } as unknown as Blockly.WorkspaceSvg;
  return { el, host, ws, selected };
}

describe('attachBlockInfo', () => {
  it('shows the hint when nothing is selected', () => {
    const h = harness(null);
    attachBlockInfo(h.ws, h.el);
    expect(h.el.textContent).toBe(BLOCK_INFO_HINT);
  });

  it('shows the selected block tooltip on a click in the workspace', async () => {
    const h = harness({ tooltip: () => 'Satu paragraf teks (<p>).' });
    attachBlockInfo(h.ws, h.el, () => h.selected as unknown as Blockly.Block);
    h.host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => queueMicrotask(() => r(null)));
    expect(h.el.textContent).toContain('Satu paragraf teks');
  });

  it('returns to the hint when the click resolves to no block', async () => {
    const h = harness(null);
    attachBlockInfo(h.ws, h.el, () => null);
    h.host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => queueMicrotask(() => r(null)));
    expect(h.el.textContent).toBe(BLOCK_INFO_HINT);
  });

  it('disposer removes the listener; el null is a no-op', () => {
    const h = harness(null);
    const stop = attachBlockInfo(h.ws, h.el, () => null);
    stop();
    h.host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(h.el.textContent).toBe(BLOCK_INFO_HINT);
    expect(() => attachBlockInfo(h.ws, null)()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run — must fail**

Run: `npm test -- block-info`
Expected: FAIL (module missing).

- [ ] **Step 3: Write `src/app/editor/html-mode/block-info.ts`**

```ts
import * as Blockly from 'blockly/core';

export const BLOCK_INFO_HINT = 'Klik sebuah blok untuk melihat penjelasannya.';

type GetSelected = () => Blockly.Block | null;

const defaultGetSelected: GetSelected = () =>
  (Blockly as unknown as { getSelected?: () => Blockly.Block | null }).getSelected?.() ??
  (Blockly.common as unknown as { getSelected?: () => Blockly.Block | null }).getSelected?.() ??
  null;

function tooltipOf(block: Blockly.Block): string {
  const raw = (block as unknown as { tooltip?: string | (() => string) }).tooltip;
  const text = typeof raw === 'function' ? raw() : (raw ?? '');
  return typeof text === 'string' ? text.trim() : '';
}

/**
 * Mirror the selected block's tooltip into `el`. Uses click delegation on the
 * Blockly injection div (not a `SELECTED` change listener — Fase B1 showed
 * toolbox UI events don't reach `addChangeListener`), plus a workspace change
 * listener so the strip resets when the selected block is deleted.
 * Returns a disposer. `el` null → no-op, never throws.
 */
export function attachBlockInfo(
  workspace: Blockly.WorkspaceSvg,
  el: HTMLElement | null,
  getSelected: GetSelected = defaultGetSelected,
): () => void {
  if (!el) return () => {};
  const host =
    (workspace.getInjectionDiv?.() as HTMLElement | null)?.querySelector<HTMLElement>(
      '#htmlBlocklyDiv',
    ) ??
    (workspace.getInjectionDiv?.() as HTMLElement | null) ??
    null;

  const render = (): void => {
    const block = getSelected();
    const tip = block ? tooltipOf(block) : '';
    el.textContent = tip || BLOCK_INFO_HINT;
  };

  const onClick = (): void => {
    queueMicrotask(render);
  };
  const onChange = (event: Blockly.Events.Abstract): void => {
    if (event.type === Blockly.Events.BLOCK_DELETE || event.type === Blockly.Events.CLICK) {
      queueMicrotask(render);
    }
  };

  render();
  host?.addEventListener('click', onClick);
  workspace.addChangeListener?.(onChange);

  return () => {
    host?.removeEventListener('click', onClick);
    workspace.removeChangeListener?.(onChange);
  };
}
```

- [ ] **Step 4: Run — must pass**

Run: `npm test -- block-info`
Expected: PASS (4 tests). If `Blockly.common` import shape differs, adjust `defaultGetSelected` — the test injects `getSelected`, so the module compiles regardless.

- [ ] **Step 5: Format, typecheck, commit**

```bash
npm run format
npm run typecheck
git add src/app/editor/html-mode/block-info.ts tests/unit/block-info.test.ts
git commit -m "feat(html): block-info module — selected block's tooltip in a strip

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 6: Wire it into HTML mode (refresh contract, code panel, info strip)

**Files:**
- Modify: `src/app/editor/html-mode/html-mode.ts`
- Modify: `src/app/editor/html-mode/code-panel.ts`
- Modify: `src/app/editor/html-mode/html-mode.css`
- Modify: `tests/unit/html-mode-view.test.ts`
- Modify: `tests/unit/html-mode-persistence.test.ts` (only if it asserts code-panel or generateHtml shape)

**Interfaces:**
- Consumes: `generateHtml` (Task 2), `composeDisplayDocument` (Task 3), `preview.update` (Task 4), `attachBlockInfo` (Task 5)
- Produces: the finished HTML mode

- [ ] **Step 1: `code-panel.ts`**

- Rename the `prettyPrintHtml` param `bodyHtml` → `source` (2 spots: signature + the `.trim()` line).
- `HtmlCodePanel` type: `setCode(documentHtml: string): void`.
- `setCode(documentHtml)` body: `const pretty = prettyPrintHtml(documentHtml);` (rename var use).
- No behaviour change beyond the rename — `prettyPrintHtml` already handles arbitrary HTML; `<!doctype html>` is not matched by its tag regexes so it stays at depth 0.

- [ ] **Step 2: `html-mode.ts` — markup**

In the `host.innerHTML` template, inside `.html-mode__toolbar`, add the strip as the **first** child (before the run button):

```html
          <p class="html-mode__blockinfo" data-block-info></p>
          <button type="button" class="html-mode__run" data-run-html aria-label="${t('editor.html.run')}" title="${t('editor.html.run')}">▶</button>
```

- [ ] **Step 3: `html-mode.ts` — imports + wiring**

Add imports:

```ts
import { composeDisplayDocument } from '../../../runtime/html/document';
import { attachBlockInfo } from './block-info';
```

`refresh()`:

```ts
  const refresh = (): void => {
    const { headHtml, bodyHtml } = generateHtml(workspace);
    preview.update(bodyHtml, headHtml);
    codePanel.setCode(
      composeDisplayDocument({ headHtml, bodyHtml, fallbackTitle: project.meta.name }),
    );
  };
```

(`project` is already in scope in `renderHtmlMode` — confirm the param name; it is `project` in the current file.)

After `const detachWash = attachToolboxWash(workspace);` (and the `detachSplit` line from Fase B2), add:

```ts
  const detachInfo = attachBlockInfo(
    workspace,
    host.querySelector<HTMLElement>('[data-block-info]'),
  );
```

Debug hook — extend:

```ts
    __kodakoHtml?: { bodyHtml: () => string; headHtml: () => string };
```

```ts
  debugWindow.__kodakoHtml = {
    bodyHtml: () => generateHtml(workspace).bodyHtml,
    headHtml: () => generateHtml(workspace).headHtml,
  };
```

In the cleanup `return () => { … }`, add `detachInfo();` next to `detachWash();` / `detachSplit();`.

- [ ] **Step 4: `html-mode.css` — strip style**

Add:

```css
.html-mode__blockinfo {
  grid-column: 1 / -1;
  margin: 0;
  padding: 2px 4px;
  font-size: 0.8rem;
  color: #5c7784;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

(The toolbar is `display: grid`; `grid-column: 1 / -1` makes the strip span its own full-width row above the tabs.)

- [ ] **Step 5: `html-mode-view.test.ts`**

- Wherever the mount is asserted, add: `expect(host.querySelector('[data-block-info]')).toBeTruthy();`.
- The "renders preview and code only after Jalankan" / code-panel assertions: the panel now contains the **full document**. Update expectations from body-only substrings to include `<!doctype html>` and `<body>`. If a test asserted the panel is empty before the first `Jalankan`, keep that (still true — `setCode` isn't called until `refresh()` runs on the run click / mount; confirm current behaviour and keep it).
- If a test reads `generateHtml(...).bodyHtml`, it still works (shape only added a key).

- [ ] **Step 6: `html-mode-persistence.test.ts`**

Run it. If it only checks that blocks round-trip / an old `html_page` migrates, no change. If it asserts a `generateHtml` shape or code-panel content, align it (old project → `headHtml: ''`, body unchanged).

- [ ] **Step 7: Format, run the touched unit tests, commit**

```bash
npm run format
npm run typecheck
npm test -- html-mode-view html-mode-persistence code-panel
git add src/app/editor/html-mode/html-mode.ts src/app/editor/html-mode/code-panel.ts src/app/editor/html-mode/html-mode.css tests/unit/html-mode-view.test.ts tests/unit/html-mode-persistence.test.ts
git commit -m "feat(html): full-document code panel + Info blok strip in HTML mode

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

### Task 7: E2E, docs, full gate, PR

**Files:**
- Modify: `tests/e2e/html-mode.spec.ts`
- Modify: `docs/Design.md`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: E2E**

In `tests/e2e/html-mode.spec.ts`, add a test:

```ts
test('document skeleton blocks drive the head + the code panel shows the full page', async ({
  page,
}) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await page.getByRole('tab', { name: 'Mode HTML' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();

  await page.evaluate(() => {
    const w = window as unknown as { Blockly?: any };
    const B = w.Blockly ?? (window as any).__kodakoBlockly;
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_document',
              x: 20,
              y: 20,
              inputs: {
                CONTENT: {
                  block: {
                    type: 'html_head',
                    inputs: {
                      CONTENT: {
                        block: {
                          type: 'html_title',
                          inputs: {
                            TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Halaman Saya' } } },
                          },
                        },
                      },
                    },
                    next: {
                      block: {
                        type: 'html_body',
                        inputs: {
                          CONTENT: {
                            block: {
                              type: 'html_paragraph',
                              inputs: {
                                TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Halo dunia' } } },
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
  await expect(code).toContainText('<!doctype html>');
  await expect(code).toContainText('<title>Halaman Saya</title>');
  await expect(code).toContainText('<body>');
  await expect(code).toContainText('Halo dunia');
  await expect(code).not.toContainText('Content-Security-Policy');
});
```

If the code-panel locator is wrong for this build, inspect via `npm run dev` and use the right one (the `<pre class="hljs">` inside the code tab panel).

- [ ] **Step 2: Run E2E**

Run: `npm run test:e2e`
Expected: all pass (previous count + 1).

- [ ] **Step 3: `docs/Design.md`**

In the HTML mode / block section, add a short paragraph:

```markdown
Blok kerangka dokumen (Fase C): `<html>` / `<head>` / `<body>` / `<title>`
opsional di kategori Struktur. `generateHtml` mengembalikan
`{ headHtml, bodyHtml, assetIds }`; tanpa `html_document` perilakunya sama
seperti sebelumnya (blok top-level = isi body). Panel "Lihat Kode" kini
menampilkan dokumen penuh lewat `composeDisplayDocument` (tanpa meta CSP;
CSP tetap ada di pratinjau & ekspor). Label blok gaya memakai notasi properti
CSS (`color:`, `background:`, `text-align:`, `font-size:`, `font-weight: bold`,
`font-style: italic`). Tiap blok HTML punya `tooltip`; strip "Info blok" di
toolbar keluaran mencerminkan tooltip blok yang dipilih
(`src/app/editor/html-mode/block-info.ts`).
```

Also fix the repo-structure / block list mention if it enumerates HTML blocks.

- [ ] **Step 4: `docs/ROADMAP.md`**

Append after the Fase B lines:

```markdown
Fase C (2026-09-06): blok `<html>`/`<head>`/`<body>`/`<title>` opsional,
panel "Lihat Kode" menampilkan dokumen penuh, label blok gaya = notasi CSS,
tooltip + strip "Info blok" di setiap blok HTML. Lihat
`docs/superpowers/specs/2026-09-06-phase-c-html-document-blocks-design.md`.
```

- [ ] **Step 5: Full gate**

```bash
npm run format
npm run lint && npm run typecheck && npm test && npm run build && npm run check:chunks && npm run test:e2e
```
Expected: all green. Unit count ≈ previous + ~13 (Task 1 +2, Task 2 +4, Task 3 +5, Task 5 +4, minus test edits). `check:chunks` OK (editor entry chunk +2–3 kB, < 400 kB).

- [ ] **Step 6: Commit + PR**

```bash
git add tests/e2e/html-mode.spec.ts docs/Design.md docs/ROADMAP.md
git commit -m "test(html): e2e for the document skeleton + full-doc code panel; docs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
git push -u origin phase-c-html-document-blocks
gh pr create --base main --head phase-c-html-document-blocks \
  --title "Fase C: HTML document blocks + CSS-property style labels + block info" \
  --body "Implements docs/superpowers/specs/2026-09-06-phase-c-html-document-blocks-design.md. Optional <html>/<head>/<body>/<title> blocks (Struktur category); generateHtml -> { headHtml, bodyHtml, assetIds } with a byte-identical fallback when no <html> block is used; 'Lihat Kode' shows the full document via composeDisplayDocument (CSP kept in preview/export, hidden from the panel); style blocks relabelled to real CSS property names (fields/values/generator unchanged); tooltip on every HTML block + an 'Info blok' strip. Also fixes html_section emitting <div>. Full gate green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_013btUoirk4SyfGZ71mExnFf"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
| --- | --- |
| §1 four new blocks in Struktur | Task 1 (defs + toolbox) |
| §1 no `check` restriction; generator filters | Task 2 (`firstChildOfType`, skeleton cases → `''`) |
| §2 `{ headHtml, bodyHtml, assetIds }` + first-of-type precedence + fallback equivalence | Task 2 |
| §2 `<section>` bug fix | Task 2 (step 3) |
| §2 `html_body` CONTENT at depth 0 | Task 2 (`emitChain(body.getInputTargetBlock('CONTENT'), 0, …)`) |
| §3 `wrapBodyInDocument({ headHtml })`, keep CSP | Task 3 |
| §3 `composeDisplayDocument` — multi-line, no CSP | Task 3 |
| §3 preview/export thread `headHtml` | Task 4 |
| §3 code panel shows full doc | Task 6 (steps 1, 3) |
| §3 debug hook `headHtml()` | Task 6 (step 3) |
| §4 style `message0` relabel only | Task 1 (step 3) + defs test |
| §5a tooltips on all 21 | Task 1 (step 3 table) + defs test |
| §5b `block-info.ts` click-delegation + strip | Task 5 + Task 6 (markup/CSS/wiring) |
| §6 migration untouched | not modified |
| Testing section | Tasks 1–7 each carry their tests; E2E in Task 7 |
| Out of scope (`<style>`, `<meta>`, class/id) | nothing here adds them |

No gaps.

**2. Placeholder scan** — every code step has real code; test steps have real assertions. The "inspect the locator if wrong" notes in Task 5 step 4 / Task 7 step 1 are verification fallbacks with a concrete default, not placeholders.

**3. Type consistency** — `GeneratedHtml` = `{ headHtml, bodyHtml, assetIds }` identical in Task 2's def, Tasks 3/4/6 consumers, and self-review. `wrapBodyInDocument(title, bodyHtml, { lang?, headHtml? })` identical Task 3 def / Task 4 callers. `composeDisplayDocument({ headHtml, bodyHtml, lang?, fallbackTitle })` identical Task 3 def / Task 6 caller. `HtmlPreview.update(bodyHtml, headHtml?)` Task 4 def / Task 6 caller. `attachBlockInfo(workspace, el, getSelected?)` Task 5 def / Task 6 caller (2-arg). `HtmlCodePanel.setCode(documentHtml)` Task 6. Input names `CONTENT` (document/head/body) and `TEXT` (title) are identical in Task 1's block defs and Task 2's `firstChildOfType(…, 'CONTENT', …)` / `emitHead` / generator.
