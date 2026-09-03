# Design — Editor Blok "Game HTML"

Status: Draft 1 · Tanggal: 2026-09-03 · Menyertai: `PRD.md`, `ROADMAP.md`

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
│    │     sprite/ blocks · generator(→JS) · toolbox                     │
│    │     html/   blocks · generator(→HTML) · toolbox                   │
│    │                                                                   │
│    ├── runtime/                                                        │
│    │     sprite/ stage(Canvas) · sprite · interpreter · api · assets   │
│    │             · audio                                               │
│    │     html/   preview(iframe sandbox)                               │
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
  mendefinisikan blok dan **mengubah workspace menjadi teks** (JS atau HTML).
  Tidak mengeksekusi apa pun.
- `runtime/` mengeksekusi teks/model. `runtime/sprite` tidak tahu Blockly
  (kecuali satu callback opsional untuk menyorot blok berdasarkan id).
- `app/` merangkai semuanya + UI.

Manfaat: tiap modul dapat dipahami & dites sendiri; mengganti Blockly, renderer,
atau lapisan storage tidak merembet ke modul lain.

## 2. Struktur repo

```
game-html/
  docs/
    PRD.md
    Design.md
    ROADMAP.md
  index.html                 # entri editor
  landing.html               # entri landing page
  public/                    # favicon, og-image, ikon
  src/
    app/
      shell.ts               # bootstrap SPA, router hash
      router.ts
      home/
        project-manager.ts   # daftar/CRUD project di localStorage
        project-card.ts
      editor/
        editor-view.ts       # layout editor, switch mode
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
      sprite/
        blocks.ts
        generator.ts         # Blockly → JS
        toolbox.ts
      html/
        blocks.ts
        generator.ts         # Blockly → HTML
        toolbox.ts
    runtime/
      sprite/
        stage.ts             # renderer Canvas 2D
        sprite.ts            # model Sprite (data murni) + operasi
        interpreter.ts       # bungkus JS-Interpreter: run/step/stop
        scheduler.ts         # loop thread kooperatif per frame
        api.ts               # fungsi yang diekspos ke kode terinterpretasi
        event-bus.ts         # greenFlag, spriteClicked, keyPressed, broadcast
        assets.ts            # pustaka kostum/suara CC0 bawaan
        audio.ts             # bungkus Web Audio
      html/
        preview.ts           # tulis HTML ke iframe sandbox, debounce
        export.ts            # susun & unduh file .html mandiri
    ui/
      panel.ts  button.ts  modal.ts  toast.ts  icon.ts
    styles/
      *.css
  src-tauri/
    tauri.conf.json
    src/main.rs
    icons/
  tests/
    unit/  integration/  e2e/
  vite.config.ts
  package.json
  tsconfig.json
```

## 3. Model data project

Satu file `.ghtml.json`. Aset bawaan dirujuk dengan id; aset unggahan disematkan
sebagai data URL agar project tetap satu file yang portabel.

