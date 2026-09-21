# Design — Editor Blok "Game HTML"

Status: Draft 1 · Tanggal: 2026-09-03 · Diperbarui: 2026-09-13 (Fase E — Mode
Sprite dihapus, editor HTML-only) · Menyertai: `PRD.md`, `ROADMAP.md`

---

## 1. Arsitektur tingkat tinggi

Aplikasi 100% sisi-klien. Tidak ada backend, tidak ada API pihak ketiga, tidak
ada permintaan jaringan saat dipakai. Satu basis kode web di-*build* menjadi:

- **situs statis** (landing page + editor) untuk hosting gratis, dan
- **aplikasi desktop** lewat Tauri yang membungkus hasil build web yang sama.

```
┌───────────────────────────── Editor (SPA) ─────────────────────────────┐
│                                                                       │
│  app/  ── shell: navigasi Home↔Editor, header, manajer project, i18n   │
│    │                                                                   │
│    ├── core/  ── model & aturan project (tak tahu Blockly / DOM)       │
│    │     project.ts · storage.ts · events.ts                           │
│    │                                                                   │
│    ├── blocks/  ── definisi blok + generator (Blockly)                 │
│    │     theme.ts                                                      │
│    │     html/   blocks · generator(→HTML) · toolbox                   │
│    │                                                                   │
│    ├── runtime/                                                        │
│    │     html/   preview(iframe sandbox) · export · document           │
│    │     asset-library.ts  ── pustaka gambar bawaan + unggah            │
│    │                                                                   │
│    └── ui/  ── komponen kecil: panel, tombol, modal, toast             │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

storage.ts memilih implementasi saat runtime:
    WebStorage  (File System Access API / download-upload / localStorage)
    TauriStorage (dialog & fs asli OS)   ← saat window.__TAURI__ ada
```

**Aturan ketergantungan (dependency rule)**

- `core/` tidak meng-*import* apa pun dari `blocks/`, `runtime/`, `ui/`, atau
  Blockly. Hanya tipe data & logika murni.
- `blocks/` hanya bergantung pada Blockly + tipe dari `core/`. Tugasnya:
  mendefinisikan blok dan **mengubah workspace menjadi teks HTML**. Tidak
  mengeksekusi apa pun.
- `runtime/html` menampilkan/mengekspor teks yang dihasilkan `blocks/`; tidak
  tahu Blockly.
- `app/` merangkai semuanya + UI.

Manfaat: tiap modul dapat dipahami & dites sendiri; mengganti Blockly, renderer,
atau lapisan storage tidak merembet ke modul lain.

> **Sejarah (Fase E, 2026-09-13):** rilis awal punya modul kedua — sebuah
> mesin animasi ala Scratch ("Mode Sprite": `blocks/sprite/`,
> `runtime/sprite/`, panel editor tersendiri) yang mengeksekusi kode anak
> lewat **JS-Interpreter** langkah-per-langkah. Modul ini dihapus total atas
> keputusan pemilik proyek — di luar kebutuhan yang sebenarnya ingin dilayani
> alat ini. `js-interpreter` sudah tidak dipakai sama sekali (hilang dari
> hasil build lewat *tree-shaking*). Satu bagian yang ternyata dipakai
> bersama — pustaka gambar bawaan + unggah gambar — dipindah ke
> `runtime/asset-library.ts` sebelum modul Sprite dihapus. Detail teknis
> lengkap ada di `docs/superpowers/specs/2026-09-13-remove-sprite-mode-design.md`;
> riwayat fitur Sprite (blok, tema, runtime) tetap tercatat di `ROADMAP.md`
> Fase 1 & 3a untuk arsip.

## 2. Struktur repo

