# PRD — Editor Blok "Game HTML" (nama sementara)

Status: Draft 1 · Tanggal: 2026-09-03 · Pemilik: Pratametheus

---

## 1. Ringkasan & visi

Sebuah **editor pemrograman berbasis blok** (ala Scratch) yang berjalan di
browser dan sebagai aplikasi desktop offline. Ditujukan sebagai bahan **modul
ajar informatika tingkat SD**, dengan dua mode kerja:

1. **Mode Sprite/Animasi** — anak menyusun blok untuk menggerakkan sprite di
   panggung, membuat animasi dan permainan sederhana. Fokus: logika
   pemrograman (urutan, perulangan, kondisi, kejadian).
2. **Mode Halaman Web (HTML)** — anak menyusun blok yang mewakili elemen HTML
   (judul, paragraf, gambar, tombol, gaya sederhana) dan langsung melihat
   hasilnya sebagai halaman web, lengkap dengan panel "Lihat Kode". Fokus:
   mengenal struktur HTML.

Visi: guru SD punya satu alat gratis, berbahasa Indonesia, yang bisa dipakai di
lab komputer tanpa internet, untuk mengajar dasar berpikir komputasional
sekaligus mengenalkan HTML.

## 2. Masalah & tujuan pembelajaran

**Masalah**

- Scratch asli tidak mengajarkan HTML dan butuh unduhan/akun untuk penggunaan
  penuh offline; antarmukanya campuran bahasa untuk sebagian konten.
- Alat belajar HTML umumnya berupa mengetik kode — terlalu sulit dan rawan
  frustrasi untuk anak SD.
- Guru butuh bahan yang seragam, offline, dan berbahasa Indonesia.

**Tujuan pembelajaran (selaras kompetensi informatika SD)**

- Menyusun **urutan langkah** untuk mencapai tujuan (algoritma sederhana).
- Menggunakan **perulangan** dan **kondisi** untuk menyelesaikan masalah.
- Memahami **kejadian** (event) sebagai pemicu aksi.
- Mengenal bahwa halaman web tersusun dari **elemen** yang berjenjang, dan
  bahwa **gaya** (warna, ukuran, perataan) mengubah tampilan tanpa mengubah isi.
- Membaca dan mengaitkan blok dengan **kode teks** yang dihasilkannya.

## 3. Pengguna

