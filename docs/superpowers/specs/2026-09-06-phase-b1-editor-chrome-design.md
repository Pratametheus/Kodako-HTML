# Fase B1 — Editor chrome: colour rail, playful theme, flyout-zoom fix — Design

Status: Disetujui lewat brainstorming visual · Tanggal: 2026-09-06 ·
Menyertai: `PRD.md`, `Design.md`, `ROADMAP.md`

## Ringkasan

Fase B memoles UI/UX editor. Dipecah jadi **dua PR** (keputusan user):

- **PR-B1 (dokumen ini):** rail kategori toolbox jadi "pil warna penuh",
  tema editor "playful-lite", dan **bug: zoom workspace ikut memperbesar blok
  di flyout toolbox**.
- **PR-B2 (spec terpisah nanti):** panel yang bisa di-*drag* untuk mengubah
  ukuran (blok ↔ panggung / pratinjau).

Sasaran pemakai tetap anak kelas 4–6 SD; editor harus terasa menyenangkan tapi
tetap tenang untuk dipakai bekerja. Blok Blockly (renderer Zelos) **tidak
diubah** — hanya "bingkai" di sekelilingnya.

## Konteks kode saat ini

- **Rail toolbox** (dari PR #7, `src/blocks/theme.css`): baris `.blocklyTreeRow`
  polos + cakram warna 26px (`.kodako-cat-icon--<key>`, mask glyph). Tiap
  kategori di `src/blocks/sprite/toolbox.ts` & `html/toolbox.ts` punya
  `cssconfig: { icon: 'kodako-cat-icon kodako-cat-icon--<key>' }`. Warna dari
  `CATEGORY_COLORS` di `src/blocks/theme.ts`. Glyph SVG di
  `src/blocks/category-icons.ts` (sumber kebenaran, di-*mirror* di CSS).
- **Bug zoom→flyout**: Blockly `Flyout.getFlyoutScale()` mengembalikan
  `this.targetWorkspace.scale` (dilihat di `node_modules/blockly/blockly_compressed.js`).
  Jadi pratinjau blok di flyout ikut skala zoom workspace. Rail kategori (HTML/CSS)
  tidak ikut — hanya flyout (SVG).
- **Inject**: `sprite-mode.ts` & `html-mode.ts` memanggil `Blockly.inject(el, {
  renderer: 'zelos', trashcan: true, zoom: { controls: true, wheel: true },
  move: { scrollbars: true }, toolbox, theme })`. Tanpa `zoom.startScale`
  (default 1.0).
- **Tombol jalankan**:
  - `sprite-mode.ts:81` — `<button data-green-flag aria-label="…run…">▶ ${run}</button>`
  - `html-mode.ts:73` — `<button class="html-mode__run" data-run-html>▶ ${run}</button>` (tanpa aria-label)
  - kunci i18n `editor.sprite.run` / `editor.html.run` = "Jalankan".
- **Tema chrome**: `src/app/editor/editor.css` (header + wrapper),
  `sprite-mode.css` (grid `1fr 360px`, token lokal `--sprite-ink/-panel/-line`),
  `html-mode.css` (grid `1.15fr 0.85fr`, token lokal `--html-*`). Border 1px
  `#d7dbe2`/`#d8deec`, radius 12–14px, bayangan `0 8px 24px rgb(...)`.
  `.btn` global ada di `src/styles/base.css` (1px border, radius 8px) — dipakai
  Home & header editor.
- **Setup Blockly**: `src/blocks/index.ts` — `installSpriteBlockly()` /
  `installHtmlBlockly()` (idempoten, set locale + daftar blok/generator).
- Tes yang menyentuh area ini: `tests/unit/blocks-sprite-toolbox.test.ts`
  (assert `cssconfig.icon` per kategori), `tests/unit/blocks-toolbox-icons.test.ts`,
  `tests/unit/i18n.test.ts` (string `editor.*.run`), E2E `polish.spec.ts`
  ("themed (Zelos) sprite workspace still loads a block and runs it").

## Keputusan desain

### 1. Rail kategori = pil warna penuh, drawer menyatu dengan flyout

**Keadaan diam (semua baris):** tiap baris kategori adalah **pil warna penuh**
sesuai warna kategori, sudut membulat ~11px, glyph putih di kiri, label tebal.

- Warna latar per baris: `cssconfig.container` per kategori →
  `kodako-cat kodako-cat--<key>`; CSS `.kodako-cat--motion .blocklyTreeRow {
  background: #4C97FF }`, dst. untuk 11 key.
- **Kontras label**: label + glyph tiap kategori dipilih **putih atau ink
  `#2B2B38`** — mana pun yang kontrasnya ≥ 3:1 dengan warna pil itu (teks tebal
  ~14px = "large text", ambang AA 3:1). Implementer menghitung per warna di
  `CATEGORY_COLORS` dan menaruh key-nya di salah satu dari dua daftar selektor
  (`.kodako-cat--X .blocklyTreeLabel { color: … }`). Untuk warna nanggung
  (mis. hijau `#59C059`, ungu `#9966FF`) yang tetap pakai putih, tambah
  `text-shadow: 0 1px 1px rgb(0 0 0 / 25%)` pada labelnya. Tujuan: tak ada label
  yang sulit dibaca.
- **Glyph**: SVG glyph PR #7 **dipertahankan** — mask URI tetap di-*mirror* dari
  `category-icons.ts`. Tapi cakram warna 26px lama **dihapus**: glyph kini duduk
  langsung di atas pil. `.kodako-cat-icon` cukup: `width/height` ~20px,
  `mask-*` (URI dari aturan per-key), dan `background-color` = warna glyph
  (= warna fill mask). Satu aturan bersama set `background-color: #fff`; untuk
  key yang labelnya pakai ink (daftar kontras di atas) override
  `background-color: #2B2B38` — glyph selalu sewarna labelnya. Aturan per-key
  `.kodako-cat-icon--<key>` kini **hanya** membawa
  `mask-image`/`-webkit-mask-image` (baris `background-color: <hex>` lama
  dihapus).

**Hover:** `.kodako-cat:hover .blocklyTreeRow { filter: brightness(1.08);
transform: translateX(2px) }`. Transisi ~0.1s.

**Kategori terbuka (drawer aktif)** — "menyatu dengan flyout":

- Baris terpilih: `border-radius: 11px 0 0 11px; margin-right: -12px;
  transform: scale(1.03); position: relative; z-index: 2` + bayangan halus.
- Flyout di-*wash*: latar flyout jadi versi pucat (~10% opasitas di atas putih)
  warna kategori.
- Baris lain redup: `opacity: .82`.

Ketiganya digerakkan oleh **satu modul kecil** (`src/blocks/toolbox-wash.ts`):
`attachToolboxWash(workspace)` memasang change-listener; saat event
`Blockly.Events.TOOLBOX_ITEM_SELECT`, ambil warna kategori terpilih
(`workspace.getToolbox().getSelectedItem()?.getColour()`), lalu:

- set atribut `data-open="<key>"` pada elemen root toolbox
  (`.blocklyToolboxDiv`),
- set custom property `--kodako-wash: <rgba pucat>` pada root toolbox,
- taruh kelas `kodako-cat--open` di container kategori terpilih, lepas dari yang
  lain.

CSS meng-*key* dari `.kodako-cat--open` & `[data-open] .blocklyToolboxCategory:not(.kodako-cat--open)`
& `.blocklyFlyout { background: var(--kodako-wash, <default>) }`. Tidak
bergantung nama kelas internal Blockly untuk "selected". `attachToolboxWash`
mengembalikan fungsi pembersih (lepas listener); dipanggil saat mode di-*dispose*.

Key `<key>` = 11 nilai `IconKey` yang sudah ada (motion…style). `getColour()`
dari `ToolboxCategory` mengembalikan hex; helper `paleWash(hex, 0.12)` di
`toolbox-wash.ts` menghasilkan string `rgba(...)`.

### 2. Tema chrome = "playful-lite" (bayangan halus)

Satu blok token editor bersama di `src/app/editor/editor.css`:

```
.editor {
  --ed-ink: #2b2b38;
  --ed-line: #e2e6f0;        /* dipakai sbg border 2px */
  --ed-ground: #eef3ff;      /* latar area kerja, tint sangat muda hangat */
  --ed-card: #ffffff;
  --ed-radius: 16px;
  --ed-shadow: 0 1px 3px rgb(30 41 80 / 8%), 0 6px 16px rgb(30 41 80 / 6%);
}
```

- Border kartu/panel/workspace: `2px solid var(--ed-line)` (dari 1px), radius
  `var(--ed-radius)`.
- Bayangan: **halus** — `var(--ed-shadow)`. **Tidak** memakai "bibir" solid
  `0 3px 0` ala landing.
- Header editor: latar putih, border-bottom `2px solid var(--ed-line)`. Nama
  project & tombol header pakai gaya di bawah.
- Tombol editor (`.editor .btn`, tombol mode, tombol panel): border `2px solid
  var(--ed-line)`, `border-radius: 999px` (pil), padding sedikit lebih lega,
  bayangan `var(--ed-shadow)`. Tombol mode aktif (`[aria-pressed="true"]`):
  latar `#4C97FF`, teks putih, border `#4C97FF`.
- `sprite-mode.css` / `html-mode.css`: ganti token grey lokal (`--sprite-line`,
  `--html-line`, dst.) agar mengacu `--ed-*`; pertahankan warna aksen mode
  (hijau jalankan, biru tab). Latar mode: `var(--ed-ground)`.
- Blok Blockly, renderer, `spriteTheme` **tidak diubah**.
- Home page & `src/styles/base.css` `.btn` global **tidak diubah** (di luar
  lingkup; bisa diselaraskan nanti).

### 3. Tombol jalankan = ikon saja

- **Sprite** (`sprite-mode.ts:81`): isi tombol jadi hanya `▶` (atau glyph
  bendera). Tetap `aria-label="${t('editor.sprite.run')}"` + tambah
  `title="${t('editor.sprite.run')}"`. CSS: bujur sangkar membulat ~40×40,
  hijau, tetap `flex: 1`? → **tidak**: karena tak ada teks, jangan regangkan;
  jadikan lebar tetap ~44px, sisakan ruang untuk tombol Stop di sampingnya.
  (Cek markup toolbar panggung; sesuaikan `sprite-stage-toolbar`.)
- **HTML** (`html-mode.ts:73`): isi jadi hanya `▶`. Tambah
  `aria-label="${t('editor.html.run')}"` + `title=...`. CSS `.html-mode__run`:
  jadi tombol ikon ~40×40 (hapus `justify-self: start` + padding teks).
- Kunci i18n `editor.sprite.run` / `editor.html.run` tetap ("Jalankan") —
  sekarang dipakai untuk label aksesibilitas & tooltip. `i18n.test.ts` tak
  berubah.

### 4. Bug: flyout ikut zoom → skala flyout dikunci

- **Penyebab**: `Flyout.getFlyoutScale()` = `targetWorkspace.scale`.
- **Perbaikan**: subclass + registrasi.
  - `src/blocks/flyout.ts`:
    ```ts
    export class KodakoVerticalFlyout extends Blockly.VerticalFlyout {
      override getFlyoutScale(): number {
        return 1;
      }
    }
    export function registerKodakoFlyout(): void {
      Blockly.registry.register(
        Blockly.registry.Type.FLYOUTS_VERTICAL_TOOLBOX,
        Blockly.registry.DEFAULT,
        KodakoVerticalFlyout,
        true, // allow overriding Blockly's built-in
      );
    }
    ```
  - `src/blocks/index.ts`: panggil `registerKodakoFlyout()` sekali di
    `installSpriteBlockly()` **dan** `installHtmlBlockly()` (idempoten; register
    dengan `allowOverrides=true` aman dipanggil ulang), export
    `KodakoVerticalFlyout`.
- Skala tetap **1.0** = tampilan flyout persis seperti sekarang pada zoom
  default; paling tidak mengejutkan. Zoom workspace & scrollbar tetap normal;
  hanya flyout yang berhenti ikut membesar/mengecil.
- Rail kategori (HTML) memang sudah tidak terpengaruh zoom — tidak perlu
  tindakan.

## Unit & boundary

| Unit | Tanggung jawab | Antarmuka | Bergantung pada |
| --- | --- | --- | --- |
| `src/blocks/flyout.ts` | kunci skala flyout ke 1; daftarkan sbg flyout vertikal default | `KodakoVerticalFlyout`, `registerKodakoFlyout()` | `blockly/core` |
| `src/blocks/toolbox-wash.ts` | saat kategori dipilih: set `data-open` + `--kodako-wash` + kelas `kodako-cat--open` | `attachToolboxWash(ws): () => void`, `paleWash(hex, a): string` | `blockly/core`, DOM |
| `src/blocks/theme.css` | seluruh gaya rail: pil warna, kontras, hover, drawer-terbuka | kelas CSS | `CATEGORY_COLORS`, `category-icons.ts` (mirror URI) |
| `src/app/editor/editor.css` | token `--ed-*` + header + tombol editor | kelas + custom props | — |
| `sprite-mode.css` / `html-mode.css` | layout mode pakai token `--ed-*`; tombol jalankan ikon | kelas | `editor.css` |

`attachToolboxWash` menjaga elemen hilang (`getToolbox()` null → no-op) dan tidak
melempar. Semua modul kecil, satu tanggung jawab.

## Penanganan galat

- `getToolbox()` / `getSelectedItem()` null → listener `return` diam.
- `getColour()` mengembalikan string kosong / bukan hex → `paleWash` mengembalikan
  wash default; tidak melempar.
- Registrasi flyout dipanggil sebelum `Blockly.inject` (di `install*Blockly`,
  yang dipanggil sebelum inject di kedua mode).

## Testing

- `tests/unit/blocks-sprite-toolbox.test.ts` (perbarui): tiap kategori kini punya
  `cssconfig.container` = `kodako-cat kodako-cat--<key>` selain `icon`.
- `tests/unit/blocks-toolbox-icons.test.ts` (perbarui): tambah assert kelas
  `container` sinkron dengan key ikon.
- `tests/unit/blocks-flyout.test.ts` (baru): `KodakoVerticalFlyout.prototype
  .getFlyoutScale.call({})` === `1`; `registerKodakoFlyout()` memanggil
  `Blockly.registry.register` dengan tipe `FLYOUTS_VERTICAL_TOOLBOX`, nama
  `DEFAULT`, `allowOverrides = true` (spy).
- `tests/unit/blocks-toolbox-wash.test.ts` (baru, jsdom): `paleWash('#4C97FF',
  0.12)` → `rgba(76, 151, 255, 0.12)`; `attachToolboxWash` dengan workspace
  palsu (`getToolbox` mengembalikan objek dengan `getSelectedItem` &
  `HtmlDiv`) → saat handler event `TOOLBOX_ITEM_SELECT` dipicu, root toolbox
  dapat `data-open` + `--kodako-wash`; fungsi pembersih melepas listener; null
  toolbox → tidak melempar.
- `tests/unit/i18n.test.ts`: tidak berubah.
- E2E `polish.spec.ts`: test Zelos tetap hijau. Tambah: setelah klik kontrol
  zoom-in, `[data-green-flag]` masih terlihat & workspace masih menerima blok.
  (Jika terlalu rapuh untuk memeriksa ukuran flyout, cukup pastikan tidak ada
  galat & toolbox tetap bisa dipakai.)
- Gerbang penuh (`lint`, `typecheck`, `test`, `build`, `check:chunks`,
  `test:e2e`) hijau. `check:chunks`: editor entry chunk tetap < 400 kB (tambahan
  ~1–2 kB untuk 2 modul kecil).
- **QA visual koordinator** sebelum merge: rail pil warna di kedua mode; hover;
  buka kategori → menyatu + wash + redup; zoom workspace → blok flyout **tidak**
  ikut membesar; tombol jalankan ikon saja tapi tetap ada tooltip; chrome
  playful-lite tidak berlebihan.

## Di luar lingkup PR-B1

- Panel drag-resize (PR-B2).
- Perubahan bentuk/warna blok Blockly, renderer.
- Home page / `.btn` global di `base.css`.
- Menu hamburger / layout mobile editor.
- Model blok HTML (`<html>`/`<head>`/`<body>`, blok gaya sbg tag) — itu Fase C.
- Rilis / tag versi baru (masuk lewat PR biasa ke `main`).
