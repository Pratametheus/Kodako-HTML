# Fase C — Blok dokumen HTML + label gaya CSS + info blok — Design

Status: Disetujui lewat brainstorming · Tanggal: 2026-09-06 ·
Menyertai: `PRD.md`, `Design.md`, `ROADMAP.md`

## Ringkasan

Mode HTML sekarang cuma memodelkan isi `<body>`. Fase C menambah:

1. **Blok kerangka dokumen** `<html>` / `<head>` / `<body>` / `<title>` sebagai
   blok toolbox opsional (keputusan user: "Option B") di kategori **Struktur**.
   Kalau anak tidak memakainya, perilaku sama persis seperti sekarang
   (blok top-level = isi body).
2. **Panel "Lihat Kode" menampilkan dokumen penuh** (`<!doctype html>` … `</html>`),
   bukan hanya `<body>` — supaya blok `<head>`/`<title>` terlihat efeknya.
3. **Label blok gaya jadi notasi CSS asli** (`color:`, `background:`, dst.);
   nilai dropdown tetap Bahasa Indonesia.
4. **Info per-blok**: `tooltip` Blockly di setiap blok HTML + strip "Info blok"
   yang selalu tampil di panel keluaran, mencerminkan tooltip blok yang dipilih.

Ini mengubah **kontrak `generateHtml`** (`{ bodyHtml, assetIds }` →
`{ headHtml, bodyHtml, assetIds }`), yang merembet ke `runtime/html/document.ts`,
`preview.ts`, `export.ts`, `code-panel.ts`, dan ~8 berkas tes. Satu PR.

## Konteks kode saat ini

