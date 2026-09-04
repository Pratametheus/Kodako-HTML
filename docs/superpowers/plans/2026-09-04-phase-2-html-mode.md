# Fase 2 — Mode HTML: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A child in "Mode HTML" drags blocks (heading, paragraph, image, list, links, buttons, and style wrappers), sees a live sandboxed preview update within ~300 ms, reads the generated `<body>` HTML in a syntax-highlighted read-only panel, and exports a standalone `.html` file that opens in any browser with images intact — and switching Sprite↔HTML never loses work in either mode.

**Architecture:** A second Blockly workspace (same Blockly instance as Phase 1, its own block set + toolbox + theme category colors). `blocks/html/generator.ts` walks the workspace to a pretty-indented HTML string: content blocks emit escaped text nodes / elements, **style wrapper blocks compose a `style="…"` attribute onto their single child element**, `asset:<id>` placeholders are left in `src` for later resolution. `runtime/html/preview.ts` resolves `asset:<id>` → `data:` URLs and writes a full document into an `<iframe sandbox="allow-same-origin">` (no `allow-scripts`) via `srcdoc`, debounced. `runtime/html/export.ts` builds a self-contained `<!doctype html>` document (assets inlined as data URLs) and hands it to `storage.exportHtml`. The HTML-mode UI mounts into the Phase-0 editor's `[data-workspace]` slot when `project.activeMode === 'html'` (currently a placeholder); `editor-view.ts` already has the mode-switch cleanup seam.

**Tech Stack:** Blockly (`blockly/core` + `blockly/blocks`, already a dep), `highlight.js` (new dep, bundled, for the read-only code panel), Vite 6, TypeScript strict, Vitest/jsdom, Playwright. No UI framework. No CDN / no runtime network.

**Spec:** `docs/Design.md` §4.4 (HTML block list), §4.5 (toolbox), §5.2 (HTML→HTML generator), §7.1–7.3 (preview / view-code / export), §8 (editor shell keeps both workspaces serialized); `docs/ROADMAP.md` → "Fase 2 — Mode HTML" (deliverable checklist + "Definisi selesai").

## Global Constraints

Every task's requirements implicitly include this section. Values are exact.

1. **Bahasa Indonesia** for every user-facing string: UI labels, tab names, buttons, error text, **and block captions** (inline in the block JSON `message0`). New UI strings go into `src/app/i18n/id.json` via `t(key)`. Dev-console strings exempt.
2. **No third-party runtime network calls / no CDN.** `blockly` and `highlight.js` are npm deps bundled by Vite. `highlight.js` is imported as `highlight.js/lib/core` + only the `xml` (HTML) language + one bundled CSS theme copied/inlined locally — do NOT `<link>` a CDN stylesheet. Uploaded images become `data:` URLs. External image *URLs* a child types are allowed in the generated markup (they just may not load offline) but the app itself fetches nothing.
3. **Security:** the preview `<iframe>` uses `sandbox="allow-same-origin"` and MUST NOT include `allow-scripts`. There is **no "HTML mentah" block and no script block.** Every piece of child-entered **text** is HTML-escaped (`& < > " '`) before it enters markup; only element structure and a fixed whitelist of style properties come from blocks. Attribute values (URLs, colors, alt text) are attribute-escaped.
4. **TypeScript strict** with `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`. Type-only imports use `import type` / inline `type`. **No `any` in product code** (tests may cast). `npm run typecheck` passes.
5. **Project file:** extension `.ghtml.json`, `formatVersion` stays **`1`**. The `project.html.workspace: Record<string, unknown>` field already exists (Phase 0) and `validate` already checks it — Phase 2 only populates it. No schema bump, no `migrate` branch.
6. **Preview latency:** workspace change → preview refresh debounced ~300 ms (`PREVIEW_DEBOUNCE_MS = 300`); the "Definisi selesai" target is < 500 ms end-to-end.
7. **Mode switch:** changing Sprite↔HTML in the header serializes the outgoing workspace into the project (`project.sprite.sprites[*].script` / `project.html.workspace`) and loads the incoming one; neither is lost. `editor-view.ts` already calls `cleanupMode()` then `renderMode()` on `onModeChange` — hook into that.
8. **Conventional Commits**, one focused commit per task's final step. `.gitattributes` enforces `eol=lf`; run `npm run format` before committing if `prettier --check` complains. Every new file must be `git add`ed — verify `git status --porcelain` clean before reporting a task done.
9. **Reuse Phase 1 infrastructure.** Blockly is already installed and themed (`src/blocks/index.ts` `installSpriteBlockly()`, `src/blocks/theme.ts`). Phase 2 adds a parallel `installHtmlBlockly()` and extends the theme with HTML category colors — it does NOT re-scaffold Blockly. Asset upload + `project.assets` + `resolveAssetUrl` already exist in `src/runtime/sprite/assets.ts` — reuse `resolveAssetUrl` and the `≤ 2 MB` `loadUploadedImage` guard for the HTML image block; do not duplicate them.
10. **Deferred (do NOT build in Phase 2):** CSS beyond the six style wrappers, class/id attributes, nested tables, forms with real submission, the "kirim ke guru" collection workflow, per-block inline preview. Sprite-mode is untouched.

## HTML block set for Phase 2 (the only HTML blocks that exist after this phase)