```ts
type AssetRef = { assetId: string }

type Project = {
  formatVersion: 1
  meta: {
    name: string
    createdAt: string   // ISO 8601
    updatedAt: string   // ISO 8601
  }
  activeMode: "sprite" | "html"

  sprite: {
    stage: {
      backdrop: AssetRef | null
    }
    sprites: Array<{
      id: string
      name: string
      x: number            // -240..240, pusat panggung = 0
      y: number            // -180..180
      direction: number    // derajat, 90 = kanan (konvensi Scratch)
      size: number         // persen, default 100
      visible: boolean
      costumes: AssetRef[]
      currentCostume: number
      sounds: AssetRef[]
      script: BlocklyJson  // Blockly.serialization.workspaces.save()
    }>
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

### Aturan & operasi (`core/project.ts`)

- `createEmptyProject(name)` → Project dengan satu sprite default & workspace
  html kosong.
- `validate(json): { ok: true, project } | { ok: false, errors }` — memeriksa
  `formatVersion`, keberadaan & tipe tiap field, rentang nilai numerik, rujukan
  aset yang tidak menggantung.
- `migrate(json)` — menaikkan `formatVersion` lama ke terbaru; dipanggil sebelum
  `validate`. Untuk v1 hanya kerangka (belum ada versi lama).
- `touch(project)` — set `meta.updatedAt`.
- Round-trip `serialize`/`deserialize` wajib idempoten (diuji).

### Autosave & daftar project

- Kunci `localStorage`:
  - `ghtml:projects` → array `{ id, name, updatedAt, thumbnailDataUrl }`.
  - `ghtml:project:<id>` → Project terserialisasi.
  - `ghtml:project:<id>:tmp` → slot tulis sementara.
- Autosave: debounce ~1 dtk setelah perubahan workspace/state → tulis ke `:tmp`
  → bila sukses, ganti nama ke kunci utama & perbarui entri daftar. Mencegah
  korupsi bila tab ditutup di tengah penulisan.
- Thumbnail: snapshot kecil panggung (atau preview HTML) saat autosave.

## 4. Mesin blok (Blockly)

### 4.1 Registrasi & locale

- `blocks/index.ts` memuat Blockly, meng-set `Blockly.setLocale(id)` (paket
  locale `id` bawaan Blockly), lalu mendaftarkan blok kustom + generator.
- Label & tooltip blok kustom ditulis langsung dalam Bahasa Indonesia (tidak
  lewat `id.json`, agar dekat dengan definisi blok).

### 4.2 Tema (`blocks/theme.ts`)

Tema Blockly kustom "rasa Scratch": sudut membulat, warna kategori mirip
Scratch (Kejadian kuning, Gerak biru, Tampilan ungu, Suara merah muda, Kontrol
oranye, Sensor biru muda, Operator hijau, Variabel merah-oranye), font besar,
kontras tinggi. Toolbox bergaya kategori berwarna.

### 4.3 Daftar blok — Mode Sprite

Topi (hat):

| Blok | Generator (inti) |
|---|---|
| saat bendera hijau diklik | daftarkan handler `greenFlag` |
| saat sprite ini diklik | handler `spriteClicked` |
| saat tombol [tombol] ditekan | handler `keyPressed(tombol)` |
| saat terima pesan [pesan] | handler `broadcast(pesan)` |

Perintah:

| Kategori | Blok |
|---|---|
| Kejadian | kirim pesan [pesan] · kirim pesan [pesan] dan tunggu |
| Gerak | gerak [n] langkah · putar ↻ [n]° · putar ↺ [n]° · ke x:[x] y:[y] · ubah x [n] · ubah y [n] · arah ke [d] · luncur [dtk] ke x:[x] y:[y] · jika di tepi, pantul |
| Tampilan | katakan [teks] · katakan [teks] selama [dtk] · sembunyikan gelembung · ganti kostum ke [kostum] · kostum berikutnya · ubah ukuran [n] · atur ukuran [n]% · tampil · sembunyi |
| Kontrol | tunggu [dtk] detik · ulangi [n] kali · ulangi terus · jika [b] maka · jika [b] maka … kalau tidak · tunggu sampai [b] · hentikan [semua / skrip ini / skrip lain sprite ini] |

Pelapor (reporter) / boolean:

| Kategori | Blok |
|---|---|
| Operator | [a] + [b] · − · × · ÷ · sisa bagi · [a] < [b] · [a] = [b] · [a] > [b] · [b1] dan [b2] · [b1] atau [b2] · tidak [b] · acak [a] sampai [b] · gabung [a] [b] · panjang [teks] |
| Sensor (MVP ringan) | menyentuh [tepi / sprite X]? · tombol [t] ditekan? · mouse ditekan? · pengatur waktu · reset pengatur waktu |
| Variabel | [nama] (nilai) · atur [nama] ke [v] · ubah [nama] sebanyak [v] · buat variabel |

> Kategori **Suara** penuh (mainkan suara, mainkan sampai selesai, hentikan
> semua suara, ubah volume) dan **Sensor** penuh (jarak ke, warna menyentuh
> warna, jawab/tanya) masuk Fase 3.

### 4.4 Daftar blok — Mode HTML

| Kelompok | Blok | Hasil |
|---|---|---|
| Struktur | halaman { … } | dokumen `<body>` berisi anak-anaknya |
| | bagian { … } | `<div>…</div>` |
| | judul besar [teks] (level 1–3) | `<h1>`/`<h2>`/`<h3>` |
| | paragraf [teks] | `<p>` |
| | daftar { item… } | `<ul>` |
| | item daftar [teks] | `<li>` |
| Konten | teks [isi] | text node (di-*escape*) |
| | gambar (aset [a] / URL [u]), teks alt [t] | `<img>` |
| | tautan ke [url] tulisan [teks] | `<a>` |
| | tombol [teks] | `<button>` (tanpa aksi) |
| | garis pemisah | `<hr>` |
| Gaya (pembungkus) | warna teks [warna] { … } | `style="color:…"` pada anak |
| | warna latar [warna] { … } | `style="background:…"` |
| | rata [kiri/tengah/kanan] { … } | `style="text-align:…"` |
| | ukuran [kecil/sedang/besar] { … } | `style="font-size:…"` |
| | tebal { … } · miring { … } | `style="font-weight:bold"` / `font-style:italic` |

Blok gaya menggabungkan `style` bila ditumpuk. Tidak ada blok "HTML mentah" dan
tidak ada blok skrip.

### 4.5 Toolbox

- `sprite/toolbox.ts` & `html/toolbox.ts` mendefinisikan kategori berwarna,
  urutan blok, dan blok default pada input (shadow blocks) agar anak jarang
  bertemu input kosong.

## 5. Generator

### 5.1 Sprite → JavaScript (`blocks/sprite/generator.ts`)

- Tiap topi menghasilkan satu fungsi bernama, mis.:

  ```js
  // "saat bendera hijau diklik"
  async function onGreenFlag_<spriteId>_<i>() {
    await api.move(10);
    for (let _i = 0; _i < 4; _i++) {
      await api.turn(90);
      await api.wait(0.5);
    }
  }
  ```

- Blok berdurasi (`wait`, `glide`, `say ... selama`, `move` dengan animasi)
  menghasilkan pemanggilan `await api.*`. Ini titik *yield* natural untuk
  scheduler.
- `ulangi terus` → `while (true) { … await api.frameYield(); }` — selalu ada
  `await` di badan loop.
- `hentikan [...]` → memanggil `api.stop(scope)`.
- Kode yang dihasilkan **tidak dieksekusi sebagai JS asli**; ia diberikan ke
  JS-Interpreter (lihat §6.1).

### 5.2 HTML → HTML (`blocks/html/generator.ts`)

- Menghasilkan string HTML ter-indent. Contoh:

  ```html
  <div>
    <h1 style="color:red">Judul Saya</h1>
    <p>Halo dunia</p>
    <img src="asset:kucing" alt="kucing">
  </div>
  ```

- `asset:<id>` di-*resolve* ke data URL / URL bawaan saat render preview & saat
  ekspor.
- Selalu memancarkan dokumen valid; teks anak selalu di-*escape*.

## 6. Runtime — Mode Sprite

### 6.1 Interpreter (`runtime/sprite/interpreter.ts`)

- Membungkus **JS-Interpreter** (parser Acorn, eksekusi langkah-demi-langkah).
- Untuk tiap topi: buat instance interpreter dengan kode fungsinya + *API
  bindings* (`api.move`, `api.turn`, …) yang diekspos sebagai fungsi native
  asinkron ke sandbox.
- Ekspos `step()`, `run(maxSteps)`, `stop()`. Menyimpan pemetaan
  *node AST → block id* untuk penyorotan.

### 6.2 Scheduler (`runtime/sprite/scheduler.ts`)

- Menyimpan daftar *thread* (satu per topi yang sedang aktif).
- Tiap frame (`requestAnimationFrame`):
  - untuk tiap thread: jalankan hingga `MAX_STEPS_PER_FRAME` langkah atau
    hingga thread *yield* (menunggu durasi) atau selesai;
  - jika sebuah thread melewati batas langkah tanpa yield (loop ketat) →
    paksa yield agar UI tak beku;
  - render panggung sekali di akhir frame.
- **Pengaman loop tak-hingga**: badan `ulangi terus` selalu memuat
  `await api.frameYield()`, jadi loop tak pernah menahan thread lebih dari satu
  frame. Loop `ulangi [n] kali` yang sangat besar tetap tunduk pada batas
  langkah/frame.
- `stop()` mengosongkan daftar thread & menghapus semua sorotan.

### 6.3 API (`runtime/sprite/api.ts`)

Fungsi yang mengubah **model** `Sprite` (data murni), lalu scheduler yang
me-render:

- Gerak: `move`, `turn`, `gotoXY`, `changeX/Y`, `pointInDirection`, `glide`
  (asinkron, mem-*yield* per frame), `ifOnEdgeBounce`.
- Tampilan: `say`, `sayForSecs`, `switchCostume`, `nextCostume`,
  `changeSize`, `setSize`, `show`, `hide`.
- Kontrol/kejadian: `wait`, `frameYield`, `broadcast`, `broadcastAndWait`,
  `stop(scope)`.
- Sensor: `isTouching(target)`, `isKeyPressed(key)`, `isMouseDown`, `timer`,
  `resetTimer`.
- Semua fungsi berdurasi mengembalikan Promise yang *resolve* pada frame
  berikutnya / setelah durasi.

### 6.4 Model Sprite (`runtime/sprite/sprite.ts`)

- Struktur data murni: `{ id, name, x, y, direction, size, visible, costumes,
  currentCostume, sounds, variables, bubble }`.
- Fungsi operasi murni (mudah diuji): `moved(sprite, steps) → sprite'` dst.
- Tidak menyentuh DOM/Canvas.

