# Fase A — Perombakan Landing Page ("Kodako HTML") — Design

Status: Disetujui lewat brainstorming visual · Tanggal: 2026-09-06 ·
Menyertai: `PRD.md`, `Design.md`, `ROADMAP.md`

## Ringkasan

Landing page (`index.html` di root situs) sekarang kaku, datar, seperti formulir
administrasi. Sasaran pemakainya anak kelas 4–6 SD, jadi tampilannya harus terasa
menyenangkan, interaktif, dan tidak mengintimidasi — tanpa menambah framework
(tetap vanilla HTML/CSS/TS, sesuai batasan proyek).

Fase A merombak **hanya landing page**. Editor, aplikasi Tauri, dan dokumen lain
tidak disentuh (itu Fase B & C).

Yang berubah:

1. Arah visual **"Blocky Playground"** — motif blok ala Scratch jadi identitas:
   blok kode melayang, warna kategori editor, tombol tebal dengan "bibir"
   bayangan solid, judul dari kartu-huruf.
2. Nama merek di landing = **"Kodako HTML"** (bukan "Game HTML"). Hanya di
   landing page: hero, nav, `<title>`, meta OG, footer. Nama di editor / Tauri /
   docs tetap untuk sekarang.
3. Enam bagian lama dipertahankan strukturnya, semuanya di-redesign.
4. **Pita demo** baru tepat setelah hero: animasi SVG/CSS buatan tangan (blok
   nyambung + sprite melompat) supaya anak langsung "lihat sesuatu bergerak"
   sebelum membaca teks.
5. 20 aset SVG orisinal (branch `phase-a-landing-assets`, commit `606bf0f`,
   sudah disetujui) diintegrasikan.
6. Satu webfont bulat (gaya Fredoka) di-*bundle* untuk judul saja; teks isi
   tetap system font. Wajib jalan offline — tidak ada Google Fonts CDN.
7. Animasi: kartu-huruf menari sekali saat load lalu diam (hover mengulang);
   blok melayang bergerak halus + parallax ringan; maskot mengangguk pelan.
   Semua patuh `prefers-reduced-motion`.

## Konteks kode saat ini

- `index.html` — markup landing (92 baris; hero + `<main class="landing">` berisi
  4 `<section>` + `<footer>`). CTA `data-cta-editor` → `/editor.html`,
  `data-cta-download` → halaman Releases GitHub. Favicon `/favicon.svg`
  (`public/favicon.svg`).
- `editor.html` — entri editor SPA (tak disentuh). Juga memakai `/favicon.svg`.
- `src/landing/landing.css` — 73 baris, gaya datar seadanya.
- `src/landing/landing.ts` — 2 baris: mengisi `[data-year]`.
- `src/landing/assets/*.svg` — **belum ada di `main`**; ada di branch
  `phase-a-landing-assets` (20 file + `README.md`, lint & prettier lulus).
- `src/blocks/theme.ts` — sumber warna kategori (`CATEGORY_COLORS`).
- Vite multi-page: input `landing` = `index.html`, `editor` = `editor.html`.
  Aset yang direferensi relatif otomatis ditangani Vite (hashing + inline).
- Tes: `tests/unit/landing.test.ts` (regex atas string `index.html`),
  `tests/e2e/smoke.spec.ts` (test "landing page … links to the editor").
- `scripts/check-chunks.mjs` hanya membudget *editor* entry chunk; landing tidak
  dibatasi tapi kita jaga tetap kecil.

## Keputusan desain

### 1. Nama merek "Kodako HTML" di landing

Ganti semua kemunculan "Game HTML" di `index.html` → "Kodako HTML":
`<h1>` hero, `<title>`, `<meta og:title>`, `<meta og:description>` bila menyebut
nama, teks "Untuk Guru", footer. Tagline tetap:
"Susun blok, buat animasi dan halaman web sendiri. Berbahasa Indonesia, bisa
dipakai tanpa internet."

`public/favicon.svg` diganti isinya dengan mark logo baru (dari
`logo-kodako.svg`), sehingga favicon konsisten di landing **dan** editor. Path
`/favicon.svg` tidak berubah.