```
game-html/
  docs/
    PRD.md
    Design.md
    ROADMAP.md
  index.html                 # entri landing page (root situs)
  editor.html                # entri editor SPA (/editor.html)
  public/                    # favicon, og-image, ikon
  src/
    app/
      shell.ts               # bootstrap SPA, router hash
      router.ts
      home/
        project-manager.ts   # daftar/CRUD project di localStorage
        project-card.ts
      editor/
        editor-view.ts       # layout editor: header + Mode HTML
        header.ts
      i18n/
        index.ts             # t(key), format tanggal id-ID
        id.json
    core/
      project.ts             # tipe Project, create(), validate(), migrate()
      storage.ts             # antarmuka Storage + WebStorage + TauriStorage
      events.ts              # event bus kecil bertipe
      ids.ts                 # generator id
    blocks/
      index.ts               # registrasi ke Blockly, set locale id
      theme.ts
      category-icons.ts
      html/
        blocks.ts
        generator.ts         # Blockly → HTML
        toolbox.ts
    runtime/
      asset-library.ts       # pustaka gambar bawaan CC0 + unggah + resolusi
      html/
        preview.ts           # tulis HTML ke iframe sandbox, debounce
        document.ts           # bungkus dokumen (CSP, judul, dsb.)
        page-title.ts         # ekstrak <title> + slug untuk tab pratinjau
        export.ts             # susun & unduh file .html mandiri
    ui/
      panel.ts  button.ts  modal.ts  toast.ts  icon.ts
    styles/
      *.css
  src-tauri/
    tauri.conf.json
    src/main.rs
    icons/
  tests/
    unit/  e2e/
  vite.config.ts
  package.json
  tsconfig.json
```

## 3. Model data project

Satu file `.ghtml.json`. Aset bawaan dirujuk dengan id; aset unggahan disematkan
sebagai data URL agar project tetap satu file yang portabel.

```ts
type Project = {
  formatVersion: 1
  meta: {
    name: string
    createdAt: string   // ISO 8601
    updatedAt: string   // ISO 8601
  }

  html: {
    workspace: BlocklyJson
  }

  assets: Record<string, {
    kind: "image" | "sound"
    name: string
    source: "builtin" | "embedded"
    ref: string          // id pustaka bawaan  |  data URL
  }>
}
```

> `formatVersion` tetap `1` sejak rilis pertama — belum pernah ada perubahan
> skema yang butuh migrasi bertingkat. Fase E melonggarkan (bukan menaikkan)
> skema: `activeMode` dan `sprite` yang dulu wajib sekarang **diabaikan bila
> ada** — sebuah file project lama yang masih membawa field itu tetap lolos
> `validate()` dan tetap bisa dibuka; field-nya cuma jadi tidak terpakai.

### Aturan & operasi (`core/project.ts`)

- `createEmptyProject(name)` → Project dengan workspace HTML kosong & tanpa
  aset.
- `validate(json): { ok: true, project } | { ok: false, errors }` — memeriksa
  `formatVersion`, keberadaan & tipe tiap field, rujukan aset yang tidak
  menggantung. Field asing (mis. sisa `activeMode`/`sprite` dari project versi
  lama) tidak ditolak — cuma diabaikan.
- `migrate(json)` — menaikkan `formatVersion` lama ke terbaru; dipanggil sebelum
  `validate`. Untuk v1 hanya kerangka (belum ada versi lama).
- `touch(project)` — set `meta.updatedAt`.
- Round-trip `serialize`/`deserialize` wajib idempoten (diuji).

### Autosave & daftar project

- Kunci `localStorage`:
  - `ghtml:projects` → array `{ id, name, updatedAt, thumbnailDataUrl }`.
  - `ghtml:project:<id>` → Project terserialisasi.
  - `ghtml:project:<id>:tmp` → slot tulis sementara.
- Autosave: debounce ~300 ms setelah perubahan workspace → tulis ke `:tmp`
  → bila sukses, ganti nama ke kunci utama & perbarui entri daftar. Mencegah
  korupsi bila tab ditutup di tengah penulisan.

## 4. Mesin blok (Blockly)

### 4.1 Registrasi & locale

- `blocks/index.ts` memuat Blockly, meng-set `Blockly.setLocale(id)` (paket
  locale `id` bawaan Blockly), lalu mendaftarkan blok kustom + generator lewat
  satu fungsi `installBlockly()`.
- Label & tooltip blok kustom ditulis langsung dalam Bahasa Indonesia (tidak
  lewat `id.json`, agar dekat dengan definisi blok).

### 4.2 Tema (`blocks/theme.ts`)

