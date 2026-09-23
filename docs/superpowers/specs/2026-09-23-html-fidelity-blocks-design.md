# Fase G — Kesetiaan blok terhadap HTML asli — Design

Status: Disetujui (user: "Iya, lanjut aja sesuai desain itu") · Tanggal: 2026-09-23 ·
Menyertai: `PRD.md`, `Design.md`, `ROADMAP.md`,
`docs/superpowers/specs/2026-09-21-curriculum-gap-blocks-design.md` (Fase F)

## Ringkasan

Setelah Fase F, user menemukan satu gap konkret: blok `html_table` tidak
punya kontrol border sama sekali (`border="1"` di-*hardcode*). Diminta untuk
audit lebih luas ("blok semacamnya juga jadi kek bener-bener mirip HTML"),
ditemukan 5 titik di mana blok Struktur/Konten menyederhanakan dibanding tag
HTML aslinya:

1. `html_table` — tanpa kontrol border.
2. `html_image_asset`/`html_image_url` — lebar gambar dropdown preset
   (`kecil`/`sedang`/`besar`), padahal kurikulum menulis `<img width="200">`
   sebagai angka bebas.
3. `html_heading` — cuma `<h1>`–`<h3>`, HTML asli `<h1>`–`<h6>`.
4. `html_list_ordered` — tanpa atribut `type`/`start`.
5. `html_link` — tanpa `target="_blank"`.

Semua lima dikerjakan dalam Fase G ini. **Tidak ada blok baru** — kelimanya
menambah field ke blok yang sudah ada. Tidak ada perubahan toolbox/kategori.

## Aturan yang tetap berlaku

- Field blok HTML **beku** — hanya boleh **menambah** field baru, tidak
  boleh mengganti nama/tipe field yang sudah ada — **kecuali satu
  pengecualian yang disengaja** di bawah (§2, lebar gambar), yang aman
  karena dibungkus migrasi otomatis.
- Tidak ada dependensi npm baru.
- Tidak menyentuh `src/blocks/theme.ts`/`category-icons.ts`/`theme.css`/
  `src/app/i18n/id.json` — lima perubahan ini murni field + generator.
- Gate penuh (`lint && typecheck && test && build && check:chunks &&
  test:e2e`) hijau sebelum PR.

## Keputusan desain

### 1. Border tabel (`html_table`)

**Kenapa bukan blok Gaya baru:** setiap blok Gaya (`html_style_*`) menempel
ke **satu** elemen pembungkus lewat `withStyles` pada tag pembuka blok itu
saja — anak-anak di dalamnya di-*render* ulang lewat `emitChain` tanpa
`styleFragments` diteruskan (lihat `emitContainer`: panggilan
`emitChain(block.getInputTargetBlock(inputName), depth + 1, assetIds)` untuk
anak **tidak** membawa `styleFragments`). Border tabel yang "bergaris"
(seperti `<table border="1">` asli) perlu menempel di `<table>` **dan** di
tiap `<td>` supaya garis grid antar sel tetap kelihatan — mekanisme Gaya
generik tidak bisa mencapai itu (berhenti di satu level). Jadi tiga field
baru langsung di `html_table` sendiri, dan `emitTable()` ditulis ulang jadi
*bespoke* (tidak lagi lewat `emitChain`/`emitBlock` generik untuk baris/sel
di dalam tabel).

Field baru pada `html_table`:

```ts
{ type: 'field_dropdown', name: 'BORDER_WIDTH', options: [
  ['tipis', '1px'], ['sedang', '2px'], ['tebal', '4px'], ['tidak ada', '0'],
] },
{ type: 'field_dropdown', name: 'BORDER_STYLE', options: [
  ['penuh', 'solid'], ['putus-putus', 'dashed'], ['titik-titik', 'dotted'],
] },
{ type: 'field_dropdown', name: 'BORDER_COLOR', options: COLOR_OPTIONS },
```

`message0: '<table> garis: %1 %2 %3 %4 </table>'`, args0 = [BORDER_WIDTH,
BORDER_STYLE, BORDER_COLOR, `input_statement ROWS`]. **Default tetap
"tipis" (opsi pertama)** — tabel baru langsung bergaris seperti sekarang,
tidak ada regresi visual untuk kebiasaan lama.