**Struktur**
- `halaman { … }` — the root; its children become the document `<body>` contents. Exactly one per workspace (top-level).
- `bagian { … }` → `<div>…</div>`
- `judul [teks] ukuran [besar ▾]` — dropdown `besar`→`h1` / `sedang`→`h2` / `kecil`→`h3`
- `paragraf [teks]` → `<p>…</p>`
- `daftar { … }` → `<ul>…</ul>` (children are `item daftar` blocks)
- `item daftar [teks]` → `<li>…</li>`

**Konten**
- `teks [isi]` → an escaped text node (usable inside `paragraf`/`judul`/`item`/`bagian`)
- `gambar aset [aset ▾] teks alt [teks]` and `gambar dari URL [url] teks alt [teks]` — two blocks → `<img src="asset:<id>" alt="…">` / `<img src="<url>" alt="…">`
- `tautan ke [url] tulisan [teks]` → `<a href="<url>">…</a>`
- `tombol [teks]` → `<button type="button">…</button>` (no behaviour)
- `garis pemisah` → `<hr>`

**Gaya (pembungkus — wraps exactly one child block, composes a `style` attribute)**
- `warna teks [warna ▾] { … }` → `color:<c>`
- `warna latar [warna ▾] { … }` → `background:<c>`
- `rata [tengah ▾] { … }` → `text-align:left|center|right` (dropdown `kiri`/`tengah`/`kanan`)
- `ukuran [sedang ▾] { … }` → `font-size:0.85rem|1rem|1.5rem` (dropdown `kecil`/`sedang`/`besar`)
- `tebal { … }` → `font-weight:bold`
- `miring { … }` → `font-style:italic`

Colour dropdown (`warna ▾`): a fixed palette `[['hitam','#000000'],['putih','#ffffff'],['merah','#e53935'],['jingga','#fb8c00'],['kuning','#fdd835'],['hijau','#43a047'],['biru','#1e88e5'],['ungu','#8e24aa'],['merah muda','#ec407a'],['abu-abu','#9e9e9e']]`.

Style wrappers stack: `[tebal]{ [warna teks: merah]{ [paragraf "Hai"] } }` → `<p style="font-weight:bold;color:#e53935">Hai</p>`. A wrapper with no child emits nothing. A wrapper whose child is another wrapper merges down to the innermost element.

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `src/blocks/html/blocks.ts` | JSON defs for every HTML block (captions in Bahasa Indonesia) + `HTML_BLOCK_TYPES` + `setHtmlAssetOptionsProvider` |
| `src/blocks/html/toolbox.ts` | `htmlToolbox` — Struktur / Konten / Gaya categories, shadow text defaults |
| `src/blocks/html/generator.ts` | `generateHtml(workspace): { bodyHtml: string; assetIds: string[] }` — workspace → pretty-indented, escaped HTML; style-wrapper composition |
| `src/runtime/html/escape.ts` | `escapeHtmlText(s)`, `escapeHtmlAttr(s)` — the single source of truth for escaping |
| `src/runtime/html/preview.ts` | `createHtmlPreview(iframe, opts)` → `{ update(bodyHtml, assets), dispose() }` — debounced `srcdoc`, `asset:<id>`→`data:` resolution, sandbox |
| `src/runtime/html/export.ts` | `buildStandaloneDocument(title, bodyHtml, assets)` → full `<!doctype html>` string with inlined assets; `exportHtmlProject(project, storage)` |
| `src/runtime/html/document.ts` | `wrapBodyInDocument(title, bodyHtml, { forExport })` — shared reset CSS + `<head>` used by both preview and export (single source) |
| `src/app/editor/html-mode/html-mode.ts` | `renderHtmlMode(root, deps)` — Blockly workspace + right pane with Pratinjau / Lihat Kode tabs; returns cleanup |
| `src/app/editor/html-mode/code-panel.ts` | `renderCodePanel(host)` → `{ setCode(bodyHtml), dispose() }` — pretty-print + highlight.js, read-only |
| `src/app/editor/html-mode/html-mode.css` | layout |
| `src/core/html-project.ts` | `htmlWorkspaceJson(project)`, `withHtmlWorkspace(project, json)` — read/write `project.html.workspace` |
| `src/styles/hljs-theme.css` | one bundled highlight.js theme, copied locally (no CDN) |
| `tests/unit/blocks-html-*.test.ts`, `tests/unit/html-*.test.ts` | Vitest suites |
| `tests/e2e/html-mode.spec.ts` | Playwright: build a page, preview, view code, export, mode-switch persistence |

**Modified**

| Path | Change |
|---|---|
| `package.json` | add `highlight.js` dep |
| `src/blocks/index.ts` | add `installHtmlBlockly()` (register html blocks + generator); re-export `generateHtml`, `setHtmlAssetOptionsProvider`, `htmlToolbox` |
| `src/blocks/theme.ts` | add `structure_*`, `content_*`, `style_*` block+category styles to `spriteTheme` (rename export to `blocklyTheme` OR keep `spriteTheme` and add a note — pick one, update imports) |
| `src/app/editor/editor-view.ts` | `renderMode()`: when `project.activeMode === 'html'`, mount `renderHtmlMode` into `[data-workspace]` instead of the placeholder text; pass `markDirty: scheduleSave` |
| `src/app/editor/editor-view.ts` header wiring | `onExport` currently calls `storage.exportToFile(project)` (the `.ghtml.json` project file). Keep that. HTML-mode "Ekspor HTML" is a **separate button inside the HTML-mode pane**, calling `exportHtmlProject(project, storage)` → `storage.exportHtml(name, doc)` |
| `src/app/i18n/id.json` | +~22 keys (Task 8) |
| `docs/ROADMAP.md` | tick Fase 2 checkboxes (Task 10) |
| `tests/unit/editor-view.test.ts` | the suite forces `activeMode='html'` (Phase 1 change) — now that HTML mode mounts a real workspace, either switch it to `'sprite'` for the header/placeholder assertions, or stub `renderHtmlMode`. Pick the lighter path and note it. |

