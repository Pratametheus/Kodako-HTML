import type * as Blockly from 'blockly/core';

const textShadow = (value = 'Tulis di sini') => ({
  shadow: { type: 'html_text', fields: { VALUE: value } },
});

export const htmlToolbox: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Struktur',
      categorystyle: 'structure_category',
      contents: [
        { kind: 'block', type: 'html_section' },
        { kind: 'block', type: 'html_heading', inputs: { TEXT: textShadow() } },
        { kind: 'block', type: 'html_paragraph', inputs: { TEXT: textShadow() } },
        { kind: 'block', type: 'html_list' },
        { kind: 'block', type: 'html_list_item', inputs: { TEXT: textShadow() } },
      ],
    },
    {
      kind: 'category',
      name: 'Konten',
      categorystyle: 'content_category',
      contents: [
        { kind: 'block', type: 'html_text' },
        { kind: 'block', type: 'html_image_asset' },
        { kind: 'block', type: 'html_image_url' },
        { kind: 'block', type: 'html_link' },
        { kind: 'block', type: 'html_button', inputs: { TEXT: textShadow() } },
        { kind: 'block', type: 'html_hr' },
      ],
    },
    {
      kind: 'category',
      name: 'Gaya',
      categorystyle: 'style_category',
      contents: [
        { kind: 'block', type: 'html_style_color' },
        { kind: 'block', type: 'html_style_bg' },
        { kind: 'block', type: 'html_style_align' },
        { kind: 'block', type: 'html_style_size' },
        { kind: 'block', type: 'html_style_bold' },
        { kind: 'block', type: 'html_style_italic' },
      ],
    },
  ],
};