Ini murni **penambahan** field (blok lama tanpa field ini tetap valid —
Blockly memakai nilai default field yang hilang saat deserialisasi), jadi
**tidak butuh migrasi**.

Generator (`generator.ts`) — hapus `border="1"` hardcode, ganti dengan:

```ts
const BORDER_WIDTHS = new Set(['1px', '2px', '4px', '0']);
const BORDER_STYLES = new Set(['solid', 'dashed', 'dotted']);
// warna pakai ulang Set `COLORS` yang sudah ada

function tableBorderFragment(block: Blockly.Block): string {
  const width = field(block, 'BORDER_WIDTH');
  const w = BORDER_WIDTHS.has(width) ? width : '1px';
  if (w === '0') return '';
  const style = field(block, 'BORDER_STYLE');
  const s = BORDER_STYLES.has(style) ? style : 'solid';
  const color = field(block, 'BORDER_COLOR');
  const c = COLORS.has(color) ? color : '#000000';
  return `border:${w} ${s} ${c}`;
}

function emitTableCell(
  block: Blockly.Block,
  depth: number,
  cellBorder: string,
): string {
  const prefix = indent(depth);
  const fragments = cellBorder ? [cellBorder] : [];
  return withStyles(`${prefix}<td>${textInput(block, 'TEXT')}</td>\n`, fragments);
}

function emitTableRow(block: Blockly.Block, depth: number, cellBorder: string): string {
  const prefix = indent(depth);
  let cells = '';
  let cell = block.getInputTargetBlock('CELLS');
  while (cell) {
    cells += emitTableCell(cell, depth + 1, cellBorder);
    cell = cell.getNextBlock();
  }
  return `${prefix}<tr>\n${cells}${prefix}</tr>\n`;
}

function emitTable(
  block: Blockly.Block,
  depth: number,
  assetIds: string[],
  styleFragments: string[],
): string {
  const prefix = indent(depth);
  const border = tableBorderFragment(block);
  const tableFragments = border ? [...styleFragments, 'border-collapse:collapse', border] : styleFragments;
  let rows = '';
  let row = block.getInputTargetBlock('ROWS');
  while (row) {
    rows += emitTableRow(row, depth + 1, border);
    row = row.getNextBlock();
  }
  return withStyles(`${prefix}<table>\n${rows}${prefix}</table>\n`, tableFragments);
}
```