Tema Blockly kustom `blocklyTheme` ("kodako-html"): sudut membulat, tiga warna
kategori (Struktur `#1E88E5`, Konten `#43A047`, Gaya `#8E24AA`), font besar,
kontras tinggi. Toolbox bergaya kategori berwarna.

Rail kategori (Fase B1, `src/blocks/theme.css`): tiap baris kategori adalah
pil warna penuh sesuai `CATEGORY_COLORS`; label/glyph putih (semua tiga
kategori HTML memakai teks putih — tidak ada kategori "terang" yang butuh ink
gelap). Kategori yang dibuka membesar, kehilangan sudut kanannya, dan
"menyatu" dengan flyout yang di-_wash_ warna kategori (~12% opasitas);
kategori lain diredupkan ke 82%. Digerakkan oleh `src/blocks/toolbox-wash.ts`
lewat click-delegation di `.blocklyToolboxDiv`. Blok pratinjau di flyout
dikunci skala 1× oleh `KodakoVerticalFlyout` (`src/blocks/flyout.ts`) supaya
zoom workspace tidak ikut memperbesarnya. Chrome editor "playful-lite": token
`--ed-*` di `src/app/editor/editor.css` (border 2px, radius 16px, bayangan
halus, tombol pil + efek hover). Tombol jalankan (`▶`) ikon saja, dengan
`aria-label` + `title`.

Panel bisa di-*drag* (PR-B2, `src/app/editor/resizable-split.ts`): satu gutter
6px (`role="separator"`, bisa panah-kiri/kanan saat fokus, klik-ganda untuk
reset) di antara panel blok dan sisi kanan editor. Grid memakai
`var(--split-left, …)`; posisi disimpan sebagai fraksi di
`localStorage` (`kodako:split:html`), dipasang ulang (dengan clamp min
320/300 px) saat mount & saat jendela di-*resize*; `onResize` memanggil
`Blockly.svgResize`. Gutter disembunyikan di layout bertumpuk
(`@media (max-width: 900px)`).

Blok kerangka dokumen (Fase C): `<html>` / `<head>` / `<body>` / `<title>`
opsional di kategori Struktur. `generateHtml` mengembalikan
`{ headHtml, bodyHtml, assetIds }`; tanpa `html_document` perilakunya persis
seperti sebelumnya (blok top-level = isi body). Panel "Lihat Kode" kini
menampilkan dokumen penuh lewat `composeDisplayDocument` (tanpa meta CSP; CSP
tetap ada di pratinjau & ekspor lewat `wrapBodyInDocument`). Label blok gaya
memakai notasi properti CSS (`color:`, `background:`, `text-align:`,
`font-size:`, `font-weight: bold`, `font-style: italic`) — field & nilai
dropdown tak berubah. Tiap blok HTML punya `tooltip`; strip "Info blok" di
status bar bawah panel keluaran mencerminkan tooltip blok yang dipilih
(`src/app/editor/html-mode/block-info.ts`, click-delegation).

Panel kanan (Fase D): bar aksi (Jalankan · Unggah gambar · Ekspor HTML) di
atas, strip tab segmented (Pratinjau / Lihat Kode) di bawahnya, lalu panel,
lalu status bar "Info blok" di paling bawah. Panel Pratinjau dibungkus tampilan
"jendela browser" (`src/runtime/html/page-title.ts` mengekstrak `<title>` dari
blok kerangka dokumen untuk ditampilkan di tab).

### 4.3 Daftar blok

