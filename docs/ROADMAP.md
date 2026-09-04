# Roadmap — Editor Blok "Game HTML"

Status: Draft 1 · Tanggal: 2026-09-03 · Menyertai: `PRD.md`, `Design.md`

Rilis 1 = Fase 0 + 1 + 2 + 3. Fase 4 dikerjakan setelah rilis 1.

---

## Fase 0 — Fondasi

**Tujuan:** kerangka aplikasi berjalan, project bisa dibuat/disimpan/dibuka,
landing page tampil, bukti-konsep desktop.

**Deliverable**

- [ ] Scaffold repo: Vite + TypeScript, multi-page (`index.html` editor +
      `landing.html`), ESLint + Prettier, konfigurasi test.
- [ ] `core/project.ts`: tipe `Project`, `createEmptyProject`, `validate`,
      `migrate` (kerangka), serialisasi round-trip.
- [ ] `core/storage.ts`: antarmuka `Storage` + `WebStorage` (localStorage +
      slot `:tmp` + import/export berkas).
- [ ] `core/events.ts`: event bus bertipe.
- [ ] Shell SPA: router hash, Home (manajer project: daftar, baru, buka file,
      ganti nama, duplikat, hapus, unduh), kerangka Editor kosong dengan header.
- [ ] i18n: `t()` + `id.json` awal + `formatDate` `id-ID`.
- [ ] Landing page statis (Hero + bagian dasar), Bahasa Indonesia.
- [ ] Bukti-konsep Tauri: `src-tauri/` membungkus build web, `TauriStorage`
      untuk import/export berkas asli, deteksi runtime.
- [ ] CI: lint + unit test pada push.

**Definisi "selesai"**

- Bisa membuat project baru, mengganti namanya, menutup & membukanya kembali
  dari Home; data bertahan setelah reload.
- Import/export berkas `.ghtml.json` berfungsi di web dan di Tauri.
- Landing page ter-*deploy* sebagai situs statis.

---

## Fase 1 — Mode Sprite MVP

**Tujuan:** anak bisa menyusun blok, menekan bendera hijau, dan melihat sprite
bergerak/berperilaku di panggung.

**Deliverable**

- [x] Integrasi Blockly + locale `id` + tema "rasa Scratch" (`blocks/theme.ts`).
- [x] `blocks/sprite/blocks.ts` + `toolbox.ts`: kategori Kejadian, Gerak,
      Tampilan, Kontrol, Operator, Variabel (set MVP di `Design.md` §4.3).
- [x] `blocks/sprite/generator.ts`: workspace → JS ES5 sinkron
      (`ulangi terus` dengan `__yield__`).
- [x] `runtime/sprite/sprite.ts`: model + operasi murni.
- [x] `runtime/sprite/stage.ts`: renderer Canvas (backdrop, sprite, rotasi,
      skala, gelembung "katakan"), hit-test klik.
- [x] `runtime/sprite/interpreter.ts`: bungkus JS-Interpreter + API bindings +
      pemetaan node→blok.
- [x] `runtime/sprite/scheduler.ts`: loop thread per frame + pengaman
      loop tak-hingga + sorot blok aktif.
- [x] `runtime/sprite/api.ts`: gerak, tampilan, kontrol/kejadian, sensor ringan.
- [x] `runtime/sprite/event-bus.ts`: greenFlag, spriteClicked, keyPressed,
      broadcast + broadcastAndWait.
- [x] Editor mode Sprite: panel sprite (tambah/hapus/pilih, atur nama/posisi),
      panel kostum (pilih dari pustaka + unggah), tombol Bendera Hijau & Stop.
- [ ] `runtime/sprite/assets.ts` + `audio.ts`: ~10–15 kostum + beberapa
      backdrop CC0; unggah gambar (≤ 2 MB).
- [x] Autosave menyimpan skrip semua sprite + state; thumbnail panggung.
- [x] Test: unit generator (snapshot) + model; integrasi "fixture → jalankan N
      frame → assert state"; E2E alur bendera hijau.

Ditunda ke Fase 3: `audio.ts` + kategori Suara, Sensor tabrakan/mouse, tema Scratch penuh, aset CC0 asli.

**Definisi "selesai"**

- Skrip contoh (gerak dalam loop 4×, belok, katakan) berjalan mulus, blok aktif
  tersorot, Stop responsif.
- `ulangi terus` tidak membekukan UI.
- Klik sprite memicu topi "saat sprite ini diklik".
- Project dengan beberapa sprite tersimpan & pulih setelah reload.

---

## Fase 2 — Mode HTML

**Tujuan:** anak menyusun blok elemen HTML, melihat live preview, membaca kode,
dan mengekspor halaman.

**Deliverable**

- [x] `blocks/html/blocks.ts` + `toolbox.ts`: Struktur, Konten, Gaya
      (`Design.md` §4.4).