Di luar lingkup: mengganti nama di UI editor, judul jendela Tauri, README, atau
docs. Divergensi nama produk vs repo untuk komponen non-landing tetap dibiarkan
sampai ada keputusan terpisah.

### 2. Arah visual "Blocky Playground"

- **Palet** dikunci ke warna kategori editor (`src/blocks/theme.ts`) supaya
  landing ↔ editor terasa satu produk:

  | token | hex | pakai |
  | --- | --- | --- |
  | brand-blue | `#4C97FF` | gradasi hero (awal), aksen utama |
  | brand-purple | `#9966FF` | gradasi hero (akhir) |
  | block-blue | `#1E88E5` | blok kode |
  | block-green | `#59C059` | blok kode |
  | block-amber | `#FFBF00` | blok kode · **isi CTA utama** |
  | block-orange | `#FFAB19` | blok kode |
  | block-magenta | `#CF63CF` | blok kode · aksen |
  | block-sky | `#5CB1D6` | blok kode |
  | ink | `#2B2B38` | semua garis tepi, teks di atas terang |
  | bg-tint | `#F5F7FF` | latar halaman di bawah hero |
  | paper | `#FFFFFF` | kartu |

  Semua sebagai custom property di `:root` (`--brand-blue`, dst.).

- **Tombol** bergaya "chunky": sudut membulat besar, `box-shadow: 0 4px 0`
  warna lebih tua sebagai "bibir", turun 2px saat `:active`. CTA utama isi
  `--block-amber` teks `--ink`; CTA sekunder putih border ink.

- **Hero**: gradasi `--brand-blue` → `--brand-purple`, sudut bawah membulat
  besar. Isi: kartu-huruf "KODAKO HTML", tagline, dua tombol. Dekorasi:
  4–6 `block-*.svg` melayang (posisi absolut), `mascot-peek.svg` mengintip dari
  tepi, 3–4 `tool-*.svg` tersebar.

- **Tipografi**: judul (`h1`–`h3`, label) pakai webfont bulat; body pakai
  system stack yang sudah ada. Lihat §4.

### 3. Struktur halaman

Urutan dari atas:

1. **Nav** — bar tipis *sticky*, latar putih semi-transparan + blur tipis saat
   di-scroll. Isi: `logo-kodako.svg` + "Kodako HTML" · tautan "Apa ini?",
   "Cara pakai", "Untuk Guru" (anchor ke section) · tombol "Buka Editor"
   (→ `/editor.html`). Di ≤ 720px tautan tengah disembunyikan, sisakan logo +
   "Buka Editor".
2. **Hero** — seperti §2.
3. **Pita demo** (baru) — lihat §5. Band sendiri langsung setelah hero, latar
   `--bg-tint`, ada caption satu baris ("Contoh: blok disusun, tokoh bergerak").
4. **Apa ini?** — paragraf yang ada (nama → "Kodako HTML") + komposisi hiasan
   dari aset yang ada (tumpukan 2–3 blok + `mascot-point.svg`), tanpa aset baru.
5. **Cara pakai** — 3 langkah. Ikon langkah = emoji / bentuk CSS (bukan SVG
   khusus). Kartu langkah bernomor, sudut membulat, aksen warna kategori.
6. **Dua Mode** — dua kartu (Sprite, HTML). Visual tiap kartu dikomposisi dari
   aset yang ada (Sprite: `mascot-point` + satu `block-*`; HTML: tumpukan
   `block-*` + tanda `< >`), bukan ilustrasi mode khusus.
7. **Untuk Guru** — paragraf + tautan ke Jurnal Mengajar. Tanpa aset.
8. **Footer** — "© <tahun> Kodako HTML. Kode sumber terbuka." + kredit CC0 +
   tautan GitHub. `[data-year]` tetap diisi `landing.ts`.

### 4. Tipografi — webfont bulat, offline, judul saja

