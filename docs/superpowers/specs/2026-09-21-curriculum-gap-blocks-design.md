# Fase F — Blok kurikulum kelas 6 (Tabel, Tata Letak, tambahan cepat) — Design

Status: Disetujui (user: "langsung lanjutkan aja") · Tanggal: 2026-09-21 ·
Menyertai: `PRD.md`, `Design.md`, `ROADMAP.md`

## Ringkasan

Perbandingan kurikulum "Kelas 6 — Pemrograman Web Statis (HTML & CSS)" (22
pertemuan, dari project terpisah **Jurnal Mengajar**,
`src/lib/data.ts`) dengan blok yang benar-benar ada di Game HTML sekarang
menemukan gap nyata: **Tabel** (Pertemuan 8) dan **tata letak sejajar/Flexbox**
(Pertemuan 15–16, 19–20) — dasar seluruh Semester Genap kurikulum — sama
sekali tidak bisa dikerjakan murid di editor saat ini. Plus beberapa gap
kecil: daftar bernomor, `<header>/<main>/<footer>`, ukuran gambar,
padding/margin/border-radius/box-shadow, font-family.

User memutuskan: kerjakan semuanya, dipecah **tiga PR**:

- **PR-F1** — tambahan cepat (blok baru berpola sama dengan yang sudah ada).
- **PR-F2** — blok Tabel.
- **PR-F3** — blok Wadah Sejajar (Flexbox dasar).

Cakupan pasca-Fase F vs. 22 pertemuan kurikulum: semua pertemuan **tertutup**
kecuali yang memang di luar jangkauan alat blok — M1 (konsep internet), M2
(Notepad & file — Game HTML justru menggantikan ini), M9 (menulis syntax
`<style>`/selector CSS mentah — lihat "Non-tujuan" di bawah), M17
(wireframing di kertas), M22 (showcase — sudah didukung tidak langsung lewat
pratinjau "jendela browser" & ekspor).

## Konteks kode saat ini

- **`src/blocks/html/blocks.ts`** — `HTML_BLOCK_TYPES` (array datar, dipakai
  test untuk loop-cek tooltip/instansiasi tiap blok), lalu
  `registerHtmlBlocks()` mendaftarkan semua definisi lewat
  `Blockly.defineBlocksWithJsonArray([...])`. Blok kontainer pakai
  `input_statement` (mis. `html_section` `BODY`, `html_list` `ITEMS`) — anak
  di dalamnya sebuah *chain* blok yang disambung `next`, bukan satu nilai.
  Blok Gaya (`html_style_*`) juga `input_statement BODY` dengan bentuk yang
  sama persis. `cssconfig`/ikon kategori ada di level **kategori toolbox**
  saja (`src/blocks/html/toolbox.ts`), bukan per-blok — jadi blok baru tidak
  butuh kerja tema/ikon apa pun, cukup ditambahkan ke `contents` kategori
  yang sudah ada (Struktur/Konten/Gaya).
- **`src/blocks/html/generator.ts`** — tree-walker manual (bukan
  `javascriptGenerator`). Fungsi kunci:
  - `emitContainer(block, inputName, tag, depth, assetIds, styleFragments)` —
    generic: render `<tag>\n{anak}\n</tag>` + `withStyles(...)`. Saat ini
    `tag: 'section' | 'ul'`. **Tinggal diperluas union-nya** — pola ini pas
    dipakai ulang untuk `ol`, `header`, `main`, `footer`, `tr`, dan `div`
    (wadah sejajar).
  - `styleFragment(block)` — `switch` per tipe blok Gaya, mengembalikan satu
    fragmen CSS (`"color:#fff"` dst). **Tinggal ditambah `case` baru** untuk
    padding/margin/border-radius/box-shadow/font-family.
  - `withStyle`/`withStyles` — regex yang menyisipkan/menggabung atribut
    `style="…"` ke **tag pembuka pertama** dari HTML yang dihasilkan. Ini
    kenapa blok Gaya saat ini menempelkan gaya ke **setiap anak satu per
    satu** (tiap anak dalam `BODY` di-*render* ulang lewat `emitChain` dengan
    fragmen yang sama) — bukan membungkusnya jadi satu elemen pembungkus baru.
    **Konsekuensi desain**: Flexbox butuh benar-benar SATU elemen pembungkus
    (`display:flex` harus ada di parent, bukan di tiap anak) → tidak bisa
    jadi blok Gaya biasa, harus blok **Struktur** baru yang emisinya sendiri
    memanggil `emitContainer(..., 'div', ...)` dengan fragmen gaya dari field
    field-nya sendiri (persis seperti `html_heading` baca field `LEVEL`
    sendiri).
  - `emitBlock(block, ...)` — `switch` per tipe blok yang memanggil
    `emitContainer`/menyusun tag langsung. **Tinggal ditambah `case` baru**.
