# Scratch-Familiar Editor UX — Design

Status: Approved · Tanggal: 2026-09-05 · Menyertai: `PRD.md`, `Design.md`
Pemilik: Pratametheus

## Ringkasan

Perombakan tampilan & alur editor blok supaya terasa akrab bagi anak yang
sudah kenal Scratch, plus perbaikan satu bug nyata di Mode HTML. Lima
perubahan:

1. **Hapus blok `halaman`** di Mode HTML. Blok top-level di kanvas menjadi
   isi `<body>`. Ini sekaligus memperbaiki bug "Lihat Kode kosong".
2. **Label blok HTML memakai tag asli** (`<section>`, `<h1>`, `<p>`,
   `<img>`, …). Blok Gaya tetap ramah (memetakan ke CSS).
3. **Restyle toolbox/sidebar** kedua mode: rail kategori ala Scratch
   (lingkaran warna + ikon + label), flyout lebih rapi. CSS/tema saja.
4. **Nama & urutan kategori Mode Sprite** disamakan dengan Scratch Indonesia
   (`Gerak` → `Gerakan`; urut ulang).
5. **Mode HTML pakai tombol "Jalankan"** — pratinjau & Lihat Kode hanya
   menyegar saat ditekan (bukan live).

Tidak ada perubahan pada model penyimpanan project selain migrasi satu
kali untuk membuang blok `halaman` lama.

## Konteks kode saat ini

- `src/blocks/html/blocks.ts` — 18 definisi blok HTML (`html_page` …
  `html_style_italic`), label Bahasa Indonesia.
- `src/blocks/html/toolbox.ts` — 3 kategori: Struktur / Konten / Gaya.
- `src/blocks/html/generator.ts` — tree-walker; `generateHtml()` mencari
  **satu** blok `html_page` lewat `getTopBlocks(false).find(...)` lalu
  memancarkan `emitChain(page.getInputTargetBlock('BODY'), …)`.
- `src/blocks/sprite/toolbox.ts` — 8 kategori, urutan
  Kejadian/Gerak/Tampilan/Suara/Kontrol/Operator/Sensor/Variabel.
- `src/blocks/theme.ts` + `theme.css` — `CATEGORY_COLORS`, `spriteTheme`
  (dipakai kedua mode), CSS toolbox minimal.
- `src/app/editor/html-mode/html-mode.ts` — merender kanvas + panel output;
  `refresh()` memanggil `preview.update()` **dan** `codePanel.setCode()`
  pada **setiap** perubahan workspace (`onWorkspaceChange`).
- `src/app/editor/html-mode/code-panel.ts` — `prettyPrintHtml` + highlight.js.
- `src/core/html-project.ts` — `htmlWorkspaceJson()` / `withHtmlWorkspace()`
  menyimpan serialisasi Blockly mentah di `project`.

## Bug: "Lihat Kode kosong"

`html_page` bisa diseret dari toolbox → kanvas bisa punya dua. `generateHtml`
memakai `.find()` (blok pertama menurut `getTopBlocks`, urutan tak dijamin
= urutan pembuatan). Bila yang terpilih adalah blok `halaman` kosong,
`bodyHtml` = `''` → pratinjau **dan** Lihat Kode kosong. Reproduksi persis
di screenshot pengguna (dua blok "halaman", satu berisi, satu kosong).