- [x] `blocks/html/generator.ts`: workspace → HTML rapi, `asset:<id>`,
      *escape* teks, penggabungan `style` dari blok gaya bertumpuk.
- [x] `runtime/html/preview.ts`: `iframe` ber-*sandbox* (tanpa skrip), update
      ter-*debounce*, resolusi `asset:<id>` → data URL.
- [x] Panel "Lihat Kode": HTML `<body>` rapi + sorot sintaks (highlight.js
      dibundel), read-only.
- [x] `runtime/html/export.ts`: dokumen `.html` mandiri (aset sebagai data
      URL) + unduh/dialog simpan.
- [x] Pemilih mode di header menukar workspace; kedua workspace ikut
      diserialisasi.
- [x] Test: unit generator (snapshot HTML) + *escape*; E2E "tambah judul +
      paragraf + gambar → preview memuat → ekspor berkas".

**Definisi "selesai"**

- Menambah judul/paragraf/gambar/daftar memperbarui preview < 500 ms.
- Blok gaya (warna, rata, ukuran, tebal) tercermin di preview & di panel kode.
- Berkas HTML hasil ekspor terbuka mandiri di browser lain, gambar tampil.
- Ganti mode Sprite↔HTML tidak menghilangkan pekerjaan di mode lain.

Ditunda ke Fase 3: CSS lanjutan, atribut class/id, tabel, form; alur 'kirim ke guru'.

---

## Fase 3 — Poles & paket desktop

**Tujuan:** siap dipakai satu kelas; installer desktop resmi.

**Deliverable**

- [x] Kategori **Suara** penuh (mainkan suara, mainkan sampai selesai,
      hentikan semua, volume) + ~8 efek suara CC0.
- [x] Kategori **Sensor** penuh (jarak ke, warna menyentuh warna, tanya/jawab).
- [x] Tema "rasa Scratch" penuh (blok bulat, chrome kategori, hat block,
      renderer Zelos) + kostum/latar bawaan dipoles (15 kostum, 6 latar).
- [ ] Pustaka aset diperluas + layar pilih aset yang rapi.
- [ ] Ekspor project Sprite sebagai halaman "pemutar" HTML mandiri (opsional
      bila memungkinkan tanpa lingkup besar; kalau tidak, tunda).
- [x] Error boundary global + semua pesan error ramah anak berbahasa Indonesia.
- [x] Pemeriksaan performa di perangkat kelas bawah; optimasi renderer bila
      perlu.
- [x] Pass aksesibilitas dasar (ukuran target, kontras, fokus keyboard).
- [ ] `tauri build` installer Windows `.msi`/`.exe`; ikon & menu Berkas/Bantuan.
- [ ] CI rilis: build desktop pada tag `v*`, unggah ke GitHub Releases; landing
      "Unduh Aplikasi" menunjuk rilis terbaru.
- [ ] Panduan singkat pemakaian (README + halaman Bantuan dalam app).

**Definisi "selesai"**

- Guru dapat memasang `.msi` di komputer lab tanpa internet dan langsung
  memakai semua fitur.
- Semua jalur error menampilkan pesan Bahasa Indonesia, bukan stack trace.
- Suite test (unit + integrasi + E2E) hijau di CI.

Fase 3b (poles) selesai: tema Scratch, error boundary + toast error, a11y
dasar, performa (cache sensor warna, vendor chunk Blockly, alokasi
per-frame). Ditunda ke Fase 3c: `tauri build` installer, CI rilis, halaman
Bantuan dalam app, README quickstart, aset CC0 asli.

---

## Fase 4 — Konten guru (setelah rilis 1)

**Tujuan:** bahan ajar siap pakai.

**Deliverable**

- [ ] 6–10 contoh project (Sprite & HTML) dengan tingkat kesulitan bertahap,
      dapat dibuka dari Home ("Contoh").
- [ ] Modul ajar / RPP singkat per pertemuan (PDF) untuk beberapa pertemuan.
- [ ] Lembar kerja murid (PDF) selaras contoh project.
- [ ] Bagian "Untuk Guru" di landing terisi (unduh modul & lembar kerja).
- [ ] Panduan "mengumpulkan hasil murid" (konvensi penamaan berkas
      `.ghtml.json` / `.html`).

**Definisi "selesai"**

- Seorang guru dapat menjalankan minimal 4 pertemuan hanya dengan bahan yang
  tersedia, tanpa menyiapkan materi sendiri.

---

## Di luar roadmap ini (mungkin dipertimbangkan jauh ke depan)

Hanya dicatat agar tidak menyelinap masuk lingkup rilis 1:

- Akun & penyimpanan cloud, dasbor progres murid.
- Galeri / berbagi project antar pengguna, "featured".
- Integrasi scratch.mit.edu.
- Blok JavaScript / eksekusi skrip buatan anak di mode HTML.
- Multi-bahasa antarmuka (EN dll.).
- Analytics / telemetry.