`assetIds` tidak dipakai di jalur tabel (sel tabel cuma teks, tidak pernah
berisi gambar — konsisten dengan `html_table_cell` yang `input_value TEXT`,
bukan `input_statement`), jadi parameter itu boleh dihapus dari
`emitTableCell`/`emitTableRow` (tidak dipakai, bukan sekadar diteruskan
percuma). `emitBlock`'s `case 'html_table_row'`/`case 'html_table_cell'`
(generic, lewat `emitContainer`/`withStyles` biasa) **tetap dipertahankan
apa adanya** sebagai jalur *fallback* kalau ada `tr`/`td` yang somehow
berdiri sendiri di luar sebuah `html_table` (tidak mendapat cascading
border — itu memang di luar kasus yang didukung, konsisten dengan "tidak
ada validasi ketat" di Fase F).

Test lama `'applies a style wrapper to the whole table, not each row'`
(meng-*assert* `<table border="1" style="font-weight:bold">`) perlu
diperbarui ke output baru (default tipis+solid+hitam, tanpa atribut
`border` HTML, pakai `style="font-weight:bold;border-collapse:collapse;
border:1px solid #000000"` — urutan fragment: `styleFragments` luar
(dari Gaya pembungkus) dulu, baru fragment tabel sendiri belakangan,
konsisten pola akumulasi `[...styleFragments, sendiri]` yang dipakai di
tempat lain, mis. `html_row`).

### 2. Lebar gambar jadi angka bebas (`html_image_asset`/`html_image_url`)

**Satu-satunya pengecualian dari "field beku"** — field `WIDTH` berubah
tipe dari `field_dropdown` (nilai: `''`/`'120px'`/`'240px'`/`'480px'`) jadi
`field_number` (nilai: angka piksel, `0` = "ukuran asli"/tanpa atribut).
Alasan: kurikulum menulis `<img width="200">` sebagai **atribut HTML asli**
berisi angka bebas, bukan CSS `style` dengan pilihan terbatas — dropdown
preset tidak bisa merepresentasikan itu.

```ts
{ type: 'field_number', name: 'WIDTH', value: 0, min: 0, precision: 1 },
```

`message0: '<img src= %1 alt= %2 lebar %3 piksel >'` (ganti `ukuran %3` →
`lebar %3 piksel` supaya jelas ini angka piksel, bukan istilah kecil/sedang/
besar lagi).

Generator — ganti dari CSS `style="width:…"` ke **atribut HTML asli**
`width="…"` (lebih setia ke kurikulum & tetap kompatibel dengan
`withStyles`, yang cuma menyisipkan `style="…"` terpisah dari atribut lain
di tag pembuka):

```ts
case 'html_image_asset': {
  const assetId = field(block, 'ASSET');
  if (assetId) assetIds.push(assetId);
  const width = Number(field(block, 'WIDTH'));
  const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${width}"` : '';
  return withStyles(
    `${prefix}<img src="${escapeHtmlAttr(`asset:${assetId}`)}" alt="${escapeHtmlAttr(field(block, 'ALT'))}"${widthAttr}>\n`,
    styleFragments,
  );
}
// html_image_url sama, ganti sumber src
```

`IMAGE_WIDTHS` (Set lama, dipakai untuk validasi CSS width) dihapus —
sudah tidak relevan.

**Migrasi wajib** (satu-satunya bagian Fase G yang butuh migrasi): project
lama menyimpan `fields: { WIDTH: '' | '120px' | '240px' | '480px' }`
(string CSS). Kalau field-nya diganti tipe begitu saja, `field_number`
Blockly akan gagal mem-parse nilai lama itu (mis. `'120px'` bukan angka
valid) dan kemungkinan diam-diam reset ke default — merusak project lama
tanpa peringatan. `src/core/html-project.ts`'s `migrateHtmlWorkspaceJson`
(pola migrasi yang sudah ada untuk `html_page`) diperluas dengan jalur
kedua: **rekursif** menelusuri seluruh pohon blok (bukan cuma top-level
seperti migrasi `html_page`) dan mengubah field `WIDTH` lama di setiap blok
`html_image_asset`/`html_image_url` yang ditemukan, dari string CSS ke
angka murni:

```ts
const LEGACY_IMAGE_WIDTHS: Record<string, number> = {
  '': 0,
  '120px': 120,
  '240px': 240,
  '480px': 480,
};

function migrateImageWidthField(node: BlockNode): BlockNode {
  if (
    (node.type === 'html_image_asset' || node.type === 'html_image_url') &&
    node.fields &&
    typeof node.fields.WIDTH === 'string' &&
    node.fields.WIDTH in LEGACY_IMAGE_WIDTHS
  ) {
    return { ...node, fields: { ...node.fields, WIDTH: LEGACY_IMAGE_WIDTHS[node.fields.WIDTH as string] } };
  }
  return node;
}

