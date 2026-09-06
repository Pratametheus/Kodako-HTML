# Fase D — Poles Home & panel kanan editor — Design

Status: Draft (menunggu review user) · Tanggal: 2026-09-07 ·
Menyertai: `PRD.md`, `Design.md`, `ROADMAP.md`

## Ringkasan

Lima perbaikan poles pasca-Fase C, dari 4 tangkapan layar user:

1. **Home ("Project Saya")** — samakan rasa visualnya dengan landing page.
2. **Panel kanan Mode HTML** — toolbar berantakan; rapikan tata letak +
   samakan tema.
3. **Efek hover tombol editor** — belum ada; tambahkan sistem hover yang tenang.
4. **BUG:** teks petunjuk kanvas kosong (`.html-mode__hint`) tidak hilang
   setelah blok pertama ditaruh di kanvas.
5. **Pratinjau HTML** — bungkus dengan "bingkai browser" yang menampilkan tab
   berisi judul halaman.

Dipecah **dua PR**:

- **PR-D1** — Home (item 1).
- **PR-D2** — editor: panel kanan + hover + bug hint + bingkai browser
  (item 2–5).

(Alternatif: satu PR gabungan — user boleh memilih saat review.)

Target pemakai tetap anak kelas 4–6 SD; editor harus terasa menyenangkan tapi
tenang untuk dipakai bekerja. Blok Blockly (renderer Zelos, `spriteTheme` di
`src/blocks/theme.ts`) **tidak diubah**. Nama field blok HTML **dibekukan**.
Semua `role` / `aria-label` / `data-*` yang dipakai E2E dipertahankan.

## Konteks kode saat ini

- **Home** dirender langsung ke `root` di `src/app/shell.ts` (`renderHome`),
  **di luar** `.editor`. Jadi hanya kena `src/styles/base.css` (global `.btn`:
  border 1px `#c8ccd4`, radius 8px, `min-height:40px`) + `src/app/home/home.css`
  (kartu border 1px `#d7dbe2`, radius 12px, abu polos). Token `--ed-*` **tidak
  berlaku** di route Home. Struktur `home-view.ts`: `<section class="home">` →
  `<h1>` + `.home__actions` (`[data-action="new"]` `.btn.btn-primary`,
  `[data-action="open-file"]` `.btn`) + `.home__list[data-list]`; tiap kartu
  `<article class="card" data-card data-id>` → `.card__name` (diisi via
  `textContent`) + `.card__date` + `.card__buttons` (5 `.btn`:
  open/rename/duplicate/download/delete); kosong → `<p class="home__empty">`.
- **Landing** (`src/landing/landing.css`, entri terpisah `index.html`) —
  identitas visual: `@font-face` **Fredoka** dari
  `url('/src/landing/fonts/fredoka-semibold.woff2')` (berkas nyata ada di
  `src/landing/fonts/`, terbukti jalan di produksi Cloudflare); token
  `--brand-blue #4C97FF`, `--brand-purple #9966FF`, `--block-* …`,
  `--ink #2B2B38`, `--bg-tint #F5F7FF`, `--paper #fff`, `--radius 16px`;
  tombol "stiker": `border: 2px solid var(--ink)`, `border-radius: 999px`,
  `box-shadow: 0 4px 0 var(--ink)`, `:active { transform: translateY(3px) }`;
  primary latar `--block-amber #FFBF00` dengan `box-shadow: 0 4px 0 #b98a00`.
- **Chrome editor** (`src/app/editor/editor.css`) — token `--ed-ink #2b2b38`,
  `--ed-line #e2e6f0`, `--ed-ground #eef3ff`, `--ed-card #fff`,
  `--ed-radius 16px`, `--ed-shadow: 0 1px 3px rgb(30 41 80 / 8%), 0 6px 16px
  rgb(30 41 80 / 6%)`. `.editor .btn { border: 2px solid var(--ed-line);
  border-radius: 999px; box-shadow: var(--ed-shadow) }` — **tanpa `:hover`**.
  `.editor__modes .btn[aria-pressed='true']` latar `#4c97ff`. Gutter
  `.ed-split-gutter` sudah punya `:hover`.
