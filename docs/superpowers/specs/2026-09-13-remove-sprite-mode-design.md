# Fase E — Hapus Mode Sprite, editor jadi HTML-only — Design

Status: Disetujui (user: "Setuju, lanjut tulis spec + plan-nya") · Tanggal: 2026-09-13 ·
Menyertai: `PRD.md`, `Design.md`, `ROADMAP.md`

## Ringkasan

User memutuskan: Mode Sprite (animasi ala Scratch) dihapus total dari produk —
"terlalu jelek" dan "yang aku butuhkan cuma HTML doang". Editor jadi
**satu mode saja: HTML**. Tiga keputusan yang sudah dikonfirmasi lewat
`AskUserQuestion`:

1. **Hapus total** kode Sprite (bukan cuma disembunyikan dari UI).
2. **Project lama tidak masalah** kehilangan bagian sprite-nya saat dibuka —
   tidak perlu migrasi data yang hati-hati, cukup jangan sampai *crash*.
3. **Dokumentasi dibereskan tuntas** (PRD, Design, README, landing), bukan
   sekadar tempel-tempel.

Dipecah **dua PR**, karena sifat pekerjaannya beda (kode vs prosa):

- **PR-E1 (implementation plan menyertai dokumen ini)** — penghapusan kode:
  blok/generator/toolbox Sprite, runtime Sprite, UI Sprite mode, penyederhanaan
  model `Project`/editor/header, ekstraksi infrastruktur aset yang ternyata
  dipakai bersama, dan semua test terkait. Dieksekusi subagent-driven seperti
  fase-fase sebelumnya.
- **PR-E2 (tanpa dokumen plan terpisah — dikerjakan langsung oleh coordinator,
  seperti Fase B2)** — penulisan ulang `docs/PRD.md`, `docs/Design.md`,
  `README.md`, dan copy landing page (`index.html` + `landing.css`) supaya
  konsisten "alat HTML-only". Ini kerja editorial satu tarikan napas, bukan
  tugas mekanis yang cocok dipecah jadi brief per-subagent — sama seperti PR-B2
  (resizable panels) yang tidak butuh dokumen plan formal.

Target pemakai tetap anak kelas 4–6 SD. **Nama produk (Game HTML / Kodako
HTML) TIDAK diubah** — itu keputusan terpisah, di luar lingkup ini.

## Konteks kode saat ini (hasil pemetaan)

### Yang murni milik Sprite mode — dihapus total di PR-E1

- **Blok & generator**: `src/blocks/sprite/blocks.ts`, `src/blocks/sprite/generator.ts`,
  `src/blocks/sprite/toolbox.ts`.
- **Runtime**: `src/runtime/sprite/{api,event-bus,interpreter,runtime-context,
  scheduler,sensing,sprite,stage,audio}.ts`.
- **Aset sprite-only**: `src/runtime/sprite/assets/{bg-*.svg}` (6 backdrop),
  `src/runtime/sprite/assets/sounds/*.wav` (8 file), `scripts/gen-sounds.mjs`.
- **UI editor**: `src/app/editor/sprite-mode/{sprite-mode,sprite-panel,
  costume-panel,sound-panel}.ts`, `sprite-mode.css`.
- **Model**: `src/core/sprite-project.ts`.
- **Test unit (22 file)**: `blocks-sound-sensing`, `blocks-sprite-defs`,
  `blocks-sprite-generator`, `blocks-sprite-toolbox`, `sprite-api`,
  `sprite-assets` *(diganti test baru, lihat bawah)*, `sprite-audio`,
  `sprite-broadcast-wait`, `sprite-event-bus`, `sprite-highlight-say`,
  `sprite-interpreter`, `sprite-mode-view`, `sprite-model`,
  `sprite-multi-persist`, `sprite-panels`, `sprite-project`,
  `sprite-runtime-context`, `sprite-scheduler`, `sprite-sensing`,
  `sprite-sound-assets`, `sprite-stage`, dan `html-mode-persistence` (premisnya
  — "dua mode saling tidak bentrok" — tidak relevan lagi tanpa mode kedua).
  Dua file lagi **diedit, bukan dihapus** karena sebagiannya generik:
  `blocks-registry.test.ts` (tulis ulang jadi test `installBlockly()`) dan
  `blocks-theme.test.ts`/`blocks-toolbox-icons.test.ts` (dipangkas ke 3
  kategori HTML).
- **Test e2e (2 file)**: `tests/e2e/sprite-mode.spec.ts`,
  `tests/e2e/sound-sensing.spec.ts`.

### Yang KELIHATANNYA milik Sprite tapi ternyata dipakai bersama — dipindah, bukan dihapus