- Font: **Fredoka** (SIL Open Font License 1.1). Satu berat statik (SemiBold,
  ~600), subset Latin, format `woff2`. Target ≤ 30 KB.
- Berkas: `src/landing/fonts/fredoka-semibold.woff2` + `src/landing/fonts/OFL.txt`
  (teks lisensi lengkap).
- `@font-face` di `landing.css` dengan `font-display: swap`; fallback stack
  `"Fredoka", system-ui, "Segoe UI", sans-serif` untuk judul. Body tidak diubah.
- Tidak ada `<link>` ke fonts.googleapis.com. Vite mem-*fingerprint* woff2 dan
  menyalinnya ke `dist/assets/`.
- README aset diperbarui / dibuat catatan bahwa font pihak ketiga (OFL) berbeda
  dari aset CC0 buatan sendiri.

### 5. Pita demo — animasi SVG/CSS buatan tangan

- Satu blok markup statis (SVG inline + beberapa `<div>`), dianimasikan murni
  dengan `@keyframes` CSS. **Tidak ada rekaman layar, tidak ada berkas video/GIF.**
- Isi loop (± 6–8 detik, `animation-iteration-count: infinite`):
  1. Dua–tiga potongan `block-*.svg` meluncur masuk dari kiri dan "klik"
     nyambung jadi tumpukan (transform translate + sedikit squash saat snap).
  2. Sprite kecil — bentuk CSS sederhana (kotak membulat kecil bermata, **bukan
     maskot**) — melompat menyeberang mengikuti irama tumpukan.
  3. Reset halus, ulang.
- Di bawah `prefers-reduced-motion: reduce`: loop dibekukan pada 1 frame
  "sudah tersusun" (tumpukan penuh + sprite di tengah), tidak ada gerak.
- Ringan: hanya CSS + aset yang sudah ada; tidak menambah berat berarti.

### 6. Integrasi aset

- Branch kerja Fase A (`phase-a-landing-page`) dibangun **di atas**
  `phase-a-landing-assets`, jadi 20 SVG + README ikut dalam satu PR.
- Blok dekoratif melayang: elemen `<img src="…/block-*.svg">` posisi absolut,
  dianimasi lewat `transform` CSS. Maskot: `<img>` juga (bob = CSS).
- Logo di nav: `<img src="…/logo-kodako.svg">`. Favicon: `public/favicon.svg`
  diisi ulang dengan mark yang sama.
- Doodle alat: `<img>` absolut, statis atau ikut drift halus.
- Referensi path relatif dari `index.html` / `landing.css` supaya Vite
  meng-*hash*-nya.

### 7. Gerak & aksesibilitas

- **Kartu-huruf** (`src/landing/hero-letters.ts`):
  - `initHeroLetters(container, { reducedMotion })`. Memecah judul jadi
    `<span class="letter" style="--i: n">` per huruf (spasi = elemen pemisah).
  - Intro: entrance ber-*stagger* (fade + translateY) + satu lintasan "tarian".
    Delay per huruf dari `--i`.
  - 8 varian keyframe tarian (rubber-band, hinge, squash-jump, pop,
    elastic-slide, shake, levitate, spin) — dipilih per indeks huruf. Ini
    menerjemahkan *ide* komponen `dancing-letters` React yang dilampirkan ke
    CSS vanilla; **tidak** menyalin kode React itu.
  - Hover satu huruf → tambah kelas `is-dancing`; `animationend` melepasnya.
  - `reducedMotion` true → huruf langsung tampil, tanpa intro & tanpa wiring
    hover.
- **Parallax** (`src/landing/parallax.ts`):
  - `initParallax(nodes, { reducedMotion })`. Listener `scroll` di-*throttle*
    `requestAnimationFrame`; set `--parallax-y` per node (fraksi kecil dari
    `scrollY`). `reducedMotion` true → no-op (tidak pasang listener).
- **Drift & bob**: murni `@keyframes` CSS pada `.float-block` / `.hero-mascot`,
  amplitudo kecil. Dimatikan di blok `@media (prefers-reduced-motion: reduce)`.