- **`src/blocks/html/toolbox.ts`** — kategori `Struktur`/`Konten`/`Gaya`,
  tiap kategori array `contents` blok. `textShadow(value?)` helper
  menyematkan blok bayangan `html_text` ke input **value** (`TEXT`) supaya
  anak tidak melihat slot kosong — dipakai untuk `html_title`/`html_heading`/
  `html_paragraph`/`html_list_item`/`html_button`. Input **statement**
  (`BODY`/`ITEMS`/dst.) TIDAK pernah diberi bayangan (Blockly tak mendukung
  shadow untuk statement input) — `html_section`/`html_list` di toolbox
  sekarang memang kosong begitu saja; blok baru mengikuti pola yang sama.
- **`src/blocks/theme.ts`/`category-icons.ts`/`theme.css`** — **tidak perlu
  disentuh sama sekali**. Tiga kategori (Struktur/Konten/Gaya) sudah cukup;
  semua blok baru masuk ke salah satu dari tiga ini.
- **`src/app/i18n/id.json`** — **tidak perlu disentuh**. Label & tooltip blok
  kustom ditulis langsung dalam Bahasa Indonesia di `blocks.ts` (bukan lewat
  `t()`), sesuai `Design.md` §4.1.
- Test: `tests/unit/blocks-html-defs.test.ts` (loop generik atas
  `HTML_BLOCK_TYPES` untuk tooltip/instansiasi — blok baru otomatis tercakup
  begitu ditambahkan ke array; lalu test spesifik per-label yang perlu
  ditambah manual), `tests/unit/blocks-html-generator.test.ts` (helper
  `statement()`/`connectStatement()`/`connectText()`/`append()` untuk
  menyusun workspace fixture lalu assert `generateHtml(workspace).bodyHtml`).

## Keputusan desain

### PR-F1 — Tambahan cepat

| Blok/field baru | Kategori | Tipe | Detail |
|---|---|---|---|
| `html_list_ordered` "daftar bernomor" | Struktur | blok baru | `<ol> %1 </ol>`, `input_statement ITEMS` — pakai ulang `html_list_item` sepenuhnya (`emitContainer(block, 'ITEMS', 'ol', ...)`). **Keputusan berubah dari draf chat**: awalnya dibahas "tambah dropdown ke `html_list`", tapi blok terpisah lebih konsisten dengan pola yang sudah ada (`html_style_bold`/`html_style_italic` juga blok terpisah, bukan satu blok dengan dropdown mode) dan nol risiko ke blok `html_list` yang sudah ada. |
| `html_header`/`html_main`/`html_footer` | Struktur | 3 blok baru | Identik `html_section` (`input_statement BODY`), cuma tag beda: `<header>`/`<main>`/`<footer>`. |
| Field `WIDTH` pada `html_image_asset` & `html_image_url` | Konten | field baru | Dropdown: `ukuran asli` (`''`, **default** — tidak mengubah tampilan project lama), `kecil` (`120px`), `sedang` (`240px`), `besar` (`480px`). Kalau bukan kosong, emit fragmen `width:<value>` digabung ke style gambar. |
| `html_style_padding` "padding:" | Gaya | blok baru | Dropdown `kecil`(8px)/`sedang`(16px)/`besar`(32px), `input_statement BODY` — pola persis `html_style_size`. |
| `html_style_margin` "margin:" | Gaya | blok baru | Sama persis, properti `margin`. |
| `html_style_radius` "border-radius:" | Gaya | blok baru | Dropdown `kecil`(8px)/`sedang`(16px)/`bulat`(9999px). |
| `html_style_shadow` "box-shadow: lembut" | Gaya | blok baru | **Tanpa dropdown** (pola `html_style_bold`/`html_style_italic`) — selalu emit `box-shadow:0 4px 10px rgba(30,41,80,.15)` (nuansa `--ed-shadow` yang sudah dipakai chrome editor, biar konsisten). |
| `html_style_font` "font-family:" | Gaya | blok baru | Dropdown `standar`(`inherit`)/`rapi`(`Georgia, serif`)/`mesin ketik`(`"Courier New", monospace`). |

### PR-F2 — Tabel

Tiga blok baru, Struktur, mekanisme dua tingkat pakai `input_statement` yang
sudah ada:

- **`html_table`** — `<table> %1 </table>`, `input_statement ROWS`. Emisi
  **tidak** lewat `emitContainer` biasa (butuh atribut `border`, bukan style)
  — fungsi baru `emitTable()` yang menulis `<table border="1">` selalu (border
  **selalu nyala**, sesuai tiap contoh di kurikulum — tidak ada saklar on/off,
  biar sederhana untuk anak kelas 6).