- **Panel kanan Mode HTML** (`src/app/editor/html-mode/html-mode.ts` +
  `html-mode.css`):
  - `.html-mode` grid `var(--split-left, 56%) 6px minmax(300px, 1fr)`.
  - `.html-mode__output` grid baris `auto auto minmax(0, 1fr)`.
  - `.html-mode__toolbar` — satu `display:grid; gap:8px; padding:8px` berisi
    **4 baris tumpuk**: `<p class="html-mode__blockinfo" data-block-info>`
    (Fase C, `grid-column:1/-1`, mepet border atas), `<button
    class="html-mode__run" data-run-html>▶</button>` (44×40, `justify-self:
    start` → sendirian, sisa baris kosong), `.html-mode__tabs` (grid 2 kolom
    full width, `role="tablist"`, tombol id `html-tab-preview` /
    `html-tab-code`, `aria-controls`), `.html-mode__actions` (label
    `.html-mode__upload` + `<button data-export-html>`, `justify-content:
    flex-end`).
  - `<p class="html-mode__error" data-html-error hidden>`.
  - `.html-mode__panel#html-panel-preview[data-panel="preview"]` berisi
    `<iframe title="…">`; `.html-mode__panel.html-mode__code
    #html-panel-code[data-panel="code"]` diisi `renderCodePanel`.
  - `refresh()` = `generateHtml(workspace)` → `{ headHtml, bodyHtml }` →
    `preview.update(bodyHtml, headHtml)` + `codePanel.setCode(
    composeDisplayDocument({ headHtml, bodyHtml, fallbackTitle:
    project.meta.name }))`.
- **Hint kanvas kosong** — `<p class="html-mode__hint" data-html-hint>` di
  dalam `.html-mode__blocks` (`position: relative`). `.html-mode__hint`
  menyetel `display: grid; place-items: center; inset: 0;
  pointer-events: none`. `syncHint()` = `hint.hidden =
  workspace.getTopBlocks(false).length > 0`, dipanggil saat mount (setelah
  `load`) dan di `onWorkspaceChange` (yang early-return hanya untuk
  `event.isUiEvent || loadingWorkspace`; `BLOCK_CREATE`/`BLOCK_MOVE` bukan UI
  event, jadi `syncHint` **memang** jalan saat blok ditaruh).
- **Sprite mode** (`src/app/editor/sprite-mode/sprite-mode.css`) — tombol
  `.sprite-stage-toolbar button`, `.sprite-tabs button`, `.sprite-panel__add`,
  `.sprite-chip`, `.costume-tile`, `.sound-tile` semua hanya punya
  `:focus-visible`, tanpa `:hover`. `[data-green-flag]` latar hijau.
- **Pratinjau** — `src/runtime/html/preview.ts` `createHtmlPreview(iframe,
  { getAssets })`; `render()` set `iframe.srcdoc = wrapBodyInDocument(
  iframe.title || 'Pratinjau', resolveAssetSources(bodyHtml, …), { headHtml })`.
  `src/runtime/html/document.ts` — `wrapBodyInDocument` &
  `composeDisplayDocument` memakai regex `/<title[\s>]/i` untuk deteksi
  `<title>` di `headHtml`.
- **Tes yang menyentuh area ini:**
  - `tests/unit/home-view.test.ts`, `tests/unit/a11y-smoke.test.ts`
    ("gives every Home project card an accessible name") — struktur Home.
  - `tests/unit/i18n.test.ts` — **memfilter** semua nilai `id.json` agar tidak
    mengandung kata Inggris: `'Run '`, `'Stop'`, `'Costume'`, `'Upload'`,
    `'Delete'`, `'Backdrop'`, `'Preview'`, `'View Code'`, `'Export'`,
    `'Image too large'`, `'File is not an image'`, `'Reload'`, `'Copy'`,
    `'Close'`. String baru **harus** lolos filter ini.
  - `tests/e2e/html-mode.spec.ts` — bergantung pada `getByRole('button',
    { name: 'Jalankan' })`, `getByRole('tab', { name: 'Pratinjau' })`,
    `getByRole('tab', { name: 'Lihat Kode' })`, `getByRole('button',
    { name: 'Ekspor HTML' })`, `.html-mode iframe`, `[data-panel="code"]`,
    `.html-mode__code`, `[data-block-info]`, `.blocklyDraggable`.
  - `tests/unit/html-preview.test.ts`, `tests/unit/html-document.test.ts`.