- **`spriteTheme`** (`src/blocks/theme.ts`) — tema Blockly (warna blok, font,
  komponen workspace/flyout) dipakai **HTML mode juga**
  (`html-mode.ts` → `theme: spriteTheme`). Namanya kebetulan "sprite" tapi
  isinya netral. `blocklyTheme` sudah jadi alias-nya sejak awal.
  **Keputusan**: jadikan `blocklyTheme` nama utama, hapus alias `spriteTheme`;
  `CATEGORY_COLORS`/`blockStyles`/`categoryStyles` dipangkas jadi cuma
  `structure`/`content`/`style` (3 kategori HTML mode); id tema
  `'kodako-sprite'` → `'kodako-html'`.
- **`src/blocks/category-icons.ts`** + rules `.kodako-cat--<key>` di
  `src/blocks/theme.css` — 8 dari 11 entri (motion/looks/sound/events/control/
  sensing/operators/variables) jadi kode mati begitu toolbox Sprite hilang.
  **Keputusan**: pangkas ke 3 entri HTML (`structure`/`content`/`style`).
- **`src/runtime/sprite/assets.ts`** — `BUILTIN_COSTUMES`, `loadUploadedImage`,
  `resolveAssetUrl`, `isBuiltinAssetId` dipakai **HTML mode juga** (fitur
  "Unggah gambar" + resolusi `asset:<id>` di pratinjau/ekspor —
  `html-mode.ts`, `runtime/html/preview.ts`, `runtime/html/export.ts`).
  `BUILTIN_BACKDROPS`, `BUILTIN_SOUNDS`, `loadUploadedSound`,
  `MAX_SOUND_UPLOAD_BYTES` murni Sprite-only.
  **Keputusan**: modul baru **`src/runtime/asset-library.ts`** + folder
  **`src/runtime/asset-library/`** (15 SVG kostum di-`git mv` ke sini,
  nama file sama). Isi modul dipangkas ke yang dipakai HTML mode saja;
  `BUILTIN_COSTUMES` → `BUILTIN_IMAGES` (istilah "kostum" tidak relevan lagi
  untuk pemilih gambar HTML mode); `BuiltinAsset.kind` dihapus (semua yang
  tersisa memang `'image'`, tidak perlu dibedakan lagi).

### Yang disederhanakan (kode tetap ada, bentuknya berubah)