| Kelompok | Blok | Hasil |
|---|---|---|
| Struktur | `<html>` { … } _(opsional)_ | dokumen penuh — lihat §4.2 |
| | `<head>` { … } _(opsional, di dalam `<html>`)_ | `<head>…</head>` |
| | judul halaman [teks] _(opsional, di dalam `<head>`)_ | `<title>` |
| | `<body>` { … } _(opsional, di dalam `<html>`)_ | isi `<body>` |
| | bagian { … } | `<section>…</section>` |
| | wadah sejajar [posisi] { … } | `<div style="display:flex;justify-content:…;flex-wrap:wrap">` |
| | judul besar [teks] (level 1–3) | `<h1>`/`<h2>`/`<h3>` |
| | paragraf [teks] | `<p>` |
| | daftar { item… } | `<ul>` |
| | item daftar [teks] | `<li>` |
| | tabel { baris… } | `<table border="1">` |
| | baris tabel { sel… } | `<tr>` |
| | sel tabel [teks] | `<td>` |
| | daftar bernomor { item… } | `<ol>` |
| | `<header>`/`<main>`/`<footer>` { … } | tag sesuai nama |
| Konten | teks [isi] | text node (di-*escape*) |
| | gambar (aset [a] / URL [u]), teks alt [t] | `<img>` |
| | tautan ke [url] tulisan [teks] | `<a>` |
| | tombol [teks] | `<button>` (tanpa aksi) |
| | garis pemisah | `<hr>` |
| Gaya (pembungkus) | `color:` [warna] { … } | `style="color:…"` pada anak |
| | `background:` [warna] { … } | `style="background:…"` |
| | `text-align:` [kiri/tengah/kanan] { … } | `style="text-align:…"` |
| | `font-size:` [kecil/sedang/besar] { … } | `style="font-size:…"` |
| | `font-weight: bold` { … } · `font-style: italic` { … } | `style="font-weight:bold"` / `font-style:italic` |
| | `padding:`/`margin:` [kecil/sedang/besar] { … } | `style="padding:…"` / `"margin:…"` |
| | `border-radius:` [kecil/sedang/bulat] { … } | `style="border-radius:…"` |
| | `box-shadow:` lembut { … } | `style="box-shadow:0 4px 10px rgba(30,41,80,.15)"` |
| | `font-family:` [standar/rapi/mesin ketik] { … } | `style="font-family:…"` |

Blok gaya menggabungkan `style` bila ditumpuk. Tidak ada blok "HTML mentah" dan
tidak ada blok skrip. Tanpa `html_document`, blok top-level = isi `<body>`
langsung (perilaku sejak sebelum Fase C, dipertahankan untuk kompatibilitas).
Wadah Sejajar (Fase F) adalah satu-satunya blok yang menyusun gaya dari
field-nya sendiri alih-alih lewat blok Gaya pembungkus — lihat catatan
arsitektur di `docs/superpowers/specs/2026-09-21-curriculum-gap-blocks-design.md`.
Gambar (`html_image_asset`/`html_image_url`, Fase F) punya dropdown ukuran
opsional (`asli`/`kecil`/`sedang`/`besar`) yang menambah `style="width:…"`
bila bukan `asli` — `asli` (string kosong) selalu jadi pilihan pertama, jadi
project yang disimpan sebelum Fase F tampil tak berubah.

### 4.4 Toolbox

- `html/toolbox.ts` mendefinisikan kategori berwarna, urutan blok, dan blok
  default pada input (shadow blocks) agar anak jarang bertemu input kosong.

## 5. Generator (`blocks/html/generator.ts`)

- Menghasilkan string HTML ter-indent. Contoh:

  ```html
  <div>
    <h1 style="color:red">Judul Saya</h1>
    <p>Halo dunia</p>
    <img src="asset:kucing" alt="kucing">
  </div>
  ```

- `asset:<id>` di-*resolve* ke data URL / URL bawaan (lewat
  `runtime/asset-library.ts`) saat render preview & saat ekspor.
- `safeUrl()` menyaring skema URL pada `<a href>`/`<img src>` — hanya
  `http(s):`, `mailto:`, path relatif, dan `#` yang diloloskan; skema lain
  (`javascript:`, dsb.) dikosongkan.
- Selalu memancarkan dokumen valid; teks anak selalu di-*escape*
  (`runtime/html/escape.ts`).
- Dengan `html_document`, generator mengembalikan `{ headHtml, bodyHtml,
  assetIds }` — lihat §4.2.

## 6. Runtime (`runtime/html/*`)

### 6.1 Preview (`preview.ts`)

- `<iframe sandbox="allow-same-origin">` — **tanpa** `allow-scripts`.
- Pada perubahan workspace (klik "Jalankan", debounce ~300 ms): generator →
  HTML → set `iframe.srcdoc` dengan dokumen lengkap (`document.ts`: reset CSS
  minimal + CSP `script-src 'none'` + isi `<body>`).
