import * as Blockly from 'blockly/core';

const COLOR_OPTIONS: [string, string][] = [
  ['hitam', '#000000'],
  ['putih', '#ffffff'],
  ['merah', '#e53935'],
  ['jingga', '#fb8c00'],
  ['kuning', '#fdd835'],
  ['hijau', '#43a047'],
  ['biru', '#1e88e5'],
  ['ungu', '#8e24aa'],
  ['merah muda', '#ec407a'],
  ['abu-abu', '#9e9e9e'],
];

let getAssetOptions: () => [string, string][] = () => [['(tidak ada gambar)', '']];

export function setHtmlAssetOptionsProvider(fn: () => [string, string][]): void {
  getAssetOptions = fn;
}

export const HTML_BLOCK_TYPES = [
  'html_page',
  'html_section',
  'html_heading',
  'html_paragraph',
  'html_list',
  'html_list_item',
  'html_text',
  'html_image_asset',
  'html_image_url',
  'html_link',
  'html_button',
  'html_hr',
  'html_style_color',
  'html_style_bg',
  'html_style_align',
  'html_style_size',
  'html_style_bold',
  'html_style_italic',
] as const;

export function registerHtmlBlocks(): void {
  Blockly.defineBlocksWithJsonArray([
    {
      type: 'html_page',
      message0: 'halaman %1 %2',
      args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'BODY' }],
      style: 'structure_blocks',
    },
    {
      type: 'html_section',
      message0: 'bagian %1 %2',
      args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'BODY' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_heading',
      message0: 'judul %1 ukuran %2',
      args0: [
        { type: 'input_value', name: 'TEXT', check: 'String' },
        {
          type: 'field_dropdown',
          name: 'LEVEL',
          options: [
            ['besar', 'h1'],
            ['sedang', 'h2'],
            ['kecil', 'h3'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_paragraph',
      message0: 'paragraf %1',
      args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_list',
      message0: 'daftar %1 %2',
      args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'ITEMS' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_list_item',
      message0: 'item daftar %1',
      args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
      previousStatement: null,
      nextStatement: null,
      style: 'structure_blocks',
    },
    {
      type: 'html_text',
      message0: 'teks %1',
      args0: [{ type: 'field_input', name: 'VALUE', text: 'Tulis di sini' }],
      output: 'String',
      style: 'content_blocks',
    },
    {
      type: 'html_image_asset',
      message0: 'gambar aset %1 teks alt %2',
      args0: [
        { type: 'field_dropdown', name: 'ASSET', options: () => getAssetOptions() },
        { type: 'field_input', name: 'ALT', text: '' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'content_blocks',
    },
    {
      type: 'html_image_url',
      message0: 'gambar dari URL %1 teks alt %2',
      args0: [
        { type: 'field_input', name: 'URL', text: 'https://' },
        { type: 'field_input', name: 'ALT', text: '' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'content_blocks',
    },
    {
      type: 'html_link',
      message0: 'tautan ke %1 tulisan %2',
      args0: [
        { type: 'field_input', name: 'URL', text: 'https://' },
        { type: 'field_input', name: 'LABEL', text: 'Tulis di sini' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'content_blocks',
    },
    {
      type: 'html_button',
      message0: 'tombol %1',
      args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
      previousStatement: null,
      nextStatement: null,
      style: 'content_blocks',
    },
    {
      type: 'html_hr',
      message0: 'garis pemisah',
      previousStatement: null,
      nextStatement: null,
      style: 'content_blocks',
    },
    {
      type: 'html_style_color',
      message0: 'warna teks %1 %2',
      args0: [
        { type: 'field_dropdown', name: 'COLOR', options: COLOR_OPTIONS },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
    {
      type: 'html_style_bg',
      message0: 'warna latar %1 %2',
      args0: [
        { type: 'field_dropdown', name: 'COLOR', options: COLOR_OPTIONS },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
    {
      type: 'html_style_align',
      message0: 'rata %1 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'ALIGN',
          options: [
            ['kiri', 'left'],
            ['tengah', 'center'],
            ['kanan', 'right'],
          ],
        },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
    {
      type: 'html_style_size',
      message0: 'ukuran %1 %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'SIZE',
          options: [
            ['kecil', '0.85rem'],
            ['sedang', '1rem'],
            ['besar', '1.5rem'],
          ],
        },
        { type: 'input_statement', name: 'BODY' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
    {
      type: 'html_style_bold',
      message0: 'tebal %1',
      args0: [{ type: 'input_statement', name: 'BODY' }],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
    {
      type: 'html_style_italic',
      message0: 'miring %1',
      args0: [{ type: 'input_statement', name: 'BODY' }],
      previousStatement: null,
      nextStatement: null,
      style: 'style_blocks',
    },
  ]);
}