### 6.5 Renderer panggung (`runtime/sprite/stage.ts`)

- `<canvas>` 480×360 (di-*scale* ke ukuran tampilan, DPR-aware).
- Tiap frame: gambar backdrop → tiap sprite (kostum, posisi, rotasi, skala,
  visibilitas) → gelembung "katakan".
- Menangani hit-test klik sprite untuk kejadian `spriteClicked`.

### 6.6 Event bus (`runtime/sprite/event-bus.ts`)

- Kejadian bertipe: `greenFlag`, `spriteClicked(id)`, `keyPressed(key)`,
  `broadcast(msg)`.
- Bendera hijau: hentikan semua thread → mulai ulang semua topi `greenFlag`.
- `broadcastAndWait`: memulai thread terkait, menahan pemanggil sampai semua
  selesai.

### 6.7 Aset & audio

- `assets.ts`: modul yang meng-*import* berkas kostum/suara CC0 lewat Vite
  (`import url from './assets/kucing.svg'`), diekspos sebagai katalog
  `{ id, kind, name, url }`.
- Aset unggahan: dibaca sebagai data URL, dimasukkan ke `project.assets` dengan
  `source: "embedded"`, dibatasi ~2 MB.
- `audio.ts`: bungkus Web Audio (`decodeAudioData`, mainkan, hentikan semua).