- `asset:<id>` di-*resolve* ke data URL sebelum di-*inject*.
- Dibungkus tampilan "jendela browser" (Fase D) di panel kanan editor: titik
  lampu dekoratif, tab yang menunjukkan `<title>` halaman (`page-title.ts`
  `extractTitle`), dan bilah alamat non-interaktif berisi slug nama halaman
  (`slugifyTitle`).

### 6.2 Panel "Lihat Kode"

- Menampilkan dokumen HTML penuh (`composeDisplayDocument`, tanpa CSP — hanya
  kosmetik untuk dibaca anak) dengan sorot sintaks (highlight.js, dibundel).
  Read-only.

### 6.3 Ekspor (`export.ts`)

- Susun dokumen `.html` lengkap & mandiri: `<!doctype html>`, `<meta charset>`,
  CSP, `<title>` dari blok judul atau nama project, gaya reset minimal,
  `<body>` hasil generator, semua aset sebagai data URL.
- Picu unduhan (Web) atau dialog simpan (Tauri).

## 7. Shell & navigasi (`src/app`)

- **Router hash** (`router.ts`): `#/` → Home, `#/editor/:id` → Editor. Tanpa
  library.
- **Home** (`home/project-manager.ts`): daftar kartu project dari
  `ghtml:projects`; aksi Baru / Buka File / (per kartu) buka, ganti nama,
  duplikat, hapus, unduh.
- **Editor** (`editor/editor-view.ts`): header + area kerja. Header: nama
  project (edit inline), Simpan, Buka, Ekspor, kembali ke Home. Editor
  merender langsung Mode HTML — tidak ada pemilih mode (dihapus di Fase E).
- Autosave dipicu oleh listener perubahan workspace.

## 8. Lapisan storage (`core/storage.ts`)

Satu antarmuka, dua implementasi, dipilih saat runtime:

```ts
interface Storage {
  listProjects(): Promise<ProjectSummary[]>
  loadProject(id: string): Promise<Project>
  saveProject(p: Project): Promise<void>          // autosave → localStorage
  importFromFile(): Promise<Project>              // pilih & baca .ghtml.json
  exportToFile(p: Project): Promise<void>         // tulis .ghtml.json
  exportHtml(name: string, html: string): Promise<void>
}
```

- **WebStorage**: `listProjects`/`load`/`save` pakai `localStorage` (dengan slot
  `:tmp`). `importFromFile`/`exportToFile` pakai File System Access API bila
  tersedia; jika tidak, `<input type=file>` + unduh `Blob`.
- **TauriStorage**: `import`/`export` pakai `tauri-plugin-dialog` +
  `tauri-plugin-fs` (dialog & baca/tulis file asli). Daftar & autosave tetap di
  `localStorage` (webview Tauri menyediakannya) — konsisten & sederhana.
- Pemilihan: `const storage = ('__TAURI__' in window) ? new TauriStorage() : new WebStorage()`.

## 9. Landing page (`index.html`, di root situs)

- Statis, dibangun oleh Vite sebagai salah satu halaman (`build.rollupOptions.input`).
- Arah visual "Blocky Playground" (lihat
  `docs/superpowers/specs/2026-09-06-phase-a-landing-page-design.md`): nama merek
  "Kodako HTML", palet warna kategori editor, tombol tebal dengan bayangan solid.
- Bagian: nav sticky · Hero (judul kartu-huruf beranimasi, tagline, tombol
  "Mulai Buat" → `editor.html`, "Unduh Aplikasi" → GitHub Releases) · pita demo
  (loop SVG/CSS blok tersusun) · "Apa ini?" · 3 langkah cara pakai · bagian
  untuk guru (tautan Jurnal Mengajar) · footer. Copy ditulis ulang di Fase E
  untuk menghapus framing "dua mode".
- Aset ilustrasi orisinal CC0 di `src/landing/assets/`; judul memakai Fredoka
  (SIL OFL 1.1) yang di-*bundle* di `src/landing/fonts/` — tanpa CDN, jalan
  offline. Semua animasi mati di bawah `prefers-reduced-motion`.