- `landing.css` punya satu blok `@media (prefers-reduced-motion: reduce)` yang
  menyetel `animation: none; transition: none` untuk semua elemen animasi.

## Unit & boundary

| Unit | Tanggung jawab | Antarmuka | Bergantung pada |
| --- | --- | --- | --- |
| `index.html` | markup + urutan section | — | aset, `landing.css`, `landing.ts` |
| `src/landing/landing.css` | seluruh tampilan + `@keyframes` + `@font-face` + reduced-motion | kelas + custom props | woff2, `assets/*.svg` |
| `src/landing/landing.ts` | entri: baca reduced-motion, panggil init hero + parallax, isi tahun | — | `hero-letters.ts`, `parallax.ts` |
| `src/landing/hero-letters.ts` | pecah judul jadi span + animasi intro + hover replay | `initHeroLetters(el, opts)` | DOM saja |
| `src/landing/parallax.ts` | set `--parallax-y` saat scroll, rAF-throttle | `initParallax(nodes, opts)` | DOM saja |

Semua fungsi init menjaga elemen hilang (`if (!el) return`), tidak melempar —
mengikuti gaya `landing.ts` yang ada (`if (yearEl)`). Tidak ada state, storage,
atau network. Jalan saat `DOMContentLoaded`.

## Penanganan galat

- Elemen tak ditemukan → init diam-diam `return`. Halaman tetap tampil statis.
- `matchMedia` tak ada (jsdom lama) → anggap `reducedMotion = false` lewat
  `?.matches ?? false`.
- Font gagal muat → `font-display: swap` memakai fallback; tidak ada JS yang
  bergantung pada font.

## Testing

- `tests/unit/landing.test.ts` (perbarui): baca `index.html` —
  - `lang="id"`, judul mengandung "Kodako HTML", bukan "Game HTML".
  - `data-cta-editor` href `/editor.html`; `data-cta-download` ada.
  - Semua bagian ada: hero, pita demo `[data-demo]`, "Apa ini?", "Cara pakai",
    "Dua Mode", "Untuk Guru", footer; `[data-year]` ada.
  - `landing.css` memuat `@font-face` untuk Fredoka dan satu blok
    `prefers-reduced-motion`.
- `tests/unit/landing-hero.test.ts` (baru, jsdom): `initHeroLetters` memecah
  judul jadi span per huruf; dengan `reducedMotion: true` tidak memasang
  listener hover; tidak melempar bila container null.
- `tests/unit/landing-parallax.test.ts` (baru, jsdom): `initParallax` dengan
  `reducedMotion: true` tidak memasang listener scroll; tanpa itu, memanggil
  scroll handler menyetel `--parallax-y`.
- `tests/e2e/smoke.spec.ts` (perbarui): test landing → heading "Kodako HTML",
  klik "Mulai Buat" → URL `/editor.html`. Tambah assert `[data-demo]` terlihat.
- Gerbang penuh (`lint`, `typecheck`, `test`, `build`, `check:chunks`,
  `test:e2e`) hijau. `check:chunks` tak berubah (hanya editor yang dibudget);
  catat ukuran `dist/` landing sebelum/sesudah di badan PR.

## Anggaran & kinerja

- Berat tambahan target < 60 KB terkompresi: woff2 ≤ 30 KB, 20 SVG total ~15 KB,
  JS landing naik dari ~0.15 KB jadi < 3 KB.
- Nol dampak ke bundle editor.
- Semua aset offline; tidak ada permintaan jaringan saat runtime.

## Di luar lingkup Fase A

- Perubahan UI editor (Fase B), model blok HTML (Fase C).
- Ganti nama "Game HTML" di editor / Tauri / README / docs (selain landing).
- Rekaman layar / video / GIF demo asli.
- Ilustrasi mode khusus, ikon langkah khusus (dikomposisi dari aset yang ada /
  emoji).
- Menu hamburger mobile (tautan cukup disembunyikan; nav tetap sederhana).
- Rilis baru / tag versi (integrasi ini masuk lewat PR biasa ke `main`).