## 7. Runtime — Mode HTML

### 7.1 Preview (`runtime/html/preview.ts`)

- `<iframe sandbox="allow-same-origin">` — **tanpa** `allow-scripts`.
- Pada perubahan workspace (debounce ~300 ms): generator → HTML → set
  `iframe.srcdoc` dengan dokumen lengkap (reset CSS minimal + isi `<body>`).
- `asset:<id>` di-*resolve* ke data URL sebelum di-*inject*.

### 7.2 Panel "Lihat Kode"

- Menampilkan HTML `<body>` yang rapi (bukan dokumen penuh) dengan sorot
  sintaks (highlight.js, dibundel). Read-only.

### 7.3 Ekspor (`runtime/html/export.ts`)

- Susun dokumen `.html` lengkap & mandiri: `<!doctype html>`, `<meta charset>`,
  `<title>` dari nama project, gaya reset minimal, `<body>` hasil generator,
  semua aset sebagai data URL.
- Picu unduhan (Web) atau dialog simpan (Tauri).

## 8. Shell & navigasi (`src/app`)

- **Router hash** (`router.ts`): `#/` → Home, `#/editor/:id` → Editor. Tanpa
  library.
- **Home** (`home/project-manager.ts`): daftar kartu project dari
  `ghtml:projects`; aksi Baru / Buka File / (per kartu) buka, ganti nama,
  duplikat, hapus, unduh.
- **Editor** (`editor/editor-view.ts`): header + area kerja. Header:
  nama project (edit inline), Simpan, Buka, Ekspor, kembali ke Home, dan
  pemilih **Mode Sprite / HTML**.
- Kedua Blockly workspace dibuat sekali dan disembunyikan/ditampilkan saat ganti
  mode; keduanya diserialisasi ke project.
- Autosave dipicu oleh listener perubahan workspace + perubahan state sprite.

## 9. Lapisan storage (`core/storage.ts`)

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

## 10. Landing page (`landing.html`)