| Peran | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Murid SD** (kelas 3–6) | Pengguna utama editor. Kemampuan membaca dasar, motorik mouse cukup. | Antarmuka sederhana, Bahasa Indonesia, umpan balik cepat & ramah, sulit "merusak", project mudah disimpan/dibuka. |
| **Guru** | Mendemokan, membimbing murid pakai editor, memeriksa hasil. | Aplikasi offline yang mudah dipasang, panduan singkat dalam-aplikasi, cara mengumpulkan hasil (file). Modul ajar/RPP/lembar kerja dikelola terpisah di [Jurnal Mengajar](https://jurnal-mengajar-blond.vercel.app/), bukan bagian proyek ini. |
| **Pengembang / kontributor** (Claude + pemilik) | Membangun & memelihara. | Struktur modul jelas, dokumentasi, test otomatis. |

## 4. Skenario pemakaian

1. **Di kelas (demo guru)** — guru membuka aplikasi desktop di komputer yang
   tersambung proyektor, membangun contoh bersama murid, menyimpan sebagai
   contoh.
2. **Lab komputer offline** — tiap murid membuka aplikasi desktop / halaman
   yang sudah tersimpan lokal, mengerjakan lembar kerja, menyimpan project ke
   file untuk dikumpulkan.
3. **Di rumah** — murid membuka versi web statis, autosave menjaga pekerjaan di
   browser, hasil akhir diekspor/diunduh.

## 5. Lingkup rilis 1 (MVP) & non-lingkup

**Termasuk (rilis 1)**

- Shell editor: Home/Manajer Project + Editor, navigasi hash.
- Mode Sprite: panggung, banyak sprite, kategori blok Kejadian / Gerak /
  Tampilan / Kontrol / Operator / Variabel, runner dengan sorot blok, bendera
  hijau & stop.
- Mode HTML: blok struktur/konten/gaya, live preview, panel Lihat Kode, ekspor
  `.html`.
- Simpan/buka project sebagai satu file `.ghtml.json`; autosave `localStorage`.
- Pustaka aset CC0 bawaan; unggah gambar/suara sendiri.
- Landing page statis Bahasa Indonesia.
- Versi web statis **dan** aplikasi desktop Tauri (Windows).
- Antarmuka Bahasa Indonesia sepenuhnya.

**Menyusul setelah MVP**

- Kategori blok Suara & Sensor lengkap.
- Build desktop macOS/Linux.

**Non-lingkup eksplisit (tidak dikerjakan sekarang)**

- Tidak ada akun/login.
- Tidak ada penyimpanan cloud atau sinkronisasi antar-perangkat.
- Tidak ada komunitas, galeri "featured", atau berbagi project antar pengguna.
- Tidak ada integrasi ke scratch.mit.edu.
- Tidak ada backend/API pihak ketiga.
- Tidak ada telemetry/analytics pengumpul data.
- Mode HTML tidak mengajarkan JavaScript / tidak mengeksekusi skrip buatan anak.
- Tidak ada konten pengajaran (modul ajar/RPP, lembar kerja, contoh project
  berkurikulum) — proyek ini fokus pada alatnya saja; konten dikelola
  terpisah di [Jurnal Mengajar](https://jurnal-mengajar-blond.vercel.app/).

## 6. Fitur per mode (ringkas)

### Mode Sprite

- Panggung 480×360 unit, banyak sprite, tiap sprite punya kostum, suara, dan
  skrip sendiri.
- Blok MVP: Kejadian (bendera hijau, sprite diklik, tombol ditekan, terima/kirim
  pesan), Gerak, Tampilan, Kontrol (tunggu, ulangi N, ulangi terus, jika/kalau
  tidak, tunggu sampai, hentikan), Operator (aritmetika, perbandingan, logika,
  acak, gabung), Variabel.
- Runner menjalankan skrip secara kooperatif per frame, menyorot blok aktif,
  aman terhadap loop tak-hingga; tombol Stop selalu responsif.

### Mode HTML

- Blok Struktur (halaman, bagian, judul, paragraf, daftar), Konten (teks,
  gambar, tautan, tombol, garis), Gaya (warna teks/latar, perataan, ukuran,
  tebal, miring) yang membungkus konten.
- Live preview di `iframe` ber-*sandbox*; panel Lihat Kode menampilkan HTML
  ter-generate yang rapi.
- Ekspor satu file `.html` mandiri.

## 7. Persyaratan non-fungsional

- **Offline**: setelah aset dimuat/aplikasi terpasang, tidak butuh internet.
  Tidak ada permintaan jaringan ke pihak ketiga.
- **Performa**: lancar di laptop sekolah kelas bawah (CPU lemah, layar
  1366×768, RAM 4 GB). Target 60 fps panggung untuk ≤10 sprite sederhana;
  interaksi editor terasa responsif (<100 ms).
- **Bahasa**: seluruh antarmuka, label blok, pesan error, dan landing page
  dalam Bahasa Indonesia.
- **Aksesibilitas dasar**: target klik cukup besar, kontras warna memadai,
  dapat dioperasikan dengan mouse sepenuhnya; keyboard sebagai pelengkap.
- **Ketahanan data**: pekerjaan anak tidak hilang karena tab tertutup atau
  file project versi lama (autosave defensif + migrasi format).
- **Privasi**: tidak mengumpulkan atau mengirim data apa pun.
- **Lisensi**: kode open source; seluruh aset bawaan berlisensi CC0 / domain
  publik, dikreditkan di footer & dokumen.

## 8. Metrik sukses

Karena tanpa telemetry, metrik dinilai lewat uji pakai & umpan balik guru:

- Seorang murid kelas 4 dapat membuat sprite bergerak dalam sebuah loop
  **tanpa bantuan** dalam < 5 menit sejak halaman terbuka.
- Seorang murid dapat membuat halaman berisi judul + paragraf + gambar
  berwarna dan mengekspornya dalam < 10 menit.
- Guru dapat memasang aplikasi desktop dan menyiapkan kelas **tanpa
  dokumentasi teknis** di luar panduan singkat.
- Tidak ada kehilangan project dalam sesi uji satu kelas penuh.

## 9. Risiko & asumsi

| Risiko / asumsi | Dampak | Mitigasi |
|---|---|---|
| Blockly terasa "kaku" dibanding Scratch | Anak kurang tertarik | Tema warna/bentuk kustom "rasa Scratch"; uji pakai dini |
| Dua mode menggandakan lingkup | Rilis molor | Roadmap bertahap: Sprite MVP dulu, HTML fase berikutnya |
| Interpreter langkah-per-langkah rumit (loop, tunggu, broadcast-dan-tunggu) | Bug perilaku | Pakai JS-Interpreter yang teruji + test integrasi perilaku |
| Laptop sekolah sangat lemah | Panggung lag | Batas sprite, render Canvas sederhana, profil performa di perangkat target |
| Aset CC0 kurang menarik | Pengalaman hambar | Kurasi aset; izinkan unggah sendiri |
| Toolchain Tauri (Rust) menyulitkan rilis | Versi desktop tertunda | Versi web tetap jalan mandiri; desktop bisa menyusul; fallback Electron bila perlu |

## 10. Rencana rilis bertahap

Lihat `ROADMAP.md` untuk rincian fase. Ringkas:

- **Fase 0 — Fondasi**: scaffold, shell editor kosong, format & storage
  project, landing skeleton, bukti-konsep Tauri.
- **Fase 1 — Mode Sprite MVP**: panggung + sprite + blok inti + runner.
- **Fase 2 — Mode HTML**: blok HTML + preview + Lihat Kode + ekspor.
- **Fase 3 — Poles & paket desktop**: pustaka aset, Suara/Sensor, installer
  Windows, CI rilis. **Rilis 1 selesai di sini.**
- Konten pengajaran (contoh project, modul ajar, lembar kerja) di luar
  lingkup proyek ini — lihat `ROADMAP.md` §"Fase 4".
