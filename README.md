# Game HTML

Editor blok untuk belajar membuat animasi/permainan sederhana dan halaman web,
berbahasa Indonesia, mirip Scratch. Dibuat untuk modul ajar informatika
tingkat SD dan bisa dipakai **tanpa internet**.

## Untuk guru — mulai cepat

1. **Buka aplikasinya** — pakai versi web (buka `index.html` / tautan yang
   dibagikan) atau pasang aplikasi desktop dari halaman
   [Releases](../../releases) (installer Windows `.msi`).
2. Klik **Project Baru**, lalu pilih **Mode Sprite** (animasi/permainan) atau
   **Mode HTML** (halaman web).
3. Susun blok di area kerja. Klik tombol **Bantuan** di pojok kanan atas
   editor untuk panduan singkat di dalam aplikasi.
4. Pekerjaan murid tersimpan otomatis di peramban. Untuk mengumpulkan hasil,
   minta murid klik **Ekspor** untuk mengunduh file project (`.ghtml.json`)
   atau halaman HTML mandiri (`.html`), lalu kumpulkan filenya (mis. lewat
   folder bersama atau email).

## Untuk pengembang

- `npm install` lalu `npm run dev` untuk menjalankan versi web secara lokal.
- `npm test` untuk unit test, `npm run test:e2e` untuk uji end-to-end.
- `npm run build` menghasilkan versi statis di `dist/`.
- Versi desktop dibangun dengan [Tauri](https://tauri.app) — lihat
  `src-tauri/`. Build installer Windows dilakukan otomatis oleh GitHub
  Actions saat tag `v*` di-push (lihat `.github/workflows/release.yml`);
  membangunnya secara lokal butuh Rust + Visual Studio Build Tools.
- Dokumen desain & rencana ada di `docs/` (`PRD.md`, `Design.md`,
  `ROADMAP.md`, `docs/superpowers/plans/`).

## Lisensi

Lihat `LICENSE.md`. Aset gambar/suara bawaan buatan sendiri atau CC0.