## Keputusan desain

### 1. Home page — "playful-lite" selaras landing

**Font display.** Tambahkan `@font-face` **Fredoka** ke `src/styles/base.css`
(dimuat `src/main.ts` untuk seluruh app) menunjuk berkas yang **sudah ada**
`/src/landing/fonts/fredoka-semibold.woff2` — path identik yang dipakai
`landing.css` dan terbukti jalan di produksi. `landing.css` **tidak disentuh**
(risiko nol untuk halaman yang sudah live). Catatan: ini menautkan `base.css`
ke berkas di `src/landing/` — wart kecil; pembersihan lanjutan (pindah font ke
`public/fonts/` + satu deklarasi bersama) di luar lingkup Fase D.

**Token Home.** Blok baru di `home.css`, di-scope `.home`:

```
--home-ink: #2b2b38;
--home-ground: #f5f7ff;   /* = landing --bg-tint */
--home-paper: #ffffff;
--home-edge: #2b2b38;     /* garis "stiker" tebal */
--home-soft: rgb(43 43 56 / 14%);
--home-radius: 16px;
--home-accent: #ffbf00;   /* amber = landing btn primary */
--home-accent-shadow: #b98a00;
--home-blue: #4c97ff;
```

**Layout & komponen.**

- `.home` — `background: var(--home-ground)`, `max-width: 1040px`,
  `padding: clamp(20px, 4vw, 40px)`, `min-height: 100%`, jarak antar bagian
  dilonggarkan. Judul jadi bagian yang paling kelihatan "berubah tema".
- `<h1>` "Project Saya" — `font-family: 'Fredoka', system-ui, 'Segoe UI',
  sans-serif; font-weight: 600; font-size: clamp(1.6rem, 4vw, 2rem);
  color: var(--home-ink)`. Aksen kecil: emoji `📁` sebelum teks (emoji, bukan
  aset baru) **atau** garis bawah pendek amber via `::after` — pilih salah satu
  di implementasi, jangan dua-duanya.
- `.home__actions .btn` — gaya "stiker" landing: `border: 2px solid
  var(--home-edge); border-radius: 999px; box-shadow: 0 4px 0 var(--home-edge);
  font-weight: 700; transition: transform .08s ease, box-shadow .08s ease`.
  `:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--home-edge) }`.
  `.btn-primary` ("Project Baru") — `background: var(--home-accent); border-color:
  var(--home-edge); color: var(--home-ink); box-shadow: 0 4px 0
  var(--home-accent-shadow)`; `:active` shadow `0 1px 0 var(--home-accent-shadow)`.
  (Shadow keras ala landing **OK di Home** karena ini layar "sampul", bukan
  area kerja editor. Alternatif: shadow lembut `--ed-shadow` — user boleh pilih
  saat review.)
- `.card` — `border: 2px solid var(--home-soft); border-radius:
  var(--home-radius); padding: 16px; background: var(--home-paper); box-shadow:
  0 1px 2px rgb(30 41 80 / 6%), 0 8px 20px rgb(30 41 80 / 5%)`.
  `:hover` → `border-color: var(--home-blue); transform: translateY(-2px)`,
  transisi `.12s ease`, **digating** `@media (prefers-reduced-motion: reduce)`
  (tanpa `transform`).
- `.card__name` — `font-weight: 700; font-size: 1rem`.
  `.card__date` — `color: #6b7280; font-size: 12px` (boleh prefiks `📅`).
- `.card__buttons .btn` — pil kecil (`border-radius: 999px; padding: 5px 12px;
  font-size: 12px; border: 2px solid var(--home-soft)`), `:hover` tint
  `#eef4ff` + border `var(--home-blue)`.
- `.home__empty` — kartu ramah, bukan sekadar teks abu: `border: 2px dashed
  var(--home-soft); border-radius: var(--home-radius); padding: 28px;
  text-align: center; color: #5b6472`, dengan emoji `✨` dan ajakan
  (`t('home.empty')` yang sudah ada).