- `src/blocks/html/blocks.ts` — 17 blok (`HTML_BLOCK_TYPES`), didefinisikan lewat
  `Blockly.defineBlocksWithJsonArray`. **Tak ada `tooltip`.** Label sudah pakai
  notasi tag untuk struktur/konten (PR #7). Blok gaya (`html_style_*`) = C-block
  pembungkus, label kata ramah ("warna teks", "rata", "tebal", …), field
  `COLOR`/`ALIGN`/`SIZE`/`BODY`.
- `src/blocks/html/generator.ts` — `generateHtml(ws)` → `{ bodyHtml, assetIds }`.
  Tree-walker: `for (const block of ws.getTopBlocks(true)) bodyHtml += emitChain(block, 0, assetIds)`.
  `emitContainer(block, input, tag, …)` dengan `tag: 'div' | 'ul'`.
  **Bug kecil**: `html_section` (label `<section>`) meng-emit `<div>` — dibetulkan
  di Fase C.
  Blok gaya (`html_style_*`) tidak meng-emit tag; `emitBlock` mengumpulkan
  `styleFragment()` (mis. `color:#e53935`) dan `withStyle()` menyisipkan
  `style="…"` ke tag pembuka anak.
- `src/runtime/html/document.ts` — satu fungsi `wrapBodyInDocument(title,
  bodyHtml, { lang })`: `<!doctype><html lang><head>` + charset + **CSP meta**
  + viewport + `<title>` + `<style>${HTML_DOCUMENT_RESET}</style>` +
  `</head><body>${bodyHtml}</body></html>`. Satu baris, tanpa newline.
- `src/runtime/html/preview.ts` — `update(bodyHtml)`; `iframe.srcdoc =
  wrapBodyInDocument(iframe.title || 'Pratinjau', resolveAssetSources(bodyHtml, …))`.
- `src/runtime/html/export.ts` — `buildStandaloneDocument(title, bodyHtml,
  assets)` → `wrapBodyInDocument(title, inlineAssetSources(bodyHtml, assets))`.
- `src/app/editor/html-mode/code-panel.ts` — `renderCodePanel(host)` →
  `{ setCode(bodyHtml), dispose() }`. `prettyPrintHtml` mengindentasi ulang
  per-baris (split `\n`, hitung kedalaman tag), lalu highlight.js `xml`.
- `src/app/editor/html-mode/html-mode.ts` — `refresh()`:
  `const { bodyHtml } = generateHtml(workspace); preview.update(bodyHtml);
  codePanel.setCode(bodyHtml)`. Debug hook `__kodakoHtml.bodyHtml()`. Panel
  keluaran `.html-mode__output` berisi `.html-mode__toolbar` (tombol Jalankan
  ikon + tab Pratinjau/Lihat Kode + aksi ekspor/unggah) lalu `.html-mode__panel`
  (iframe / kode).
- `src/core/html-project.ts` — `migrateHtmlWorkspaceJson` mengangkat anak
  `html_page` lawas ke top-level. **Tidak berubah** (proyek lama tak punya
  `html_document` → jalur fallback).
- Tes terkait: `blocks-html-defs.test.ts`, `blocks-html-generator.test.ts`,
  `blocks-toolbox-icons.test.ts`, `html-export.test.ts`,
  `html-mode-view.test.ts`, `html-mode-persistence.test.ts`,
  `tests/e2e/html-mode.spec.ts`.

## Keputusan desain

### 1. Empty blok kerangka dokumen (kategori Struktur, di atas)

Tambah ke `HTML_BLOCK_TYPES` dan `defineBlocksWithJsonArray`, semua
`style: 'structure_blocks'`:

| type | `message0` | input | prev/next |
| --- | --- | --- | --- |
| `html_document` | `<html> %1 </html>` | `input_statement` `CONTENT` | `null` / `null` |
| `html_head` | `<head> %1 </head>` | `input_statement` `CONTENT` | `null` / `null` |
| `html_body` | `<body> %1 </body>` | `input_statement` `CONTENT` | `null` / `null` |
| `html_title` | `<title> %1 </title>` | `input_value` `TEXT` `check:'String'` | `null` / `null` |

- Semua punya `previousStatement`/`nextStatement` `null` supaya bisa disambung di
  dalam slot `CONTENT` (drag-ergonomi Blockly), tapi **generator hanya
  menghormati yang pertama** dari tiap jenis.
- `html_title` `TEXT` menerima shadow `html_text` (sama seperti `html_paragraph`).
- Tidak ada pembatasan `check` pada slot statement (Blockly tak punya cara mudah
  membatasi "hanya `html_title` di `html_head`"); generator yang menyaring — blok
  salah tempat diabaikan diam-diam.
- Toolbox `src/blocks/html/toolbox.ts`: kategori **Struktur** `contents` diawali
  `html_document`, `html_head`, `html_title`, `html_body`, lalu blok yang sudah
  ada (`html_section` … `html_list_item`). Nama & `cssconfig` kategori tidak
  berubah.

### 2. Kontrak generator baru

`generateHtml(ws)` → **`{ headHtml: string; bodyHtml: string; assetIds: string[] }`**.

Logika `generateHtml`:

```
top = ws.getTopBlocks(true)
doc = top.find(b => b.type === 'html_document')  // pertama
if (doc) {
  head = firstChildOfType(doc, 'CONTENT', 'html_head')
  body = firstChildOfType(doc, 'CONTENT', 'html_body')
  headHtml = head ? emitHead(head) : ''
  bodyHtml = body ? emitChain(body.getInputTargetBlock('CONTENT'), 0, assetIds) : ''
  // blok top-level lain diabaikan saat ada html_document
} else {
  headHtml = ''
  bodyHtml = concat emitChain(b, 0, assetIds) untuk semua b di top   // perilaku sekarang
}
```

- `emitHead(headBlock)`: jalan menyusuri `CONTENT`; untuk tiap `html_title`
  pertama → `<title>${escapeHtmlText(textInput(t,'TEXT'))}</title>\n`. Jenis lain
  di head diabaikan. Kalau tak ada `html_title` → `headHtml = ''`.
- `emitBlock` dapat case baru: `html_document` / `html_head` / `html_body` bila
  tersua di jalur body (mis. anak salah taruh) → **diabaikan** (`return ''`),
  bukan dilewati ke dalamnya — mencegah `<body>` bersarang di body.
- `html_title` di jalur body → `return ''`.
- **Perbaikan bug**: `emitContainer` untuk `html_section` pakai `tag: 'section'`
  (dari `'div'`). Tipe param `tag` jadi `'section' | 'ul'`.
- `html_body`'s `CONTENT` di-emit dengan `depth: 0` (sama seperti top-level
  sekarang) supaya `bodyHtml` identik dengan mode sekarang untuk isi yang sama.