- **`html_table_row`** — `<tr> %1 </tr>`, `input_statement CELLS`. Emisi
  lewat `emitContainer(block, 'CELLS', 'tr', ...)` — pola biasa, cukup.
- **`html_table_cell`** — `<td> %1 </td>`, `input_value TEXT` (persis
  `html_paragraph`) — sel cuma teks polos, sesuai kebutuhan kurikulum
  ("Jadwal Pelajaran" 3×3). Toolbox menyematkan `textShadow()` di TEXT
  seperti blok teks lain.

Tidak ada validasi "row hanya boleh berisi cell" — konsisten dengan
`html_list`/`html_list_item` yang juga tidak divalidasi ketat sekarang
(kalau anak salah taruh blok, hasilnya cuma HTML yang agak aneh, bukan galat
yang menakutkan).

### PR-F3 — Wadah Sejajar (Flexbox dasar)

Satu blok baru, **Struktur**: **`html_row`** — "wadah sejajar", `<div> %1 %2
</div>` dengan `field_dropdown JUSTIFY` + `input_statement BODY`.

- Opsi `JUSTIFY` (5, sesuai istilah yang dipakai kurikulum M15–16): `rata
  kiri`→`flex-start`, `tengah`→`center`, `rata kanan`→`flex-end`,
  `renggang`→`space-between`, `sebar rata`→`space-around`.
- Emisi: **bukan** lewat blok Gaya biasa (lihat alasan arsitektur di atas) —
  `emitBlock` untuk `html_row` membaca field `JUSTIFY` blok itu sendiri,
  menyusun fragmen `display:flex;justify-content:<value>;flex-wrap:wrap`,
  lalu memanggil `emitContainer(block, 'BODY', 'div', depth, assetIds,
  [...styleFragments, fragmenSendiri])` — jadi kalau ada blok Gaya lain
  (mis. `padding:`) membungkus wadah sejajar ini dari luar, gaya-gaya itu
  ikut tergabung di `<div>` yang sama (bukan konflik).
- **`flex-wrap: wrap` selalu aktif**, bukan pilihan — supaya di pratinjau
  sempit (mis. layar 900px ke bawah di panel kanan editor), kotak-kotak
  yang dijajarkan turun ke baris berikutnya, bukan meluber keluar. Ini
  keputusan tetap, tidak perlu dropdown tambahan.

## Non-tujuan (di luar Fase F, sesuai kurikulum juga)

- **Syntax `<style>`/selector CSS mentah** (Pertemuan 9) — tetap tidak
  diajarkan lewat blok; Game HTML sengaja membungkus gaya per-blok, bukan
  lewat selector. Guru perlu tahu panel "Lihat Kode" tidak akan pernah
  menunjukkan blok `<style>` terpisah seperti yang didemonstrasikan di kelas.
  Ini bukan bug — keputusan desain sejak awal (anak SD tidak perlu paham
  selector CSS).
- Warna bebas (hex/RGB), atribut `class`/`id`, form (`<input>`/dll.) — tidak
  diminta kurikulum kelas 6, tetap di luar lingkup.
- Validasi ketat "blok X cuma boleh diisi blok Y" — konsisten dengan blok
  yang sudah ada, tidak ditambah di Fase F.

## Testing (ringkas, per PR)

- **Unit** (`tests/unit/blocks-html-defs.test.ts`,
  `tests/unit/blocks-html-generator.test.ts`): blok baru otomatis tercakup
  oleh loop `HTML_BLOCK_TYPES` (tooltip, instansiasi); tambahan manual untuk
  label tag & properti CSS (pola `it.each` yang sudah ada), dan snapshot
  `generateHtml(...).bodyHtml` untuk tiap fitur baru (termasuk nested
  table→row→cell, dan gabungan wadah-sejajar + blok Gaya lain).
- **E2E**: satu test baru per PR di `tests/e2e/html-mode.spec.ts` yang
  menyusun fixture lewat `serialization.workspaces.load` (pola yang sudah
  dipakai 2 test di file itu) dan mengecek hasil di pratinjau/panel kode —
  supaya kesalahan pendaftaran/toolbox (bukan cuma generator) ikut tertangkap.
- Gate penuh (`lint && typecheck && test && build && check:chunks &&
  test:e2e`) hijau sebelum tiap PR, seperti biasa.

## Dokumentasi

`docs/Design.md` §4.3 (tabel daftar blok) ditambah baris untuk blok baru di
tiap PR — penambahan ringkas, bukan tulis ulang (beda dengan Fase E yang
memang menghapus seksi besar). `docs/ROADMAP.md` dapat satu entri baru
"Fase F" per PR, mengikuti gaya file (menambah, bukan mengedit riwayat lama).
`docs/PRD.md` tidak perlu diubah (fitur ini memperkaya "Fitur editor
(ringkas)" §6 yang sudah generik, tidak butuh detail per-blok).