- **Dekorasi ambient (opsional, YAGNI-able):** 1–2 bentuk blok samar di sudut
  `.home` via `::before`/`::after`, `pointer-events: none`, diam (tanpa
  animasi). Kalau menambah kerumitan → **dilewati**.

**Batas.** Perubahan **CSS-only** kalau bisa. Tidak menambah/menghapus/mengganti
elemen yang dibaca `home-view.test.ts` / `a11y-smoke` (`data-action`, `.card`,
`.card__name`, `.card__date`, `[data-list]`, `.home__empty`). Jika dekorasi
butuh wrapper, tambahkan elemen `aria-hidden="true"` **tanpa** mengubah yang
ada. Tidak membawa merek "Kodako HTML" ke Home — hanya rasa visualnya. Judul
tetap "Project Saya".

### 2. Panel kanan Mode HTML — tata ulang toolbar

`.html-mode__output` jadi grid baris **`auto auto minmax(0, 1fr) auto`**:

1. **Bar aksi** — `.html-mode__actionbar` (ganti nama peran dari
   `.html-mode__toolbar`), satu baris `display: flex; align-items: center;
   gap: 8px; flex-wrap: wrap; padding: 8px`:
   `[▶]` (tetap **ikon-saja**, `aria-label` + `title` = `t('editor.html.run')`
   = "Jalankan") · `.html-mode__actions` dengan `margin-left: auto`
   (`.html-mode__upload` "Unggah gambar" + `<button data-export-html>`
   "Ekspor HTML").
2. **Strip tab** — `.html-mode__tabs`, segmented control **full width**
   (`display: grid; grid-template-columns: 1fr 1fr`), nempel ke area konten
   di bawahnya (radius atas 0, garis bawah = warna panel). "Pratinjau" |
   "Lihat Kode". Tab aktif `[aria-selected='true']` = brand blue
   (`border-color: var(--html-blue); background: #eaf4ff; color: #145a96`).
   **Pertahankan** `role="tablist"` + `role="tab"` + id `html-tab-preview` /
   `html-tab-code` + `aria-controls` + `aria-selected`.
3. **Panel** — `#html-panel-preview` (kini berisi bingkai browser, lihat item 5)
   & `#html-panel-code` — seperti sekarang; `[data-panel]` + `role="tabpanel"`
   dipertahankan.
4. **Status bar info blok** — `.html-mode__infobar`, **memindahkan**
   `<p data-block-info>` ke sini (full width di **bawah** panel). Gaya status
   bar IDE: `background: var(--ed-ground); border-top: 1px solid
   var(--html-line); padding: 4px 10px; font-size: 0.8rem; color: #5c7784;
   white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Awalnya
   berisi hint Fase C ("Klik sebuah blok untuk melihat penjelasannya.");
   `attachBlockInfo(workspace, host.querySelector('[data-block-info]'))`
   tetap dipakai apa adanya — hanya posisi elemen di DOM yang pindah.
   (Alternatif: strip tetap di antara tab & panel — user boleh pilih.)

`.html-mode__error[data-html-error]` tetap ada (di antara strip tab & panel,
seperti sekarang).

**Tema.** Semua tombol pakai token `--ed-*` + sudut membulat konsisten B1
"playful-lite", + hover dari item 3. Nama aksesibel tombol **tidak berubah**:
"Jalankan" / "Unggah gambar" / "Ekspor HTML" / tab "Pratinjau" / "Lihat Kode".

**Responsive ≤900px.** Bar aksi wrap (sudah `flex-wrap`); strip tab tetap 2
kolom; status bar tetap; bingkai browser mengecil (lihat item 5).

### 3. Sistem hover tombol editor

Tambahkan hover **tenang & konsisten**. Semua transisi `~0.12s ease`. Semua
`transform` **digating** `@media (prefers-reduced-motion: reduce)`.
`:focus-visible` **tidak diubah**.

- `.editor .btn:hover` (`editor.css`) — `border-color: #c3cce0; background:
  #f4f7ff; transform: translateY(-1px); box-shadow: 0 2px 6px rgb(30 41 80 /
  12%), 0 10px 22px rgb(30 41 80 / 8%)`.
- `.editor__modes .btn[aria-pressed='true']:hover` — tetap biru, sedikit lebih
  gelap (`background: #3f86ec; border-color: #3f86ec`), tanpa `translateY`.