## 10. i18n (`src/app/i18n`)

- `t(key, params?)` membaca `id.json` (satu berkas datar bertingkat).
- `formatDate(iso)` pakai `Intl.DateTimeFormat('id-ID', …)`.
- Blockly: `Blockly.setLocale(id)`; label blok kustom hard-coded Bahasa
  Indonesia.
- Struktur siap multi-bahasa (peta `locale → dict`) tetapi rilis 1 hanya `id`.

## 11. Penanganan error & keamanan

- **Preview HTML**: `iframe` ber-*sandbox* tanpa skrip; teks anak di-*escape*;
  hanya struktur/atribut dari blok yang jadi markup; tidak ada blok HTML
  mentah; `safeUrl()` menyaring skema URL berbahaya.
- **Batas sumber daya**: aset unggahan ≤ 2 MB; tolak dengan pesan jelas.
- **File project**: `migrate` → `validate`; file rusak/asing → dialog jelas +
  opsi "coba muat sebisanya" vs batal; autosave tidak ditimpa sampai muat
  sukses. Field asing dari format project versi lama diabaikan, bukan ditolak
  (lihat §3).
- **Autosave defensif**: tulis `:tmp` → tukar.
- **Error boundary global**: layar "Maaf, ada yang salah" + Muat ulang + salin
  detail; autosave terakhir aman.
- **Privasi**: tidak ada permintaan jaringan pihak ketiga, tidak ada telemetry.

## 12. Testing

| Lapis | Alat | Contoh kasus |
|---|---|---|
| Unit | Vitest | `validate`/`migrate` project (termasuk: field `activeMode`/`sprite` peninggalan project lama diabaikan, bukan ditolak); round-trip serialisasi idempoten; generator html→HTML (snapshot); pustaka aset (`asset-library.ts`: unggah gambar, resolusi `asset:<id>`) |
| E2E | Playwright (headless) | project baru → tambah judul + paragraf + gambar → Jalankan → preview memuat teks di tab & bilah alamat "jendela browser" → Lihat Kode; simpan → reload → project pulih; ekspor HTML → berkas ter-unduh |
| Manual | checklist | tema/warna blok; layout pada 1366×768; a11y dasar (kontras, target klik, fokus keyboard) |

CI (GitHub Actions): `lint` + `test` (unit) + `test:e2e` + `check:chunks` pada
tiap push/PR. Build desktop hanya pada tag `v*`.

## 13. Build & rilis

- **Web**: `vite build` → `dist/` berisi `index.html` (landing, di root) +
  `editor.html` (editor SPA) + aset. Deploy statis ke Cloudflare Pages.
- **Desktop**: `tauri build` → installer Windows (`.msi` / `.exe`), di-*attach*
  ke GitHub Releases. Tombol "Unduh Aplikasi" di landing menunjuk ke rilis
  terbaru. macOS/Linux menyusul (belum dijadwalkan).
- **Versi format**: `formatVersion` project dinaikkan hanya lewat `migrate`
  yang diuji; catat perubahan di `Design.md` §3.
- **Aset**: seluruh aset bawaan CC0/domain publik; sumber & kredit dicatat di
  `docs/` dan footer landing.

## 14. Keputusan yang sudah diambil

- Mesin blok: **Blockly** + blok & generator kustom + tema kustom (bukan
  scratch-blocks/scratch-gui, bukan mesin sendiri).
- UI: **TypeScript vanilla + store pub/sub kecil** (bukan React); Preact sebagai
  jalur ganti bila UI tumbuh.
- Desktop: **Tauri** (fallback Electron bila toolchain Rust menghambat).
- Bahasa antarmuka: **Bahasa Indonesia saja** untuk rilis 1.
- Tanpa backend, akun, cloud, komunitas, atau API pihak ketiga.
- Editor **HTML-only** (Fase E, 2026-09-13) — tidak ada eksekusi kode anak
  sama sekali; blok hanya menghasilkan markup statis lewat generator teks,
  tidak pernah lewat `eval`/`Function`/interpreter.