function walkBlockNode(node: BlockNode | undefined): BlockNode | undefined {
  if (!node || typeof node !== 'object') return node;
  let current = migrateImageWidthField(node);
  if (current.next?.block) {
    current = { ...current, next: { ...current.next, block: walkBlockNode(current.next.block) } };
  }
  if (current.inputs) {
    const nextInputs: typeof current.inputs = {};
    for (const [key, value] of Object.entries(current.inputs)) {
      nextInputs[key] = { ...value, block: value.block ? walkBlockNode(value.block) : value.block };
    }
    current = { ...current, inputs: nextInputs };
  }
  return current;
}
```

`migrateHtmlWorkspaceJson` memanggil `walkBlockNode` atas **setiap**
top-level block (setelah lift `html_page` yang sudah ada) dan mengganti
`blocks.blocks` dengan hasilnya. Pure + idempotent (kalau tidak ada field
lama yang cocok, tidak ada yang berubah) — pola yang sama dengan migrasi
`html_page` yang sudah ada di file itu. Field `.shadow` (bukan `.block`)
tidak perlu ditelusuri — shadow block di codebase ini selalu `html_text`
(dari `textShadow()`), tidak pernah berisi blok gambar.

Test baru di `tests/unit/html-project-migrate.test.ts`: satu kasus per nilai
lama (`''`→`0`, `'240px'`→`240`), satu kasus gambar bersarang di dalam
`html_section`/`html_row` (bukan cuma top-level, supaya rekursi teruji),
satu kasus idempotent, satu kasus "field WIDTH sudah angka (project baru)
tidak diubah".

### 3. Heading lengkap `<h1>`–`<h6>`

Perluasan murni opsi dropdown `LEVEL` yang sudah ada — pola "union hanya
boleh membesar" yang sama dengan `emitContainer`'s `tag:` type di Fase F:

```ts
options: [
  ['<h1>', 'h1'], ['<h2>', 'h2'], ['<h3>', 'h3'],
  ['<h4>', 'h4'], ['<h5>', 'h5'], ['<h6>', 'h6'],
],
```

`HEADING_LEVELS` (Set di `generator.ts`) ditambah `'h4'`/`'h5'`/`'h6'`.
Penambahan murni, tidak ada migrasi (nilai lama `h1`/`h2`/`h3` tetap valid).

### 4. Tipe & mulai-dari daftar bernomor (`html_list_ordered`)

Dua field baru:

```ts
{ type: 'field_dropdown', name: 'TYPE', options: [
  ['angka', '1'], ['huruf besar', 'A'], ['huruf kecil', 'a'],
  ['romawi besar', 'I'], ['romawi kecil', 'i'],
] },
{ type: 'field_number', name: 'START', value: 1, min: 1, precision: 1 },
```

`message0: '<ol> tipe %1 mulai %2 %3 </ol>'`, args0 = [TYPE, START,
`input_statement ITEMS`]. Default TYPE = `angka`/`'1'`, default START = `1`
— sama persis output lama, jadi murni penambahan, **tidak ada migrasi**.

`emitContainer` diberi parameter opsional baru `attrs = ''` (disisipkan
antara nama tag dan `>`), dipakai HANYA oleh `html_list_ordered` — semua 7
pemanggilan lain (section/ul/header/main/footer/div/tr) tidak berubah
sama sekali karena defaultnya string kosong:

```ts
function emitContainer(
  block: Blockly.Block,
  inputName: string,
  tag: 'section' | 'ul' | 'ol' | 'header' | 'main' | 'footer' | 'div' | 'tr',
  depth: number,
  assetIds: string[],
  styleFragments: string[],
  attrs = '',
): string {
  const prefix = indent(depth);
  const children = emitChain(block.getInputTargetBlock(inputName), depth + 1, assetIds);
  return withStyles(`${prefix}<${tag}${attrs}>\n${children}${prefix}</${tag}>\n`, styleFragments);
}
```

```ts
const LIST_TYPES = new Set(['1', 'A', 'a', 'I', 'i']);