- Tombol netral mode — `.html-mode__tabs button:hover`,
  `.html-mode__actions button:hover`, `.html-mode__upload:hover`,
  `.sprite-tabs button:hover`, `.sprite-stage-toolbar button:hover`,
  `.sprite-panel__add:hover`, `.sprite-chip:hover`, `.costume-tile:hover`,
  `.sound-tile:hover` — `background: #eef4ff; border-color: #4c97ff`.
- Tombol berwarna primer — `.html-mode__run:hover`,
  `.html-mode__actions [data-export-html]:hover`,
  `.sprite-stage-toolbar [data-green-flag]:hover`, `.sprite-ask button:hover` —
  `filter: brightness(0.95)`.
- Status terpilih (`[aria-selected='true']:hover`, `[aria-pressed='true']:hover`,
  `.sprite-chip[aria-pressed='true']:hover`) — override ringan supaya hover
  tidak "mematikan" gaya terpilih.

Perubahan **CSS-only**. Tidak ada tes unit untuk hover (sulit & rapuh di
jsdom); andalkan kesederhanaan aturan + QA visual companion.

### 4. BUG — hint kanvas kosong tidak hilang

**Akar masalah.** `syncHint()` **sudah benar** menyetel `hint.hidden`. Tapi
aturan *author* `.html-mode__hint { display: grid }` (spesifisitas 0,1,0)
mengalahkan gaya *user-agent* `[hidden] { display: none }` (author selalu menang
atas UA) — jadi atribut `hidden` tidak menyembunyikan elemen. Hanya
`.html-mode__hint` yang terdampak: ia satu-satunya overlay yang menyetel
`display`.

**Perbaikan.** Tambah satu aturan di `html-mode.css`:

```css
.html-mode__hint[hidden] {
  display: none;
}
```

Spesifisitas 0,2,0 > 0,1,0 → tanpa `!important`. **Tidak ada perubahan JS.**

**Tes.** Perluas `tests/e2e/html-mode.spec.ts` (tes pertama, setelah fixture
blok dimuat): `await expect(page.locator('.html-mode__hint')).toBeHidden()`.
Opsional: setelah semua blok dihapus, `.toBeVisible()`.

### 5. Pratinjau = bingkai "browser"

Bungkus panel **Pratinjau saja** (`#html-panel-preview`) dengan chrome browser;
panel **Lihat Kode** tetap apa adanya.

**Struktur DOM baru** di dalam `#html-panel-preview`:

```
<div class="html-mode__browser" aria-label="Jendela pratinjau halaman">
  <div class="html-mode__browserbar" aria-hidden="true">
    <span class="html-mode__dots"><i></i><i></i><i></i></span>
    <span class="html-mode__browsertab">
      <span class="html-mode__fav"></span>
      <span data-preview-tab>Pratinjau</span>
    </span>
    <span class="html-mode__browseraddr"><span data-preview-url>halaman.html</span></span>
  </div>
  <div class="html-mode__viewport">
    <iframe title="…"></iframe>   <!-- iframe TIDAK berubah -->
  </div>
</div>
```

- `iframe` tetap match selector `.html-mode iframe` (dipakai E2E) — hanya
  dibungkus.
- Bar: sudut atas membulat, `border: 2px solid var(--html-line)` di pembungkus,
  `box-shadow: var(--ed-shadow)`; `.html-mode__browserbar` latar
  `var(--ed-ground)`, `display: flex; align-items: center; gap: 8px;
  padding: 6px 10px`. `.html-mode__dots i` — 3 titik 9px
  (`#ff5f57` / `#febc2e` / `#28c840` atau netral abu — pilih netral abu
  `#cbd3e1` supaya tenang). `.html-mode__browsertab` — kapsul putih
  `border-radius: 8px 8px 0 0`, padding kecil, `max-width: 60%`, teks
  ellipsis; `.html-mode__fav` titik 10px `var(--html-blue)`.
  `.html-mode__browseraddr` — kapsul `#fff` `border-radius: 999px`,
  `flex: 1`, teks abu kecil ellipsis, **tidak interaktif**.