- **`src/core/project.ts`** — `Project` kehilangan field `activeMode` dan
  `sprite`; `ProjectMode`/`SpriteData` dihapus. `createEmptyProject` tidak
  lagi menyeed `assets['builtin:cat']` (HTML mode tidak pernah membaca
  `project.assets` untuk id `builtin:*` — lihat filter di `html-mode.ts`
  `assetOptions()`, jadi seed itu memang sudah tidak berguna untuk HTML mode).
  `validate()` berhenti mensyaratkan `activeMode`/`sprite`. **`formatVersion`
  tetap `1`** — ini pelonggaran field yang tadinya wajib jadi tidak diperiksa
  lagi, bukan perubahan skema yang butuh migrasi/versi baru. Project lama yang
  masih membawa `activeMode`/`sprite` di JSON-nya **tetap valid dan tetap
  bisa dibuka** (field itu jadi tidak terpakai, cuma "nempel" tidak berbahaya
  — sesuai keputusan #2).
- **`src/app/editor/editor-view.ts`** — `renderMode()`/percabangan
  `project.activeMode === 'sprite'` hilang; langsung `renderHtmlMode(...)`.
  `onModeChange` di `renderHeader(...)` dihapus.
- **`src/app/editor/header.ts`** — blok `.editor__modes[role=tablist]` +
  kedua tombol `[data-mode]` + handler panah kiri/kanan dihapus. `EditorMode`
  dihapus dari `HeaderDeps` (`mode`, `onModeChange` hilang).
- **`src/app/editor/editor.css`** — rule `.editor__modes` +
  `.editor__modes .btn[aria-pressed='true']` (+ turunan `:hover`-nya dari
  Fase D) dihapus.
- **`src/blocks/index.ts`** — `installSpriteBlockly()`/`installHtmlBlockly()`
  + flag ganda `spriteInstalled`/`htmlInstalled` disatukan jadi
  **`installBlockly()`** (satu flag). Ekspor `setCostumeOptionsProvider`,
  `setSensingTargetsProvider`, `setSoundOptionsProvider`, `generateThreads`,
  `type ThreadCode` dihapus (semua itu API blok Sprite).
- **`src/app/help/help-panel.ts`** — `Section` kehilangan varian `'sprite'`;
  `SECTIONS` array kehilangan entrinya. Isi bantuan ditulis ulang jadi
  alur satu-mode (lihat i18n di bawah).
- **`src/app/i18n/id.json`** — dihapus: `editor.mode.sprite`,
  `editor.mode.html`, semua `editor.sprite.*` (28 kunci), `a11y.modeTablist`,
  `error.spriteRunFailed`, `error.lastSprite`, `error.audioUnavailable`.
  Ditulis ulang: `help.start` (drop cabang "Pilih Mode Sprite..."),
  `help.trouble` (drop kalimat soal suara). `help.sprite` dihapus.

## Rencana test baru (bukan sekadar hapus)

- **`tests/unit/asset-library.test.ts`** (baru) mem-*port* bagian
  `sprite-assets.test.ts` yang masih relevan untuk HTML mode:
  `BUILTIN_IMAGES`/`BUILTIN_BY_ID` berisi 15 entri termasuk `builtin:cat`,
  `resolveAssetUrl` untuk id *builtin* & id project, `loadUploadedImage`
  (ukuran > 2 MB ditolak, tipe bukan gambar ditolak, sukses menghasilkan
  `dataUrl`). Bagian `BUILTIN_BACKDROPS`/`BUILTIN_SOUNDS`/`loadUploadedSound`
  tidak di-*port* (fiturnya hilang bersama Sprite mode).
- **`tests/unit/project.test.ts`** — assersi yang menyentuh
  `project.sprite`/`project.assets['builtin:cat']` disesuaikan dengan skema
  baru (assets kosong secara default).
- **`tests/unit/a11y-smoke.test.ts`** — 3 dari 5 test dihapus (mode-tablist,
  stage-canvas image role, sprite-panel input labels — ketiganya spesifik
  Sprite); `installSpriteBlockly`/`setSpriteWorkspaceFactoryForTests`/canvas
  2D mock di `beforeEach` (cuma dipakai render sprite stage) ikut dibuang.
  2 test yang tersisa (accessible name tombol editor, accessible name kartu
  Home) tetap relevan tanpa perubahan logika, cuma import yang dirapikan.
- **`tests/e2e/polish.spec.ts`** — test `'the themed (Zelos) sprite workspace
  ...'` dihapus; test `'keyboard: Tab reaches Project Baru ...'` kehilangan
  bagian assersi ArrowRight pada mode tablist (tablist-nya sudah tidak ada),
  sisanya (fokus visible pada Project Baru) dipertahankan.
- **`tests/e2e/html-mode.spec.ts`** — test pertama kehilangan ekor yang
  berpindah ke "Mode Sprite" untuk mengecek workspace tidak saling
  bentrok (baris ~95–116 di versi saat ini); sisanya (alur HTML murni)
  dipertahankan apa adanya.

## Interaksi & risiko

- **Tidak ada dependency npm baru/dihapus** — Blockly tetap dipakai (HTML
  mode). `check:chunks` tetap relevan (anggaran chunk editor).
- **Tidak ada perubahan CSP/keamanan** — di luar lingkup ini.
- **Anggaran chunk editor** kemungkinan **turun** (banyak kode dihapus) —
  tidak perlu perhatian khusus, cukup dicatat di laporan gate.
- **Project lama** (di localStorage siapa pun yang sempat memakai versi
  lama) tetap terbuka; bagian Sprite-nya diam-diam tidak terpakai lagi
  (sesuai keputusan #2 — bukan bug, ini pilihan sadar).
- **`docs/ROADMAP.md`** — file ini gaya penulisannya "menambah entri per fase",
  tidak pernah menulis ulang riwayat fase lama (Fase B1/B2/C tetap dibiarkan
  meski di-*superseded* sebagian oleh Fase D). Fase 1/3a yang mendeskripsikan
  fitur Sprite **tidak diedit ulang** — itu catatan sejarah apa yang pernah
  dibangun. Sebagai gantinya, PR-E1 menambah **satu entri baru** di akhir
  ("Fase E — Mode Sprite dihapus") yang menjelaskan pemangkasan ini secara
  eksplisit, konsisten dengan gaya file.
- **`docs/PRD.md`/`docs/Design.md`/`README.md`/landing copy** — ini dokumen
  yang menjelaskan produk **saat ini** (bukan catatan sejarah), jadi memang
  ditulis ulang tuntas di PR-E2, bukan ditambah catatan.

## Testing (ringkas)

- PR-E1: `tests/unit/asset-library.test.ts` baru; `project.test.ts` +
  `a11y-smoke.test.ts` disesuaikan; semua file test Sprite-only dihapus;
  `polish.spec.ts`/`html-mode.spec.ts` dirapikan. Gate penuh hijau:
  `npm run lint && npm run typecheck && npm test && npm run build &&
  npm run check:chunks && npm run test:e2e`.
- PR-E2: tidak ada perubahan kode/test — cukup `npm run lint` (format
  markdown/HTML tidak divalidasi Prettier untuk `.md`, tapi `index.html`
  & `landing.css` ikut *lint*) + `npm run build` + `npm run test:e2e` (smoke
  test landing) tetap hijau setelah copy berubah.