case 'html_list_ordered': {
  const type = field(block, 'TYPE');
  const typeAttr = LIST_TYPES.has(type) && type !== '1' ? ` type="${type}"` : '';
  const start = Number(field(block, 'START'));
  const startAttr = Number.isFinite(start) && start !== 1 ? ` start="${start}"` : '';
  return emitContainer(block, 'ITEMS', 'ol', depth, assetIds, styleFragments, `${typeAttr}${startAttr}`);
}
```

`type="1"` tidak pernah ditulis (nilai default HTML sudah `1`, menulisnya
cuma bikin kode lebih berisik untuk anak baca); `start="1"` juga tidak
ditulis dengan alasan sama.

### 5. Tautan buka tab baru (`html_link`)

Satu field baru, checkbox:

```ts
{ type: 'field_checkbox', name: 'NEW_TAB', checked: false },
```

`message0: '<a href= %1 > %2 </a> tab baru? %3'`, args0 = [URL, LABEL,
NEW_TAB]. Default `false` = perilaku lama persis, murni penambahan, tidak
ada migrasi.

```ts
case 'html_link': {
  const newTab = block.getFieldValue('NEW_TAB') === 'TRUE';
  const targetAttr = newTab ? ' target="_blank"' : '';
  return withStyles(
    `${prefix}<a href="${escapeHtmlAttr(safeUrl(field(block, 'URL')))}"${targetAttr}>${escapeHtmlText(field(block, 'LABEL'))}</a>\n`,
    styleFragments,
  );
}
```

Nilai serialisasi persis `FieldCheckbox` (`'TRUE'`/`'FALSE'` sebagai
string) diverifikasi lewat TDD di langkah implementasi — kalau ternyata
Blockly mengembalikan boolean asli alih-alih string, kondisinya disesuaikan
saat itu juga (tes yang menentukan, bukan tebakan di spec ini).

## Non-tujuan

- Atribut `border` HTML mentah (`<table border="1">`) — sengaja diganti
  total oleh CSS `border-collapse`+`border` yang lebih fleksibel (warna,
  gaya garis); ini keputusan sadar, bukan kelalaian (`border=` attribute
  HTML asli tidak bisa mengatur warna/gaya garis).
- Kontrol `colspan`/`rowspan` pada `<td>` — di luar cakupan kurikulum kelas
  6 yang sudah diperiksa di Fase F, tidak diminta sekarang.
- `rel="noopener"` otomatis saat `target="_blank"` — praktik keamanan nyata
  untuk web publik, tapi halaman ekspor Game HTML tidak pernah memuat
  skrip (CSP `script-src 'none'` di export & preview), jadi risiko
  reverse-tabnabbing yang biasanya jadi alasan `rel="noopener"` tidak
  berlaku di sini; menambahkannya cuma bikin kode yang anak baca lebih
  ramai tanpa manfaat nyata dalam konteks alat ini.
- Field `class`/`id` generik di semua blok — tetap di luar lingkup (sudah
  dinyatakan di Non-tujuan Fase F, tidak berubah).

## Testing

- **Unit** (`tests/unit/blocks-html-defs.test.ts`,
  `tests/unit/blocks-html-generator.test.ts`): assert field/opsi baru per
  blok (pola `it.each` yang sudah ada), assert `generateHtml(...).bodyHtml`
  untuk tiap kombinasi field baru (termasuk kombinasi: tabel tanpa border,
  tabel + Gaya luar, `<ol type="A" start="5">`, gambar lebar 0 vs. lebar
  positif, tautan tab baru).
- **Migrasi** (`tests/unit/html-project-migrate.test.ts`): kasus per nilai
  WIDTH lama, kasus bersarang, idempotent, kasus "sudah baru" (lihat §2).
- **E2E** (`tests/e2e/html-mode.spec.ts`): satu test baru yang menyusun
  fixture berisi tabel berwarna + gambar berlebar angka + `<ol>`
  bertipe + tautan tab-baru, memverifikasi hasil di panel kode.
- Test lama yang perlu diperbarui (bukan ditambah): assertion `border="1"`
  di `blocks-html-generator.test.ts` dan `html-mode.spec.ts`'s "table
  blocks render a bordered table" (Fase F), assertion dropdown `WIDTH`
  lama di `blocks-html-defs.test.ts` (Fase F, PR-F1).
- Gate penuh hijau sebelum PR, seperti biasa.

## Dokumentasi

`docs/Design.md` §4.3 (tabel daftar blok): baris `html_table`/
`html_image_*`/`html_heading`/`html_list_ordered`/`html_link` diperbarui
untuk mencerminkan field baru (bukan baris baru — blok yang sama, field
yang berubah). Satu catatan baru soal migrasi WIDTH (pola yang sama dengan
catatan `formatVersion`/`activeMode` yang sudah ada di §3 Model data
project). `docs/ROADMAP.md` dapat satu entri baru "Fase G".
`docs/PRD.md` tidak perlu diubah (tidak ada fitur baru di level produk,
cuma penghalusan blok yang sudah ada).
