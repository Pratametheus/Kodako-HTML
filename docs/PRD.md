# PRD — Editor Blok "Game HTML" (nama sementara)

Status: Draft 1 · Tanggal: 2026-09-03 · Diperbarui: 2026-09-13 (Fase E — Mode
Sprite dihapus) · Pemilik: Pratametheus

---

## 1. Ringkasan & visi

Sebuah **editor pemrograman berbasis blok** (ala Scratch) yang berjalan di
browser dan sebagai aplikasi desktop offline, untuk menyusun **halaman web
(HTML)** dari blok visual. Anak menyusun blok yang mewakili elemen HTML
(judul, paragraf, gambar, tombol, gaya sederhana) dan langsung melihat
hasilnya sebagai halaman web, lengkap dengan panel "Lihat Kode". Fokus:
mengenal struktur HTML dan hubungan antara blok visual dan kode teks yang
dihasilkannya.

Visi: guru SD punya satu alat gratis, berbahasa Indonesia, yang bisa dipakai di
lab komputer tanpa internet, untuk mengenalkan dasar HTML lewat susun-blok.

> **Catatan (2026-09-13):** rilis awal proyek ini punya dua mode kerja — Mode
> Sprite (animasi ala Scratch) dan Mode HTML. Mode Sprite dihapus di Fase E
> atas keputusan pemilik proyek, karena di luar kebutuhan yang sebenarnya
> ingin dilayani. Dokumen ini sudah ditulis ulang untuk mencerminkan alat
> HTML-only; riwayat Mode Sprite tetap tercatat di `ROADMAP.md`.

## 2. Masalah & tujuan pembelajaran

**Masalah**

- Alat belajar HTML untuk anak umumnya berupa mengetik kode langsung —
  terlalu sulit dan rawan frustrasi untuk anak SD.
- Guru butuh bahan yang seragam, offline, dan berbahasa Indonesia.

**Tujuan pembelajaran (selaras kompetensi informatika SD)**

- Mengenal bahwa halaman web tersusun dari **elemen** yang berjenjang, dan
  bahwa **gaya** (warna, ukuran, perataan) mengubah tampilan tanpa mengubah isi.
- Menyusun **urutan blok** untuk mencapai tampilan halaman yang diinginkan.
- Membaca dan mengaitkan blok dengan **kode teks (HTML)** yang dihasilkannya.

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
- Blok struktur/konten/gaya (termasuk kerangka dokumen `<html>`/`<head>`/
  `<body>`/`<title>` opsional), live preview dibungkus tampilan "jendela
  browser", panel Lihat Kode, ekspor `.html` mandiri.
- Simpan/buka project sebagai satu file `.ghtml.json`; autosave `localStorage`.
- Pustaka gambar bawaan CC0; unggah gambar sendiri.
- Landing page statis Bahasa Indonesia.
- Versi web statis **dan** aplikasi desktop Tauri (Windows).
- Antarmuka Bahasa Indonesia sepenuhnya.

**Non-lingkup eksplisit (tidak dikerjakan)**

- Tidak ada akun/login.
- Tidak ada penyimpanan cloud atau sinkronisasi antar-perangkat.
- Tidak ada komunitas, galeri "featured", atau berbagi project antar pengguna.
- Tidak ada backend/API pihak ketiga.
- Tidak ada telemetry/analytics pengumpul data.
- Editor tidak mengajarkan JavaScript / tidak mengeksekusi skrip buatan anak.
- Tidak ada animasi atau permainan berbasis sprite/panggung — fitur ini ada di
  rilis-rilis awal (Mode Sprite) tapi **dihapus di Fase E**; lihat
  `ROADMAP.md`.
- Tidak ada konten pengajaran (modul ajar/RPP, lembar kerja, contoh project
  berkurikulum) — proyek ini fokus pada alatnya saja; konten dikelola
  terpisah di [Jurnal Mengajar](https://jurnal-mengajar-blond.vercel.app/).
- Build desktop macOS/Linux (Windows saja untuk saat ini).

## 6. Fitur editor (ringkas)

- Blok **Struktur** (kerangka dokumen `<html>`/`<head>`/`<body>`/`<title>`
  opsional, bagian, judul, paragraf, daftar), **Konten** (teks, gambar,
  tautan, tombol, garis), **Gaya** (warna teks/latar, perataan, ukuran, tebal,
  miring) yang membungkus konten.
- Live preview di `iframe` ber-*sandbox*, dibungkus tampilan "jendela browser"
  dengan tab yang menunjukkan judul halaman; panel **Lihat Kode** menampilkan
  dokumen HTML ter-generate yang rapi.
- Strip "Info blok" menjelaskan setiap blok yang diklik.
- Ekspor satu file `.html` mandiri.

## 7. Persyaratan non-fungsional

- **Offline**: setelah aset dimuat/aplikasi terpasang, tidak butuh internet.
  Tidak ada permintaan jaringan ke pihak ketiga.
- **Performa**: lancar di laptop sekolah kelas bawah (CPU lemah, layar
  1366×768, RAM 4 GB); interaksi editor terasa responsif (<100 ms).
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

- Seorang murid dapat membuat halaman berisi judul + paragraf + gambar
  berwarna dan mengekspornya dalam **< 10 menit, tanpa bantuan**.
- Guru dapat memasang aplikasi desktop dan menyiapkan kelas **tanpa
  dokumentasi teknis** di luar panduan singkat.
- Tidak ada kehilangan project dalam sesi uji satu kelas penuh.

## 9. Risiko & asumsi

| Risiko / asumsi | Dampak | Mitigasi |
|---|---|---|
| Blockly terasa "kaku" dibanding alat semacam Scratch | Anak kurang tertarik | Tema warna/bentuk kustom yang ramah anak; uji pakai dini |
| Laptop sekolah sangat lemah | Editor terasa lambat | `iframe` pratinjau + Blockly ringan; profil performa di perangkat target |
| Pustaka gambar bawaan kurang menarik | Pengalaman hambar | Kurasi aset; izinkan unggah sendiri |
| Toolchain Tauri (Rust) menyulitkan rilis | Versi desktop tertunda | Versi web tetap jalan mandiri; desktop bisa menyusul; fallback Electron bila perlu |

## 10. Rencana rilis bertahap

Lihat `ROADMAP.md` untuk rincian tiap fase (termasuk riwayat Mode Sprite, yang
dibangun di Fase 1 & 3a lalu dihapus di Fase E). Ringkas:

- **Fase 0 — Fondasi**: scaffold, shell editor kosong, format & storage
  project, landing skeleton, bukti-konsep Tauri.
- **Fase 1 — Mode Sprite MVP** _(dihapus di Fase E)_.
- **Fase 2 — Mode HTML**: blok HTML + preview + Lihat Kode + ekspor.
- **Fase 3 — Poles & paket desktop**: pustaka aset, installer Windows, CI
  rilis. **Rilis 1 selesai di sini.**
- **Fase A–D — Poles UI/UX**: landing page, chrome editor, panel yang bisa
  di-*drag*, blok kerangka dokumen HTML, poles Home & panel editor.
- **Fase E — Mode Sprite dihapus**: editor jadi HTML-only.
- Konten pengajaran (contoh project, modul ajar, lembar kerja) di luar
  lingkup proyek ini — lihat `ROADMAP.md` §"Fase 4".