### 3. `runtime/html/document.ts` + pipeline

**`wrapBodyInDocument`** dapat param opsional `headHtml`:

```ts
export function wrapBodyInDocument(
  title: string,
  bodyHtml: string,
  opts: { lang?: string; headHtml?: string } = {},
): string
```

- Bila `opts.headHtml` memuat `<title`, sisipkan `opts.headHtml` dan **jangan**
  tulis `<title>${title}</title>` otomatis. Bila kosong → seperti sekarang
  (`<title>${escapeHtmlText(title)}</title>`).
- charset + **CSP meta** + viewport + `<style>reset</style>` tetap wajib, di luar
  kendali anak.

**`composeDisplayDocument`** — fungsi baru di `document.ts`, dokumen "ramah anak"
untuk panel kode (multi-baris, **tanpa** CSP/viewport/reset):

```ts
export function composeDisplayDocument(input: {
  headHtml: string;
  bodyHtml: string;
  lang?: string;
  fallbackTitle: string;
}): string
```

Menghasilkan (tiap elemen struktur di baris sendiri; `prettyPrintHtml`
mengindentasi ulang):

```
<!doctype html>
<html lang="id">
<head>
<title>…</title>          ← input.headHtml bila ada, else <title>fallbackTitle</title>
</head>
<body>
…input.bodyHtml (sudah newline-separated)…
</body>
</html>
```

- `preview.ts`: `update(bodyHtml, headHtml?)`; teruskan `headHtml` ke
  `wrapBodyInDocument(… , { headHtml })`.
- `export.ts`: `buildStandaloneDocument(title, bodyHtml, assets, headHtml?)`;
  teruskan `headHtml`.
- `code-panel.ts`: `setCode(documentHtml: string)` (rename param dari `bodyHtml`;
  `prettyPrintHtml` param `source`). Isi = `composeDisplayDocument(...)`.
- `html-mode.ts` `refresh()`:
  ```ts
  const { headHtml, bodyHtml } = generateHtml(workspace);
  preview.update(bodyHtml, headHtml);
  codePanel.setCode(
    composeDisplayDocument({ headHtml, bodyHtml, fallbackTitle: project.meta.name }),
  );
  ```
  Debug hook diperluas: `__kodakoHtml = { bodyHtml: () => …, headHtml: () => … }`.

### 4. Blok gaya = label properti CSS

Ubah **hanya `message0`** (field, opsi dropdown, `styleFragment()` **tidak
berubah**):

| type | `message0` sekarang | `message0` baru |
| --- | --- | --- |
| `html_style_color` | `warna teks %1 %2` | `color: %1 %2` |
| `html_style_bg` | `warna latar %1 %2` | `background: %1 %2` |
| `html_style_align` | `rata %1 %2` | `text-align: %1 %2` |
| `html_style_size` | `ukuran %1 %2` | `font-size: %1 %2` |
| `html_style_bold` | `tebal %1` | `font-weight: bold %1` |
| `html_style_italic` | `miring %1` | `font-style: italic %1` |

Dropdown tetap menampilkan "merah / kiri / sedang" (nilai `#e53935` / `left` /
`1rem`) — generator memetakannya seperti sekarang.

### 5. Info per-blok

**5a. `tooltip`** di setiap blok HTML (15: 11 lama + 4 baru). Satu kalimat
Bahasa Indonesia: apa yang dibuat + tag/CSS-nya. Contoh:

