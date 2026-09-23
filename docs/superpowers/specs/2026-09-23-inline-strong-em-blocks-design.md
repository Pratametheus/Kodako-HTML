# Blok teks sebaris `<strong>`/`<em>` + label `html_text` — Design

Status: Disetujui desainnya, **implementasi ditunda** (user: "tunggu aja, cukup
simpan dulu plan-nya nanti lagi dilanjut") · Tanggal: 2026-09-23 · Menyertai:
`PRD.md`, `Design.md`

## Latar belakang

Setelah Fase H, user menunjuk satu sisa gap kesetiaan HTML: blok tebal/miring
di kategori Gaya (`html_style_bold`/`html_style_italic`) menghasilkan
`style="font-weight:bold"`/`style="font-style:italic"` pada anaknya — bukan
tag HTML asli. Juga: blok `html_text` (dipakai sebagai *shadow* di hampir
semua slot teks) berlabel `<> teks` padahal dia bukan tag HTML sama sekali,
cuma pembawa nilai string.

**Klarifikasi yang sudah didapat dari user:**
1. Cara pakai yang diinginkan: **blok baru yang disisipkan di slot teks**
   (seperti `html_text`), **bukan** mengganti mekanisme `html_style_bold`/
   `html_style_italic` yang sudah ada. Blok Gaya lama **tidak disentuh** —
   tetap ada untuk kasus "tebalkan satu paragraf/section utuh sekaligus",
   dan project lama yang sudah pakai blok itu tetap aman (tidak ada migrasi).
2. Tag yang dipakai: **`<strong>`/`<em>`** (bukan `<b>`/`<i>`) — tag semantik
   HTML5 modern, tampil sama (tebal/miring) di browser.
3. User sudah diberi tahu dan menyetujui satu batasan: **tidak ada mekanisme
   gabung-teks** di codebase ini sekarang, jadi satu slot teks cuma bisa diisi
   SATU hal — teks polos ATAU `<strong>`/`<em>` (bisa disusun bersarang,
   `<strong><em>teks</em></strong>`), belum bisa "Halo **Dunia**" campur
   polos+tebal dalam satu kalimat.

## Konteks kode saat ini

- `src/blocks/html/blocks.ts`: `html_text` — `message0: '<> %1'`,
  `args0: [{ type: 'field_input', name: 'VALUE', text: 'Tulis di sini' }]`,
  `output: 'String'`, `style: 'content_blocks'`. Dipakai sebagai *shadow*
  (`textShadow()` di `toolbox.ts`) di hampir semua `input_value TEXT` slot
  (paragraf, heading, `<li>`, `<td>`/`<th>`, `<caption>`, `<figcaption>`,
  tombol, label tautan).
- `src/blocks/html/generator.ts`'s `textInput(block, inputName)`:
  ```ts
  function textInput(block: Blockly.Block, inputName: string): string {
    const target = block.getInputTargetBlock(inputName);
    if (!target) return escapeHtmlText(field(block, inputName));
    const value =
      target.type === 'html_text'
        ? field(target, 'VALUE')
        : field(target, 'TEXT') || field(target, 'VALUE');
    return escapeHtmlText(value);
  }
  ```
  Ini satu-satunya tempat yang membaca isi slot teks manapun di seluruh
  generator — semua blok Struktur/Konten yang punya `input_value TEXT`
  memanggil fungsi ini. Nilai yang dikembalikan **selalu** melewati
  `escapeHtmlText` (dari `runtime/html/escape.ts`), jadi anak tidak bisa
  menyuntikkan tag HTML mentah lewat teks biasa — ini pertahanan XSS utama
  yang **tidak boleh dilonggarkan**.
- `html_style_bold`/`html_style_italic` (Gaya, `input_statement BODY`,
  `emitBlock`'s style-block case) — **tidak diubah sama sekali** oleh
  desain ini.

## Keputusan desain

### 1. Label `html_text`: `<>` → `" … "`

Ganti `message0: '<> %1'` jadi `message0: '" %1 "'`. Murni perubahan label
tampilan — field `VALUE`, `output: 'String'`, generator logic sama sekali
tidak berubah. Tidak ada migrasi (label bukan bagian dari data tersimpan).

### 2. Blok baru `html_strong` dan `html_em`

Dua blok Konten baru, mirip `html_text` tapi membungkus **nilai lain** (bukan
field mentah) dengan tag literal:

```ts
{
  type: 'html_strong',
  tooltip: 'Menebalkan sepotong teks, dengan makna "penting" (<strong>).',
  message0: '<strong> %1 </strong>',
  args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
  output: 'String',
  style: 'content_blocks',
},
{
  type: 'html_em',
  tooltip: 'Menekankan sepotong teks dengan gaya miring (<em>).',
  message0: '<em> %1 </em>',
  args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
  output: 'String',
  style: 'content_blocks',
},
```

`HTML_BLOCK_TYPES` dapat 2 entri baru: `'html_strong'`, `'html_em'`.

Toolbox (`src/blocks/html/toolbox.ts`), kategori Konten, setelah
`html_text`:
```ts
{ kind: 'block', type: 'html_strong', inputs: { TEXT: textShadow() } },
{ kind: 'block', type: 'html_em', inputs: { TEXT: textShadow() } },
```

### 3. `textInput()` jadi rekursif untuk `html_strong`/`html_em`

Ini kunci desainnya — bukan blok berdiri sendiri, tapi perluasan helper yang
sudah dipakai SEMUA slot teks yang ada:

```ts
function textInput(block: Blockly.Block, inputName: string): string {
  const target = block.getInputTargetBlock(inputName);
  if (!target) return escapeHtmlText(field(block, inputName));
  if (target.type === 'html_strong') return `<strong>${textInput(target, 'TEXT')}</strong>`;
  if (target.type === 'html_em') return `<em>${textInput(target, 'TEXT')}</em>`;
  const value =
    target.type === 'html_text'
      ? field(target, 'VALUE')
      : field(target, 'TEXT') || field(target, 'VALUE');
  return escapeHtmlText(value);
}
```

Konsekuensi (semuanya disengaja):
- Bisa dipasang di **slot teks manapun yang sudah ada** — paragraf, heading,
  `<li>`, `<td>`/`<th>`, `<caption>`, `<figcaption>`, tombol, label tautan —
  tanpa menyentuh definisi blok-blok itu sama sekali (mereka semua sudah
  memanggil `textInput()`).
- Bisa **disusun bersarang**: `html_strong` yang isinya `html_em` (atau
  sebaliknya) menghasilkan `<strong><em>teks</em></strong>` — rekursi
  `textInput(target, 'TEXT')` menangani ini otomatis.
- Anak akhirnya tetap melewati `escapeHtmlText` di titik paling dalam (base
  case `html_text`/field), jadi **tidak ada pelonggaran keamanan** — hanya
  menambah tag literal di luar teks yang sudah aman.
- **Batasan yang disetujui user**: kalau `target` bukan `html_text`/
  `html_strong`/`html_em` tapi field TEXT langsung pada block (jalur
  `return escapeHtmlText(field(block, inputName))`), atau kalau butuh
  MENCAMPUR teks polos dengan `<strong>` di tengah kalimat yang sama — itu
  butuh mekanisme "gabung teks" baru (semacam blok "sambung 2 teks") yang
  **di luar cakupan desain ini**. Tidak direncanakan kecuali diminta lagi.

## Non-tujuan

- Tidak mengganti/menghapus `html_style_bold`/`html_style_italic` (Gaya) —
  keduanya tetap untuk kasus "tebalkan satu blok/section utuh".
- Tidak menambah blok "gabung teks"/concatenation untuk mencampur teks polos
  dan `<strong>` dalam satu kalimat.
- Tidak menambah tag inline lain (`<u>`, `<small>`, `<mark>`, dst.) — kalau
  mau, itu pola yang sama persis dan bisa ditambah kapan saja mengikuti
  contoh `html_strong`/`html_em`.

## Testing (saat dilanjutkan)

- **Defs**: `html_strong`/`html_em` menunjukkan tag asli di label; keduanya
  punya `input_value TEXT`.
- **Generator**: `textInput()` untuk kasus (a) `html_strong` langsung berisi
  `html_text`, (b) `html_em` langsung berisi `html_text`, (c) bersarang
  `html_strong` berisi `html_em`, (d) dipasang di beberapa slot berbeda
  (paragraf, `<li>`, `<td>`) untuk memastikan tidak ada regresi di blok yang
  sudah ada — semua lewat `generateHtml(...).bodyHtml` seperti pola test
  yang sudah ada di `tests/unit/blocks-html-generator.test.ts`.
- **E2E**: satu test baru di `tests/e2e/html-mode.spec.ts` yang menaruh
  `html_strong`/`html_em` (termasuk bersarang) di dalam sebuah paragraf,
  cek hasil di panel kode.
- Gate penuh (`lint && typecheck && test && build && check:chunks &&
  test:e2e`) hijau sebelum PR, seperti biasa.

## Status implementasi

**Belum dikerjakan.** Desain ini sudah final/disetujui — saat dilanjutkan,
langsung eksekusi (TDD, tanpa perlu brainstorming ulang), tidak perlu
implementation plan terpisah (bounded, pola persis blok yang sudah ada).