- `.html-mode__viewport` — `flex: 1; min-height: 0`, berisi iframe (iframe CSS
  tetap `width/height 100%`).

**Judul & slug — modul murni baru** `src/runtime/html/page-title.ts`:

- `export function extractTitle(headHtml: string, fallback: string): string`
  — regex `/<title[^>]*>([\s\S]*?)<\/title>/i`, unescape entitas dasar
  (`&amp; &lt; &gt; &quot; &#39;`), `.trim()`; hasil kosong → `fallback`.
- `export function slugifyTitle(title: string): string` — `toLowerCase()`,
  ganti whitespace → `-`, buang selain `[a-z0-9-]`, colapse `-{2,}` → `-`,
  trim `-`, potong 40 char; kosong → `'halaman'`; **selalu** `+ '.html'`.

`html-mode.ts` `refresh()` sudah punya `headHtml` & `project.meta.name`:

```ts
const title = extractTitle(headHtml, project.meta.name);
tabLabel.textContent = title;           // [data-preview-tab]
addrLabel.textContent = slugifyTitle(title); // [data-preview-url]
```

Nilai awal (sebelum "Jalankan" pertama) = `t('editor.html.previewTitle')`
("Pratinjau") / `slugifyTitle(project.meta.name)`.

**i18n.** Kunci baru bila perlu: `a11y.previewChrome` =
`"Jendela pratinjau halaman"`. **Semua string murni Bahasa Indonesia** —
hindari kata yang diblok `i18n.test.ts` (§ Konteks). Tidak ada kata Inggris.

**Tes.**

- Unit baru `tests/unit/html-page-title.test.ts` — `extractTitle` (ada
  `<title>`, kosong/`<title></title>`, atribut di tag, entitas, multiline,
  tanpa `<title>` → fallback) & `slugifyTitle` (spasi, simbol, kosong,
  panjang >40, sudah bersih).
- E2E `html-mode.spec.ts` (tes kedua sudah memuat fixture
  `html_document`/`html_head`/`html_title` "Halaman Saya"): setelah
  "Jalankan", `await expect(page.locator('[data-preview-tab]'))
  .toHaveText('Halaman Saya')`.

**Responsive ≤900px.** `.html-mode__browseraddr` disembunyikan
(`display: none`), tab & dots tetap.

## Interaksi & risiko

- **E2E `html-mode.spec.ts`** bergantung pada role/name/selector di § Konteks —
  **semua dipertahankan**: `▶` tetap `aria-label`/`title` "Jalankan"; tab tetap
  `role="tab"` bernama "Pratinjau"/"Lihat Kode"; "Ekspor HTML" tetap `<button>`;
  `iframe` tetap match `.html-mode iframe`; `[data-panel="code"]` +
  `.html-mode__code` tetap; `[data-block-info]` tetap ada (pindah lokasi DOM
  saja).
- **`home-view.test.ts` + `a11y-smoke`** — struktur Home dipertahankan
  (CSS-only + wrapper `aria-hidden` bila perlu).
- **`i18n.test.ts`** — string baru harus lolos filter "no English".
- **`check:chunks`** (entri editor < 400 kB, kini ~118 kB) — Fase D = CSS +
  satu modul murni kecil (`page-title.ts`) + `@font-face`. Dampak ~nol.
- **Tidak ada dependency npm baru. Tidak ada CDN / network call.**
- **`landing.css` tidak disentuh** — halaman live aman.

## Testing (ringkas)

- **PR-D1:** `home-view.test.ts` + `a11y-smoke` tetap hijau; QA visual Home
  vs landing (font, tombol stiker, kartu, empty state).
- **PR-D2:** unit `html-page-title.test.ts` baru; E2E `html-mode.spec.ts`
  diperluas (hint tersembunyi + tab judul); QA visual panel kanan (bar aksi /
  strip tab / status bar), hover semua tombol editor, bingkai browser.
- **Gate penuh hijau sebelum tiap PR:** `npm run lint && npm run typecheck &&
  npm test && npm run build && npm run check:chunks && npm run test:e2e`.