- `html_document` → "Kerangka satu halaman HTML lengkap (`<html>`)."
- `html_head` → "Bagian kepala halaman — info yang tak tampil di layar (`<head>`)."
- `html_title` → "Judul halaman yang muncul di tab browser (`<title>`)."
- `html_body` → "Isi halaman yang tampil di layar (`<body>`)."
- `html_paragraph` → "Satu paragraf teks (`<p>`)."
- `html_heading` → "Judul bagian, ukuran h1–h3 (`<h1>`)."
- `html_style_color` → "Mengubah warna teks isinya (CSS `color`)."
- … dst. (daftar lengkap di plan.)

**5b. Strip "Info blok"** — elemen baru di `.html-mode__toolbar`, di atas baris
tab: `<p class="html-mode__blockinfo" data-block-info></p>`. Read-only, selalu
tampil. Kosong → "Klik sebuah blok untuk melihat penjelasannya."

Modul baru **`src/app/editor/html-mode/block-info.ts`**:
`attachBlockInfo(workspace, el): () => void`.

- **Click-delegation** pada `#htmlBlocklyDiv` (bukan event `SELECTED` — pelajaran
  Fase B1: `TOOLBOX_ITEM_SELECT` tak sampai ke `addChangeListener`; pakai pola
  yang sama supaya pasti). Pada klik → `queueMicrotask` → baca blok terpilih
  (`Blockly.getSelected?.()` / `Blockly.common.getSelected()` — plan verifikasi),
  ambil tooltip (`typeof b.tooltip === 'function' ? b.tooltip() : b.tooltip`),
  set `el.textContent`. Tak ada blok terpilih → teks default.
- Juga dengar `workspace` change listener untuk `Blockly.Events.BLOCK_DELETE` /
  perubahan, supaya strip kembali ke default kalau blok terpilih hilang.
- Disposer melepas listener; dipanggil di cleanup `renderHtmlMode` (dekat
  `detachWash()` / `detachSplit()`).
- `el` null → no-op, tak melempar.