Akar masalah: desain mengizinkan lebih dari satu root. Perbaikan =
hilangkan konsep blok root sama sekali (keputusan #1).

## Keputusan desain

### 1. Model dokumen HTML tanpa blok root

- Hapus `html_page` dari `blocks.ts`, `HTML_BLOCK_TYPES`, `toolbox.ts`,
  dan logika starter-block di `html-mode.ts`.
- `generateHtml(workspace)` berjalan atas **semua** blok top-level:
  urutkan `workspace.getTopBlocks(true)` (ordered — kiri→kanan lalu
  atas→bawah menurut posisi), lalu untuk tiap blok top-level panggil
  `emitChain(block, 0, assetIds)` (bukan `getInputTargetBlock('BODY')`).
  Hasil gabungan = `bodyHtml`.
- Blok Struktur/Konten kini `previousStatement`/`nextStatement` = `null`
  (sudah begitu) sehingga menumpuk bebas di top-level. Tidak ada lagi
  input `BODY` di root.
- **Migrasi satu kali** (di `html-mode.ts` setelah
  `Blockly.serialization.workspaces.load`): bila ada blok bertype
  `html_page`, untuk tiap anak di input `BODY`-nya, `block.getParent()`
  dilepas dan blok dipindah ke top-level (posisikan berjenjang), lalu
  `htmlPage.dispose(false)`. Jalankan sebelum `loadingWorkspace = false`
  supaya `persist()` menyimpan bentuk baru. Migrasi juga perlu tahan
  terhadap serialisasi mentah yang belum di-load (kasus test
  `html-mode-persistence`): cara paling sederhana adalah selalu
  meload ke workspace dulu, migrasi di level blok, lalu save ulang.
- Kanvas kosong menampilkan petunjuk samar terpusat: *"Seret blok dari
  kiri untuk membuat halaman."* — implementasi: elemen `<p>` absolute di
  atas `#htmlBlocklyDiv`, `hidden` di-toggle dari
  `workspace.getTopBlocks(false).length === 0` pada change listener.

### 2. Label blok = tag HTML asli

`message0` diubah. Blok Struktur menjadi C-block visual (label pembuka +
`input_statement` + tak ada; tetap `previousStatement`/`nextStatement`).
Karena blok tak lagi punya `BODY` di root tapi Struktur seperti `section`
dan `list` tetap wadah, mereka **tetap** punya `input_statement`.

| type | `message0` sesudah | args |
|---|---|---|
| `html_section` | `<section> %1 </section>` | `%1 = input_statement BODY` (zelos merender `</section>` di baris bawah C-block) |
| `html_heading` | `%1 %2` | `%1 = field_dropdown LEVEL` opsi `[['<h1>','h1'],['<h2>','h2'],['<h3>','h3']]`; `%2 = input_value TEXT`. Render: `[<h1>▾] [ teks ]` |
| `html_paragraph` | `<p> %1 </p>` | `%1 = input_value TEXT` |
| `html_list` | `<ul> %1 </ul>` | `%1 = input_statement ITEMS` |
| `html_list_item` | `<li> %1 </li>` | `%1 = input_value TEXT` |
| `html_text` | `<> %1` | `%1 = field_input VALUE` — slot string ramah |
| `html_image_asset` | `<img src= %1 alt= %2 >` | `%1 = field_dropdown ASSET`; `%2 = field_input ALT` |
| `html_image_url` | `<img src= %1 alt= %2 >` | `%1 = field_input URL`; `%2 = field_input ALT` |
| `html_link` | `<a href= %1 > %2 </a>` | `%1 = field_input URL`; `%2 = field_input LABEL` |
| `html_button` | `<button> %1 </button>` | `%1 = input_value TEXT` |
| `html_hr` | `<hr>` | — |

Nama field (`TEXT`, `LEVEL`, `ASSET`, `ALT`, `URL`, `LABEL`, `VALUE`,
`BODY`, `ITEMS`) **tidak berubah** supaya `generator.ts` dan test
snapshot tetap merujuk key yang sama.

Blok **Gaya** (`html_style_*`) label **tidak berubah** (`warna teks`,
`warna latar`, `rata`, `ukuran`, `tebal`, `miring`) — memetakan ke CSS
inline, angle-bracket akan menyesatkan.

Nama kategori toolbox **tetap** Struktur / Konten / Gaya (permintaan
eksplisit pengguna).

`generator.ts` tidak berubah logikanya (tetap memancarkan `<div>` untuk
`html_section`, `<h1..3>` untuk heading, dst.) — hanya sumbernya kini
blok top-level, bukan `page.BODY`.

### 3. Restyle toolbox/sidebar (kedua mode)

CSS + `spriteTheme.componentStyles` saja. Tanpa dependensi/CDN. Flyout
per-kategori dipertahankan (klik kategori → bloknya muncul).

- Tiap baris kategori: **lingkaran warna** (diameter ~28px, warna =
  `CATEGORY_COLORS[...]`) berisi **glyph SVG inline** kecil putih; label
  di kanannya; padding lega (min-height row dinaikkan ke ~44px).
- Baris terpilih: pil bertint warna kategori + garis aksen kiri setebal
  3px berwarna kategori (pola Scratch).
- Glyph: peta TS `src/blocks/category-icons.ts` — ~11 SVG mungil
  hand-authored (string `data:image/svg+xml` atau elemen inline), satu
  per kategori: motion=panah, looks=balon-bicara, sound=speaker,
  events=bendera, control=stopwatch, sensing=kaca-pembesar,
  operators=belah-ketupat, variables=label, structure=kurung-siku,
  content=gambar, style=tetes-cat. Di-set lewat `category` `cssConfig`
  atau `::before` CSS berlatar `mask`/`background-image`.
- Flyout: `flyoutBackgroundColour` lebih terang, jarak antar-blok
  dinaikkan, skala blok sedikit dinaikkan (zelos sudah besar).
- Diterapkan sama untuk 3 kategori Mode HTML.

Implementasi teknis: tiap entri kategori di `toolbox.ts` diberi
`cssconfig: { icon: 'kodako-cat-icon kodako-cat-icon--motion' }` (dan
seterusnya per kategori) — Blockly `ToolboxCategory` menaruh kelas itu di
`.blocklyTreeIcon`. `theme.css` menata `.kodako-cat-icon` (lingkaran,
ukuran, `mask-image`/`background-image` = data-URI SVG dari
`category-icons.ts`) dan varian `--motion`, `--looks`, dst. (warna
lingkaran = `CATEGORY_COLORS`). Baris & tint terpilih murni CSS:
`.blocklyTreeRow` (padding, min-height, radius) dan
`.blocklyTreeRow[aria-selected="true"]` (pil bertint + aksen kiri).
`categorystyle` yang sudah ada tetap memberi warna teks/flyout.

### 4. Kategori Mode Sprite = Scratch Indonesia

- `Gerak` → `Gerakan` (nama kategori di `toolbox.ts`).
- Urutan kategori jadi: **Gerakan · Tampilan · Suara · Kejadian ·
  Kontrol · Sensor · Operator · Variabel**.
- Isi tiap kategori & `categorystyle` tak berubah. `CATEGORY_COLORS`
  sudah cocok dengan Scratch. Tidak ada "Balok Saya" (belum ada fitur
  blok kustom).
- Generator sprite & runtime tak tersentuh (kategori hanya pengelompokan
  UI). Nama internal `motion_category` dsb. tetap.

### 5. Mode HTML: tombol "Jalankan", pratinjau on-demand

- Tombol hijau **▶ Jalankan** di puncak panel output (`html-mode__toolbar`,
  sebelum tab). Meniru bendera hijau Mode Sprite secara visual.
- Klik → `generateHtml` → `preview.update(bodyHtml)` +
  `codePanel.setCode(bodyHtml)` → aktifkan tab Pratinjau.
- `onWorkspaceChange` **berhenti** memanggil `refresh()`; hanya memanggil
  `persist()` (autosave blok tetap hidup/debounced, tak berubah).
- `refresh()` sekali saat mode dibuka tetap dijalankan supaya tak kosong
  saat masuk.
- `html-mode.css`: `.html-mode__code` diberi `min-height` eksplisit +
  `color` eksplisit (saat ini bisa kolaps / teks tak tampak). `pre.hljs`
  isi penuh, `overflow:auto`.
- String i18n baru: `editor.html.run` = `"Jalankan"`.

## Unit & boundary

- **`generateHtml`**: input `Blockly.Workspace`, output
  `{ bodyHtml: string; assetIds: string[] }`. Kontrak berubah: tak lagi
  bergantung pada blok `html_page`; memproses semua top-level. Mudah
  diuji lewat `blocks-html-generator.test.ts`.
- **Migrasi**: fungsi murni `migrateHtmlWorkspace(workspace)` di
  `html-mode.ts` (atau `html-project.ts`) yang menghapus blok `html_page`
  dan menaikkan anaknya ke top-level. Diuji terpisah.
- **Toolbox restyle**: tak ada logika baru; diverifikasi lewat test
  render (kelas CSS/urutan kategori hadir) + tinjauan visual manual.
- **Tombol Jalankan**: handler kecil di `html-mode.ts`; diuji lewat
  `html-mode-view.test.ts` (klik → preview/iframe & code panel terisi;
  edit blok tanpa klik → tidak berubah) + E2E.

## Penanganan galat

- Migrasi: bila `html_page` tak punya anak, cukup `dispose`. Bila
  serialisasi rusak, biarkan error boundary global menangani (tak ada
  jalur baru).
- Tombol Jalankan saat kanvas kosong → `bodyHtml === ''` → pratinjau
  kosong + petunjuk tampil. Bukan galat.
- `safeUrl`, CSP, sandbox iframe, escaping — semua tetap, tak disentuh.

## Testing

| Berkas | Perubahan |
|---|---|
| `tests/unit/blocks-html-generator.test.ts` | Buang semua setup `html_page`; blok dibuat langsung top-level. Ganti test "uses only the first page root" → "menggabungkan semua blok top-level jadi body". Tambah test migrasi. |
| `tests/unit/html-mode-view.test.ts` | Tak ada `getBlocksByType('html_page')`. Tambah: klik Jalankan mengisi preview+code; edit tanpa Jalankan tak mengubahnya. |
| `tests/unit/html-mode-persistence.test.ts` | Serialisasi tak lagi memuat `html_page`. Tambah: project lama ber-`html_page` termigrasi saat load. |
| `tests/unit/html-export.test.ts` | Buat blok top-level, bukan `html_page`. |
| `tests/e2e/html-mode.spec.ts` | Hilangkan `html_page` dari fixture; tambah klik "Jalankan" sebelum assert preview; assert tombol ada. |
| `tests/unit/i18n.test.ts` | Tambah `editor.html.run`. Perbarui string bantuan yang menyebut *blok "halaman"*. |
| Baru: `tests/unit/blocks-sprite-toolbox.test.ts` | Assert urutan kategori & nama "Gerakan". |
| Baru: `tests/unit/blocks-toolbox-icons.test.ts` (opsional) | Assert tiap kategori punya `cssconfig.icon`. |
| `src/app/i18n/id.json` bantuan Mode HTML | Redaksi ulang: hapus rujukan blok "halaman"; sebut "seret blok Struktur ke kanvas". |

Baseline saat ini: 341 unit / 10 E2E — semua tetap hijau.

## Di luar lingkup

- Flyout gulir menerus ala Scratch (ditolak — terlalu banyak kerja
  kustom Blockly).
- Renderer Blockly kustom.
- Perubahan pada Mode Sprite selain nama/urutan kategori (tombol bendera
  hijau/stop boleh dipoles visualnya bila murah, tapi bukan syarat).
- Aset seni/ikon pihak ketiga — glyph kategori di-hand-author.
- Perubahan format `.ghtml.json` selain hilangnya blok `html_page`.