- Statis, dibangun oleh Vite sebagai halaman kedua (`build.rollupOptions.input`).
- Bagian: Hero (nama, tagline, tombol "Mulai Buat" → `index.html`, "Unduh
  Aplikasi" → GitHub Releases) · "Apa ini?" · 3 langkah cara pakai · cuplikan
  mode Sprite & HTML (gambar statis) · bagian untuk guru (tautan unduh modul
  ajar — placeholder di rilis 1) · footer (lisensi kode, kredit aset CC0).
- Bahasa Indonesia. `<meta>` deskripsi + `og:image`. Tanpa skrip pihak ketiga.

## 11. i18n (`src/app/i18n`)

- `t(key, params?)` membaca `id.json` (satu berkas datar bertingkat).
- `formatDate(iso)` pakai `Intl.DateTimeFormat('id-ID', …)`.
- Blockly: `Blockly.setLocale(id)`; label blok kustom hard-coded Bahasa
  Indonesia.
- Struktur siap multi-bahasa (peta `locale → dict`) tetapi rilis 1 hanya `id`.

## 12. Penanganan error & keamanan

- **Kode terinterpretasi**: JS-Interpreter menangkap exception → hentikan thread
  itu, tampilkan toast ramah + sorot blok penyebab. App tidak crash.
- **Loop tak-hingga**: pengaman paksa-yield (§6.2); tombol Stop selalu bekerja.
- **Batas sumber daya**: maks ~30 sprite; aset unggahan ≤ 2 MB; tolak dengan
  pesan jelas.
- **Preview HTML**: `iframe` ber-*sandbox* tanpa skrip; teks anak di-*escape*;
  hanya struktur/atribut dari blok yang jadi markup; tidak ada blok HTML mentah.
- **File project**: `migrate` → `validate`; file rusak/asing → dialog jelas +
  opsi "coba muat sebisanya" vs batal; autosave tidak ditimpa sampai muat
  sukses.
- **Autosave defensif**: tulis `:tmp` → tukar.
- **Error boundary global**: layar "Maaf, ada yang salah" + Muat ulang + salin
  detail; autosave terakhir aman.
- **Privasi**: tidak ada permintaan jaringan pihak ketiga, tidak ada telemetry.

## 13. Testing

| Lapis | Alat | Contoh kasus |
|---|---|---|
| Unit | Vitest | `validate`/`migrate` project; round-trip serialisasi idempoten; generator sprite→JS (snapshot); generator html→HTML (snapshot); operasi model Sprite (`moved`, `turned`); pengaman loop menghentikan `ulangi terus` saat Stop |
| Integrasi | Vitest + jsdom | muat project fixture → generate → jalankan interpreter N frame → assert posisi/kostum/variabel sprite; `broadcastAndWait` menahan pemanggil hingga selesai |
| E2E | Playwright (headless) | project baru → seret 2 blok → bendera hijau → sprite berpindah; mode HTML → tambah judul → preview memuat teks; simpan → reload → project pulih; ekspor HTML → berkas ter-unduh |
| Manual | checklist | tema/warna blok; layout pada 1366×768; performa 10 sprite di perangkat kelas bawah |

CI (GitHub Actions): `lint` + `test:unit` + `test:integration` + `test:e2e`
pada tiap push/PR. Build desktop hanya pada tag `v*`.

## 14. Build & rilis

- **Web**: `vite build` → `dist/` berisi `index.html` (editor) + `landing.html`
  + aset. Deploy statis ke GitHub Pages / Netlify / Cloudflare Pages.
- **Desktop**: `tauri build` → installer Windows (`.msi` / `.exe`), di-*attach*
  ke GitHub Releases. Tombol "Unduh Aplikasi" di landing menunjuk ke rilis
  terbaru. macOS/Linux menyusul (Fase 3+).
- **Versi format**: `formatVersion` project dinaikkan hanya lewat `migrate`
  yang diuji; catat perubahan di `Design.md` §3.
- **Aset**: seluruh aset bawaan CC0/domain publik; sumber & kredit dicatat di
  `docs/` dan footer landing.

## 15. Keputusan yang sudah diambil

- Mesin blok: **Blockly** + blok & generator kustom + tema "rasa Scratch"
  (bukan scratch-blocks/scratch-gui, bukan mesin sendiri).
- UI: **TypeScript vanilla + store pub/sub kecil** (bukan React); Preact sebagai
  jalur ganti bila UI tumbuh.
- Desktop: **Tauri** (fallback Electron bila toolchain Rust menghambat).
- Bahasa antarmuka: **Bahasa Indonesia saja** untuk rilis 1.
- Tanpa backend, akun, cloud, komunitas, atau API pihak ketiga di rilis 1.
- Eksekusi kode anak: **JS-Interpreter** (bukan `eval`/`Function` asli, bukan
  Web Worker) demi langkah-per-langkah + sorot blok + penghentian aman.