CSS `html-mode.css`: `.html-mode__blockinfo` — satu baris, kecil, warna redup,
`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.

### 6. Migrasi & persistensi

- `migrateHtmlWorkspaceJson` **tidak berubah**. Proyek lama (blok top-level =
  body, atau `html_page` kuno) → jalur fallback `generateHtml` → keluaran
  identik.
- Serialisasi Blockly menangani blok baru otomatis.

## Unit & boundary

| Unit | Tanggung jawab | Antarmuka |
| --- | --- | --- |
| `blocks/html/blocks.ts` | +4 def blok, +15 `tooltip`, 6 relabel gaya | `HTML_BLOCK_TYPES`, `registerHtmlBlocks()` |
| `blocks/html/generator.ts` | kontrak `{ headHtml, bodyHtml, assetIds }`; `emitHead`; case dokumen; fix `<section>` | `generateHtml(ws)` |
| `runtime/html/document.ts` | `wrapBodyInDocument(…, { headHtml })` + `composeDisplayDocument(input)` | 2 fungsi |
| `runtime/html/preview.ts` | `update(bodyHtml, headHtml?)` | — |
| `runtime/html/export.ts` | `buildStandaloneDocument(…, headHtml?)` | — |
| `app/editor/html-mode/code-panel.ts` | `setCode(documentHtml)` | `HtmlCodePanel` |
| `app/editor/html-mode/block-info.ts` | strip info dari blok terpilih (click-delegation) | `attachBlockInfo(ws, el): () => void` |
| `app/editor/html-mode/html-mode.ts` | rangkai: refresh pakai kontrak baru, strip info, dispose | — |
| `blocks/html/toolbox.ts` | Struktur diawali 4 blok baru | `htmlToolbox` |

Semua modul kecil, satu tanggung jawab; semua init menjaga elemen hilang.

## Penanganan galat

- Anak taruh `<body>` di dalam `<body>`, dua `<html>`, `<title>` di body, dst. →
  generator ambil yang pertama yang valid, sisanya diabaikan; tak pernah melempar.
- Tanpa `html_document` → fallback (perilaku sekarang).
- `html_head` tanpa `html_title` → `headHtml = ''` → `wrapBodyInDocument` pakai
  `<title>` fallback (nama proyek).
- `attachBlockInfo`: workspace/el null, `getSelected` tak ada → no-op.
- CSP/charset selalu ada di pratinjau & ekspor (tak bisa dihapus lewat blok).

## Testing

- `blocks-html-defs.test.ts`: 4 tipe baru terdaftar di `HTML_BLOCK_TYPES` &
  bisa di-*instantiate*; `message0` 4 baru + 6 gaya yang direlabel; **setiap**
  blok HTML punya `tooltip` non-kosong.
- `blocks-html-generator.test.ts` (tulis ulang bagian shape): hasil
  `{ headHtml, bodyHtml, assetIds }`; `html_document>html_head>html_title` →
  `headHtml` `<title>…</title>`; `html_document>html_body>…` → `bodyHtml`;
  tanpa `html_document` → `headHtml===''` & `bodyHtml` = keluaran sekarang untuk
  fixture yang sama (uji kesetaraan); blok top-level lepas diabaikan saat ada
  `html_document`; `<body>` bersarang / `<title>` di body → diabaikan;
  `html_section` → `<section>…</section>`.
- `blocks-toolbox-icons.test.ts` / toolbox: Struktur `contents[0..3]` =
  `html_document`, `html_head`, `html_title`, `html_body`.
- `document.test.ts` (baru atau perluas): `wrapBodyInDocument` dengan `headHtml`
  berisi `<title>` → dokumen memakai `<title>` itu, bukan yang otomatis;
  `composeDisplayDocument` → string multi-baris tanpa `Content-Security-Policy`,
  memuat `<!doctype html>`, `<title>`, `<body>`, isi body.
- `html-export.test.ts`: pakai kontrak baru; ekspor dengan blok `<title>` →
  `<title>` anak muncul di berkas.
- `html-mode-view.test.ts`: `[data-block-info]` ada; "Lihat Kode" berisi
  `<!doctype html>` + `<body>` (bukan cuma isi body); pilih blok → strip berubah;
  hapus blok terpilih → strip kembali default.
- `block-info.test.ts` (baru, jsdom): `attachBlockInfo` dengan workspace palsu →
  klik di `#htmlBlocklyDiv` dengan blok "terpilih" ber-tooltip → `el.textContent`
  = tooltip; tanpa pilihan → default; disposer melepas listener; el null → tak
  melempar.
- `html-mode-persistence.test.ts`: proyek lama tetap termuat & ter-render sama.
- E2E `tests/e2e/html-mode.spec.ts`: tambah `html_document` + `html_head` +
  `html_title("Halaman Saya")` + `html_body` + satu `html_paragraph` lewat
  `serialization.load`; klik "Lihat Kode" → panel memuat `<!doctype html>`,
  `<title>Halaman Saya</title>`, `<body>`, paragraf; klik blok → strip info
  terisi.
- Gerbang penuh hijau. `check:chunks`: editor entry chunk tetap < 400 kB
  (tambahan ~2–3 kB).
- **QA visual koordinator**: seret kerangka dokumen; "Lihat Kode" tampil penuh &
  rapi; label gaya `color:` dll.; strip info berubah saat memilih blok; pratinjau
  & ekspor tetap benar (CSP ada di ekspor, tak ada di panel kode).

## Di luar lingkup Fase C

- Blok `<style>` / editor aturan CSS (B-iii — fase terpisah).
- Blok `<meta>`, `<link>`, `<script>` kustom (charset/CSP tetap otomatis).
- Atribut `class`/`id`, tabel, form (masih ditunda dari Fase 2/3).
- Perubahan renderer/tema blok.
- Rilis / tag versi baru.