---

## Task 1: HTML block definitions + toolbox + registration

**Files:**
- Create: `src/blocks/html/blocks.ts`, `src/blocks/html/toolbox.ts`
- Modify: `src/blocks/index.ts`, `src/blocks/theme.ts`
- Test: `tests/unit/blocks-html-defs.test.ts`

**Interfaces:**
- Consumes: `Blockly` from `../index` (`blockly/core`).
- Produces:
  - `src/blocks/html/blocks.ts` → `export function registerHtmlBlocks(): void` (`Blockly.defineBlocksWithJsonArray([...])` for every block in "HTML block set"), `export const HTML_BLOCK_TYPES: readonly string[]`, `export function setHtmlAssetOptionsProvider(fn: () => [string, string][]): void` (dynamic dropdown for `html_image_asset`'s `ASSET` field; default `[['(tidak ada gambar)', '']]`).
  - `src/blocks/html/toolbox.ts` → `export const htmlToolbox: Blockly.utils.toolbox.ToolboxDefinition` — categories **Struktur** (`structure_category`), **Konten** (`content_category`), **Gaya** (`style_category`); every content/heading/paragraph/item block pre-filled with a `text` shadow `"Tulis di sini"`; the `daftar`/`bagian`/`halaman` blocks and style wrappers appear without shadows.
  - `src/blocks/index.ts` → `export function installHtmlBlockly(): void` (idempotent; `registerHtmlBlocks()` + `registerHtmlGenerator()` from Task 2 — add a stub `registerHtmlGenerator(){}` in `generator.ts` now so this compiles), and re-export `htmlToolbox`, `setHtmlAssetOptionsProvider`.
  - `src/blocks/theme.ts` → extend the existing theme object with `blockStyles`/`categoryStyles` for `structure_*` (blue `#1E88E5`), `content_*` (green `#43A047`), `style_*` (purple `#8E24AA`).

Block `type` names (prefix `html_`): `html_page`, `html_section`, `html_heading`, `html_paragraph`, `html_list`, `html_list_item`, `html_text`, `html_image_asset`, `html_image_url`, `html_link`, `html_button`, `html_hr`, `html_style_color`, `html_style_bg`, `html_style_align`, `html_style_size`, `html_style_bold`, `html_style_italic`.

Shapes:
- `html_page`: no `previousStatement`/`output`; one `input_statement` `BODY`. Top-level only.
- `html_section`, `html_list`: `previousStatement`/`nextStatement`, one `input_statement` (`BODY` / `ITEMS`).
- `html_heading`: `previousStatement`/`nextStatement`; `input_value` `TEXT` + `field_dropdown` `LEVEL` (`[['besar','h1'],['sedang','h2'],['kecil','h3']]`).
- `html_paragraph`, `html_list_item`, `html_button`: `previousStatement`/`nextStatement` + `input_value` `TEXT`.
- `html_text`: `output: 'String'` + `field_input`/`input_value`? — use `input_value` `VALUE` with a `text` shadow so children can be `gabung`-like later; for Phase 2 a `field_input` `VALUE` (default `"Tulis di sini"`) is simpler and sufficient. Use `field_input`.
- `html_image_asset`: `previousStatement`/`nextStatement`; `field_dropdown` `ASSET` (dynamic) + `field_input` `ALT`.
- `html_image_url`: `previousStatement`/`nextStatement`; `field_input` `URL` (default `https://`) + `field_input` `ALT`.
- `html_link`: `previousStatement`/`nextStatement`; `field_input` `URL` + `field_input` `LABEL`.
- `html_hr`: `previousStatement`/`nextStatement`, no inputs.
- Style wrappers (`html_style_*`): `previousStatement`/`nextStatement`; one `input_statement` `BODY`; `html_style_color`/`_bg` also a `field_dropdown` `COLOR` (the palette); `_align` a `field_dropdown` `ALIGN` (`[['kiri','left'],['tengah','center'],['kanan','right']]`); `_size` a `field_dropdown` `SIZE` (`[['kecil','0.85rem'],['sedang','1rem'],['besar','1.5rem']]`).

- [ ] **Step 1: Write the failing test** — `installHtmlBlockly()` idempotent; every `HTML_BLOCK_TYPES` entry in `Blockly.Blocks`; every type instantiates on a headless `new Blockly.Workspace()`; `html_heading` caption contains `judul`; `htmlToolbox` JSON contains `structure_category`, `content_category`, `style_category`.

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement `blocks.ts`** (full `defineBlocksWithJsonArray` array, Bahasa Indonesia `message0`), **`toolbox.ts`**, extend **`theme.ts`**, wire **`index.ts`** (+ `generator.ts` stub).

- [ ] **Step 4: Run — PASS**, then `npm run typecheck && npm run lint`.

- [ ] **Step 5: Commit** — `feat(blocks): HTML block definitions + toolbox + theme colours`

---

## Task 2: HTML generator (`blocks/html/generator.ts` + `runtime/html/escape.ts`)

**Files:**
- Create: `src/runtime/html/escape.ts`, `src/blocks/html/generator.ts` (replace Task-1 stub)
- Modify: `src/blocks/index.ts` (re-export `generateHtml`)
- Test: `tests/unit/html-escape.test.ts`, `tests/unit/blocks-html-generator.test.ts`

**Interfaces:**
- Consumes: `Blockly` from `blockly/core`; block types from Task 1.
- Produces:
  - `src/runtime/html/escape.ts` → `export function escapeHtmlText(s: string): string` (replace `& < >` and also `"` `'` for safety), `export function escapeHtmlAttr(s: string): string` (replace `& < > " '`). Both operate on `String(s)`.
  - `src/blocks/html/generator.ts` → `export function registerHtmlGenerator(): void` (no-op placeholder ok — this generator does NOT use `javascriptGenerator`; it is a hand-written tree walk) and **`export function generateHtml(workspace: Blockly.Workspace): { bodyHtml: string; assetIds: string[] }`**:
    - Find the single top-level `html_page` block (if none, return `{ bodyHtml: '', assetIds: [] }`; if more than one, use the first and ignore the rest).
    - Walk its `BODY` statement chain. Each block → an emitter returning an HTML string (already indented) OR `''`.
    - **Style wrappers**: `emit(styleBlock)` computes its own `style` fragment (e.g. `color:#e53935`), recurses into its single `BODY` child, and if that child's emitted string starts with a single element `<tag ...>...`/`<tag ...>`, **splice the style into that element's opening tag** (merge with an existing `style="…"` by joining with `;`). If the child is itself a wrapper, recursion naturally composes (innermost element accumulates all fragments). If `BODY` is empty → emit `''`.
    - **Text**: `html_text` (a `VALUE` field) and the `TEXT` value inputs of heading/paragraph/list-item — read the connected `html_text` block's field (or, if `TEXT` is a bare `field_input`, read it directly), run `escapeHtmlText`.
    - **Images**: `html_image_asset` → `<img src="asset:<ASSET>" alt="<escapeAttr ALT>">` and push `<ASSET>` (non-empty) to `assetIds`; `html_image_url` → `<img src="<escapeAttr URL>" alt="<escapeAttr ALT>">`.
    - **Links/buttons/hr/section/list/item**: straightforward element emission with escaped text/attrs; 2-space indentation per nesting level; `<ul>`/`<div>` open on their own line, children indented, close on their own line.
    - Output has a trailing newline between siblings, no trailing whitespace on lines. Deterministic (snapshot-testable).

- [ ] **Step 1: Write the failing tests.**
  - `html-escape.test.ts`: `escapeHtmlText('<a> & "x" \'y\'')` → `'&lt;a&gt; &amp; &quot;x&quot; &#39;y&#39;'`; `escapeHtmlAttr` likewise; empty string → empty; non-string coerced.
  - `blocks-html-generator.test.ts` (build workspaces programmatically):
    - empty workspace → `{ bodyHtml: '', assetIds: [] }`.
    - `halaman { paragraf(text "Halo <b>") }` → `bodyHtml` is exactly `<p>Halo &lt;b&gt;</p>\n` (assert exact string).
    - `halaman { judul(besar, text "Judul") }` → `<h1>Judul</h1>\n`.
    - `halaman { bagian { paragraf("A") paragraf("B") } }` → indented `<div>\n  <p>A</p>\n  <p>B</p>\n</div>\n`.
    - `halaman { daftar { item("x") item("y") } }` → `<ul>\n  <li>x</li>\n  <li>y</li>\n</ul>\n`.
    - style compose: `halaman { [tebal]{ [warna teks merah]{ paragraf("Hai") } } }` → `<p style="font-weight:bold;color:#e53935">Hai</p>\n`.
    - style wrapper with empty body → `''`.
    - `halaman { gambar aset "img_1" alt "Kucing <x>" }` → `<img src="asset:img_1" alt="Kucing &lt;x&gt;">\n` and `assetIds` contains `'img_1'`.
    - `halaman { tautan ke "https://a.b" tulisan "klik" }` → `<a href="https://a.b">klik</a>\n`.
    - two `html_page` blocks → only the first is emitted.
    - **Security**: a `paragraf` whose text is `<script>alert(1)</script>` → emitted as `<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>\n` (never a live tag).

- [ ] **Step 2: Run — FAIL. Step 3: Implement. Step 4: Run — PASS**, then `npm run typecheck`.

- [ ] **Step 5: Commit** — `feat(blocks): HTML generator with escaping + style-wrapper composition`

---

## Task 3: Shared document wrapper + sandboxed preview (`runtime/html/document.ts`, `preview.ts`)

**Files:**
- Create: `src/runtime/html/document.ts`, `src/runtime/html/preview.ts`
- Test: `tests/unit/html-preview.test.ts`

**Interfaces:**
- Consumes: `resolveAssetUrl` from `../sprite/assets`; `escapeHtmlAttr` from `./escape`.
- Produces:
  - `document.ts` → `export function wrapBodyInDocument(title: string, bodyHtml: string, opts?: { lang?: string }): string` — `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>escaped</title><style>` + a minimal reset (`*{box-sizing:border-box} body{margin:16px;font-family:system-ui,sans-serif;line-height:1.5} img{max-width:100%}`) + `</style></head><body>` + bodyHtml + `</body></html>`.
  - `preview.ts` → `export const PREVIEW_DEBOUNCE_MS = 300` and
    `export function createHtmlPreview(iframe: HTMLIFrameElement, opts: { getAssets: () => Record<string, { ref: string }>; debounceMs?: number }): { update(bodyHtml: string): void; flush(): void; dispose(): void }`
    - Sets `iframe.setAttribute('sandbox', 'allow-same-origin')` on creation (asserts no `allow-scripts`).
    - `update(bodyHtml)`: debounce; on fire, replace every `src="asset:<id>"` / `src='asset:<id>'` in `bodyHtml` with the resolved `data:`/builtin URL via `resolveAssetUrl(id, getAssets())` (attribute-escaped), unresolved → `src=""`; then `iframe.srcdoc = wrapBodyInDocument(<current title or 'Pratinjau'>, resolvedBody)`.
    - `flush()` runs a pending update immediately (used before export / on mode switch). `dispose()` clears the timer.

- [ ] **Step 1: Write the failing test** (jsdom):
  - `wrapBodyInDocument('A & B', '<p>x</p>')` contains `<title>A &amp; B</title>` and `<p>x</p>` and `<!doctype html>` and NO `<script>`.
  - `createHtmlPreview`: the iframe gets `sandbox="allow-same-origin"` and NOT `allow-scripts`.
  - `update('<img src="asset:builtin:cat">')` then `flush()` → `iframe.srcdoc` contains a `src="data:` or the builtin URL (use `resolveAssetUrl` real; `builtin:cat` exists from Phase 1) and no literal `asset:` remains.
  - `update('<img src="asset:missing">')` + `flush()` → `src=""` (no crash).
  - debounce: two rapid `update()` calls → `srcdoc` set once after `debounceMs` (fake timers).
  - `dispose()` after `update()` but before the timer → `srcdoc` never set.

- [ ] **Step 2: Run — FAIL. Step 3: Implement. Step 4: Run — PASS.**

- [ ] **Step 5: Commit** — `feat(runtime): sandboxed HTML preview + shared document wrapper`

---

## Task 4: Standalone export (`runtime/html/export.ts`)

**Files:**
- Create: `src/runtime/html/export.ts`
- Test: `tests/unit/html-export.test.ts`

**Interfaces:**
- Consumes: `wrapBodyInDocument` from `./document`; `resolveAssetUrl` from `../sprite/assets`; `generateHtml` from `../../blocks/html/generator`; `Blockly` (to load `project.html.workspace` into a headless workspace); `htmlWorkspaceJson` from `../../core/html-project`; `Project`, `Storage` types.
- Produces:
  - `export function buildStandaloneDocument(title: string, bodyHtml: string, assets: Record<string, { ref: string }>): string` — like `wrapBodyInDocument` but every `src="asset:<id>"` is replaced with the fully-inlined `data:` URL (builtin SVGs resolve to their bundled URL — for a truly offline file, fetch+inline is out of scope; leave builtin `src` as the app URL and note it; embedded uploads are already `data:`). Unresolved → `src=""`.
  - `export async function exportHtmlProject(project: Project, storage: Storage): Promise<void>` — load `htmlWorkspaceJson(project)` into a headless `new Blockly.Workspace()` (call `installHtmlBlockly()` first), `generateHtml(ws)`, `ws.dispose()`, `buildStandaloneDocument(project.meta.name, bodyHtml, project.assets)`, then `storage.exportHtml(project.meta.name, doc)`.

- [ ] **Step 1: Write the failing test** — `buildStandaloneDocument('Judul','<p>hi</p>',{})` is a full doc with `<title>Judul</title>`, `<p>hi</p>`, `<!doctype html>`; with `<img src="asset:x">` and `assets={x:{ref:'data:image/png;base64,AAA'}}` → contains `src="data:image/png;base64,AAA"` and no `asset:`; `exportHtmlProject` with a `FakeStorage` (captures `exportHtml(name, html)`) and a `project` whose `html.workspace` is a real serialized `halaman{paragraf("Hai")}` → `storage.exportHtml` called once with `name === project.meta.name` and html containing `<p>Hai</p>`.

- [ ] **Step 2: Run — FAIL. Step 3: Implement. Step 4: Run — PASS.**

- [ ] **Step 5: Commit** — `feat(runtime): standalone .html export for HTML mode`

---

## Task 5: Project workspace wiring (`core/html-project.ts`)

**Files:**
- Create: `src/core/html-project.ts`
- Test: `tests/unit/html-project.test.ts`

**Interfaces:**
- Consumes: `Project` from `./project`.
- Produces:
  - `export function htmlWorkspaceJson(project: Project): Record<string, unknown>` → `project.html.workspace` (or `{}`).
  - `export function withHtmlWorkspace(project: Project, json: Record<string, unknown>): Project` — immutably replace `project.html.workspace`, bump `meta.updatedAt`.

- [ ] **Step 1: Write the failing test** — `htmlWorkspaceJson(createEmptyProject('X'))` → `{}`; `withHtmlWorkspace(p, {blocks:{}})` returns a new project with that workspace, doesn't mutate `p`, and `updatedAt` changed; `validate` still passes on the result.

- [ ] **Step 2: Run — FAIL. Step 3: Implement. Step 4: Run — PASS.**

- [ ] **Step 5: Commit** — `feat(core): per-project HTML workspace read/write helpers`

---

## Task 6: Read-only code panel with syntax highlight (`app/editor/html-mode/code-panel.ts`)

**Files:**
- Modify: `package.json` (add `highlight.js`)
- Create: `src/app/editor/html-mode/code-panel.ts`, `src/styles/hljs-theme.css`
- Test: `tests/unit/html-code-panel.test.ts`

**Interfaces:**
- Consumes: `highlight.js/lib/core` + `highlight.js/lib/languages/xml`.
- Produces:
  - `code-panel.ts` → `export function renderCodePanel(host: HTMLElement): { setCode(bodyHtml: string): void; dispose(): void }` — renders `<pre class="hljs"><code class="language-xml"></code></pre>` (read-only, `contenteditable="false"`), and `setCode` runs the input through a tiny **pretty-printer** (re-indent by 2 spaces per depth using a simple tag-depth counter — the generator already indents, so this can be near-identity; keep it defensive) then `hljs.highlight(pretty, { language: 'xml' }).value` into the `<code>`'s `innerHTML`. Register the `xml` language once at module load.
  - `src/styles/hljs-theme.css` — copy the contents of one highlight.js theme (e.g. `highlight.js/styles/github.css`) into this file at build time (or inline the ~40 rules by hand). It is imported by `code-panel.ts` (`import '../../../styles/hljs-theme.css'`). **Do not** load it from `node_modules` at runtime or via CDN.

- [ ] **Step 1: Install** `npm install highlight.js`; record version.

- [ ] **Step 2: Write the failing test** — `renderCodePanel` into a div → contains `<pre>` + `<code class="language-xml">`; `setCode('<p>hi & bye</p>')` → the `<code>` `innerHTML` contains `hljs`-generated spans (e.g. `class="hljs-`) and the text `hi &amp; bye` (highlighted, still escaped); `setCode` twice replaces content (no append); `dispose()` empties `host`.

- [ ] **Step 3: Implement. Step 4: Run — PASS**, then `npm run build` (confirm no CDN / the CSS is bundled).

- [ ] **Step 5: Commit** — `feat(editor): read-only syntax-highlighted HTML code panel`

---

## Task 7: HTML-mode UI shell + editor wiring (`app/editor/html-mode/html-mode.ts`)

**Files:**
- Create: `src/app/editor/html-mode/html-mode.ts`, `src/app/editor/html-mode/html-mode.css`
- Modify: `src/app/editor/editor-view.ts`, `tests/unit/editor-view.test.ts`
- Test: `tests/unit/html-mode-view.test.ts`

**Interfaces:**
- Consumes: `installHtmlBlockly`, `Blockly`, `blocklyTheme` (or `spriteTheme`), `htmlToolbox`, `setHtmlAssetOptionsProvider`, `generateHtml` from `../../../blocks` / `../../../blocks/html/*`; `createHtmlPreview` from `../../../runtime/html/preview`; `exportHtmlProject` from `../../../runtime/html/export`; `renderCodePanel` from `./code-panel`; `htmlWorkspaceJson`, `withHtmlWorkspace` from `../../../core/html-project`; `BUILTIN_COSTUMES`/`loadUploadedImage` + `resolveAssetUrl` from `../../../runtime/sprite/assets` (reuse for the image block's asset dropdown + upload); `t`; `Project`, `Storage` types.
- Produces:
  - `export type HtmlModeDeps = { project: Project; storage: Storage; markDirty: () => void }`
  - `export function renderHtmlMode(host: HTMLElement, deps: HtmlModeDeps): () => void` — layout (CSS grid): left `#htmlBlocklyDiv` (Blockly inject with `htmlToolbox` + theme + `renderer:'geras'`), right pane with a tab strip **Pratinjau | Lihat Kode** + an **Ekspor HTML** button. Pratinjau tab = the `<iframe>`; Lihat Kode tab = the code panel.
    - `installHtmlBlockly()`; inject; `Blockly.serialization.workspaces.load(htmlWorkspaceJson(project), ws)` (guard empty — if empty, seed a single `html_page` block so the child always has a root).
    - `setHtmlAssetOptionsProvider(() => Object.entries(project.assets).filter(([,a]) => a.kind === 'image').map(([id,a]) => [a.name, id]))`.
    - `ws.addChangeListener(e => { if (e.isUiEvent) return; persist(); refresh(); })` where `persist()` = `deps.project = withHtmlWorkspace(project, Blockly.serialization.workspaces.save(ws))` (mutate in place is fine — match sprite-mode's pattern) then `deps.markDirty()`; `refresh()` = `const { bodyHtml } = generateHtml(ws); preview.update(bodyHtml); codePanel.setCode(bodyHtml);`.
    - **Ekspor HTML** button → `preview.flush()` then `void exportHtmlProject(project, storage).catch(console.error)`.
    - An **Unggah gambar** control (reuse `loadUploadedImage`) that adds to `project.assets` (`source:'embedded'`, `ref:dataUrl`, `kind:'image'`) + `markDirty()` + refreshes the asset dropdown.
    - `refresh()` once on mount. Cleanup: `preview.dispose()`, `codePanel.dispose()`, `ws.dispose()`, remove listeners, final `persist()`.
  - `editor-view.ts` `renderMode()`: replace the `else` branch (currently `workspaceEl.textContent = t('editor.workspacePlaceholder')`) with `cleanupMode = renderHtmlMode(workspaceEl, { project, storage, markDirty: scheduleSave })`. Keep the sprite branch as-is. (There is no third mode, so drop the placeholder entirely.)
  - `tests/unit/editor-view.test.ts`: it currently sets `project.activeMode = 'html'` to hit the placeholder. Change those cases to `'sprite'` is wrong (Phase 1 avoided sprite). Instead: stub `renderHtmlMode` via a module mock (`vi.mock('../../src/app/editor/html-mode/html-mode', () => ({ renderHtmlMode: () => () => {} }))`) so the header/name/autosave assertions still run without mounting Blockly. Note this in the report.

- [ ] **Step 1: Write the failing test** (`html-mode-view.test.ts`, jsdom; if Blockly `inject` is too heavy, use the same stub-factory pattern Phase 1 used for sprite-mode and cover the real inject in E2E — note which):
  - `renderHtmlMode` into a div → contains `#htmlBlocklyDiv`, an `<iframe>` with `sandbox` lacking `allow-scripts`, a `[data-tab="preview"]` + `[data-tab="code"]`, an `[data-export-html]` button.
  - a non-UI Blockly change → `markDirty` called and `project.html.workspace` updated (serialize round-trip).
  - clicking `[data-tab="code"]` shows the code panel; the panel's text reflects a `paragraf` block added to the workspace.
  - `[data-export-html]` → `storage.exportHtml` called with `(project.meta.name, <string containing the body html>)`.
  - switching the workspace to hold a `judul` then re-rendering (simulate mode leave/enter) preserves it via `project.html.workspace`.
  - cleanup empties `host` and disposes the workspace.

- [ ] **Step 2: Run — FAIL. Step 3: Implement. Step 4: Run — PASS**, then `npm run typecheck && npm run lint && npm run build`.

- [ ] **Step 5: Commit** — `feat(editor): HTML mode — Blockly + live preview + code panel + export`

---

## Task 8: i18n keys + Bahasa Indonesia audit

**Files:**
- Modify: `src/app/i18n/id.json`
- Test: extend `tests/unit/i18n.test.ts`

**Interfaces:** add (values in Bahasa Indonesia):
```
editor.html.tabPreview = "Pratinjau"
editor.html.tabCode = "Lihat Kode"
editor.html.exportHtml = "Ekspor HTML"
editor.html.uploadImage = "Unggah gambar"
editor.html.uploadTooBig = "Gambar terlalu besar (maks 2 MB)."
editor.html.uploadNotImage = "File itu bukan gambar."
editor.html.previewTitle = "Pratinjau"
editor.html.emptyHint = "Seret blok dari kategori Struktur untuk mulai."
error.htmlExportFailed = "Gagal mengekspor halaman HTML."
```
Block captions live in `blocks/html/blocks.ts` (already Bahasa Indonesia). Remove the now-unused `editor.workspacePlaceholder` key only if nothing references it after Task 7 (check first; the sprite path may still use it — grep).

- [ ] **Step 1: Add a test** — `t('editor.html.tabCode') === 'Lihat Kode'`; `t('editor.html.uploadTooBig')` contains `2 MB`; extend the English-leak blocklist scan (allow `HTML` as an accepted term, like `Sprite`).

- [ ] **Step 2: FAIL → add keys → PASS.**

- [ ] **Step 3: Commit** — `feat(i18n): Bahasa Indonesia strings for HTML mode`

---

## Task 9: E2E + mode-switch persistence

**Files:**
- Create: `tests/e2e/html-mode.spec.ts`
- Modify: `src/app/editor/html-mode/html-mode.ts` (add a `window.__kodakoHtml` debug hook: `{ bodyHtml: () => <current generateHtml(ws).bodyHtml>, }` — guarded, harmless, mirrors Phase 1's `__kodakoStage`)
- Test: `tests/unit/html-mode-persistence.test.ts` (a pure unit/integration test for the mode-switch, since E2E mode-switch is slower)

**Interfaces:** none new.

- [ ] **Step 1: Write `tests/unit/html-mode-persistence.test.ts`** — with a real `Project` + `WebStorage`: (a) start in `sprite` mode, add a `sprite_move` to sprite 1's workspace via `withSpriteWorkspace`; (b) switch `project.activeMode = 'html'`, add a `html_page{paragraf}` via `withHtmlWorkspace`; (c) `saveProject` → `loadProject`; assert the reloaded project still has the sprite's `sprite_move` script AND the html `html_page`/`html_paragraph` workspace — neither clobbered.

- [ ] **Step 2: Write `tests/e2e/html-mode.spec.ts`**:
  - new project → click the **Mode HTML** toggle in the header → `#htmlBlocklyDiv` visible, `<iframe>` visible.
  - `page.evaluate` loads a known workspace JSON (`html_page` → `judul "Halo"` → `paragraf "Dunia"` → `gambar dari URL "https://x/y.png" alt "gbr"`) via `window.__kodakoBlockly.getMainWorkspace()` + `serialization.workspaces.load` (dragging is flaky).
  - wait for `window.__kodakoHtml.bodyHtml()` to contain `<h1>Halo</h1>` and `<p>Dunia</p>` and `<img`.
  - the preview `<iframe>`'s `srcdoc` (read via `page.locator('iframe').getAttribute('srcdoc')`) contains `<h1>Halo</h1>`.
  - click **Lihat Kode** tab → the code panel text contains `<h1>Halo</h1>`.
  - click **Ekspor HTML** → a download is triggered (Playwright `page.waitForEvent('download')`); the downloaded file's text contains `<!doctype html>` and `<p>Dunia</p>`.
  - click **Mode Sprite** then **Mode HTML** again → the `judul`/`paragraf` blocks are still in the workspace (`getAllBlocks().some(b => b.type === 'html_heading')`).

- [ ] **Step 3: Run** `npm run test:e2e` — expect 4 passing (3 existing + this). Fix flakes with `waitForFunction`/`waitForEvent`, not fixed sleeps.

- [ ] **Step 4: Commit** — `test(html): e2e HTML-mode flow + mode-switch persistence`

---

## Task 10: Final gate + ROADMAP

**Files:** Modify `docs/ROADMAP.md`.

- [ ] **Step 1: Full gate** — `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e` all green. `git status --porcelain` clean.

- [ ] **Step 2: Tick `docs/ROADMAP.md` "Fase 2" checkboxes** now done; add a line: "Ditunda ke Fase 3: CSS lanjutan, atribut class/id, tabel, form; alur 'kirim ke guru'."

- [ ] **Step 3: Commit** — `chore: mark Fase 2 roadmap items complete`

---

## Self-Review

**1. Spec coverage — `docs/ROADMAP.md` "Fase 2" deliverables → tasks**

| Deliverable | Task(s) |
|---|---|
| `blocks/html/blocks.ts` + `toolbox.ts` (Struktur/Konten/Gaya) | 1 |
| `blocks/html/generator.ts` (HTML rapi, `asset:<id>`, escape, style merge) | 2 |
| `runtime/html/preview.ts` (iframe sandbox no-scripts, debounce, `asset:<id>`→dataURL) | 3 |
| Panel "Lihat Kode" (highlight.js bundled, read-only) | 6 |
| `runtime/html/export.ts` (standalone `.html`, assets as data URL, download/dialog) | 4 |
| Header mode switch swaps workspace; both serialized | 5 (helpers), 7 (`editor-view` wiring), 9 (persistence test) |
| Test: generator snapshot + escape; E2E judul+paragraf+gambar→preview→export | 2, 9 |

**"Definisi selesai" →** preview updates < 500 ms (Task 3 `PREVIEW_DEBOUNCE_MS = 300` + Task 9 E2E `waitForFunction`); style blocks reflected in preview & code (Task 2 compose tests + Task 9); exported file opens standalone with images (Task 4 test + Task 9 download assertion — note builtin-SVG `src` stays an app URL, embedded uploads inline as `data:`); Sprite↔HTML switch loses nothing (Task 9 `html-mode-persistence.test.ts` + E2E round-trip).

**Gap accepted / noted:** builtin costume SVGs referenced in an exported HTML file resolve to the app's bundled asset path, not an inlined `data:` — a file emailed to a teacher shows those images only when opened from the app origin. Embedded (uploaded) images inline fine. Full builtin inlining (fetch+base64 at export) is deferred to Phase 3; Task 4 emits a code comment and the export test asserts only the embedded-asset path inlines.

**2. Placeholder scan** — no "TBD"/"add error handling"/"similar to Task N". Tasks 3–6 compress test/impl bodies to interface contracts + enumerated assertions; each names every function, type, and case. Task 1 and 2 carry the risky escaping + style-composition logic explicitly. Task 6 and 7 flag the highlight.js-CSS-bundling and jsdom-Blockly-inject uncertainties with concrete fallbacks and "note in the report".

**3. Type/name consistency**
- `generateHtml(workspace) → { bodyHtml, assetIds }` (Task 2) is consumed by Task 3 (`preview.update`), Task 4 (`export`), Task 7 (`refresh`) — same shape everywhere.
- `escapeHtmlText` / `escapeHtmlAttr` (Task 2) are the only escapers; Tasks 3 (`preview` attr replace) and 4 import them, none re-implement.
- `wrapBodyInDocument(title, bodyHtml, opts?)` (Task 3) vs `buildStandaloneDocument(title, bodyHtml, assets)` (Task 4) — distinct names, distinct jobs (preview keeps `asset:` refs to resolve live; export inlines). Both live in `runtime/html`, share the reset-CSS constant (Task 3 `document.ts` exports it; Task 4 imports it — added to Task 4 Consumes).
- `htmlWorkspaceJson` / `withHtmlWorkspace` (Task 5) consumed by Task 4 (`exportHtmlProject`) and Task 7 (`persist`) with the same signatures.
- `renderHtmlMode(host, { project, storage, markDirty })` (Task 7) is exactly what `editor-view.ts` calls (Task 7 modify step).
- `installHtmlBlockly` / `htmlToolbox` / `setHtmlAssetOptionsProvider` / `HTML_BLOCK_TYPES` (Task 1) — re-exported from `src/blocks/index.ts` and consumed by Tasks 2, 4, 7.
- i18n keys added in Task 8 (`editor.html.*`, `error.htmlExportFailed`) are the ones referenced in Task 7.
- `resolveAssetUrl` / `loadUploadedImage` / `BUILTIN_COSTUMES` reused from Phase 1's `runtime/sprite/assets.ts` — Tasks 3, 4, 7 import, none fork.

Fixes applied inline: the reset-CSS string is defined once in `document.ts` and imported by `export.ts` (not duplicated); `editor-view.ts` drops the placeholder entirely (there is no non-sprite-non-html mode) rather than keeping dead `t('editor.workspacePlaceholder')`; the `editor-view.test.ts` accommodation switched from "force a mode" to a `vi.mock` of `renderHtmlMode` so the header suite tests nothing sprite/html-specific.

---

## Deferred to later phases

- CSS beyond the six style wrappers; `class`/`id` attributes; custom fonts.
- Tables, forms with submission, any interactive/script behaviour.
- Inlining builtin costume SVGs as `data:` URIs in exported files (embedded uploads already inline).
- The "kirim ke guru" project-collection workflow.
- Per-block inline preview / drag-to-canvas WYSIWYG.
- Sprite mode is untouched by this phase.
