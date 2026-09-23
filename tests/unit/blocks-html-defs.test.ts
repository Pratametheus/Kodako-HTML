import { describe, expect, it } from 'vitest';
import { Blockly, installBlockly } from '../../src/blocks';
import { HTML_BLOCK_TYPES } from '../../src/blocks/html/blocks';
import { htmlToolbox } from '../../src/blocks/html/toolbox';

installBlockly();
installBlockly();

function message0(type: string): string {
  const ws = new Blockly.Workspace();
  const b = ws.newBlock(type);
  const parts = b.inputList.flatMap((i) => i.fieldRow.map((f) => f.getText?.() ?? ''));
  ws.dispose();
  return parts.join(' ');
}

describe('HTML block definitions', () => {
  it('registers the four document-skeleton blocks', () => {
    for (const type of ['html_document', 'html_head', 'html_body', 'html_title']) {
      expect(HTML_BLOCK_TYPES).toContain(type);
      expect(Blockly.Blocks[type], `missing ${type}`).toBeTruthy();
    }
  });

  it('gives every HTML block a non-empty Indonesian tooltip', () => {
    const ws = new Blockly.Workspace();
    for (const type of HTML_BLOCK_TYPES) {
      const b = ws.newBlock(type);
      const tip = typeof b.tooltip === 'function' ? b.tooltip() : b.tooltip;
      expect(typeof tip === 'string' && tip.trim().length > 0, `no tooltip on ${type}`).toBe(true);
    }
    ws.dispose();
  });
  it('registers every declared block type idempotently', () => {
    for (const type of HTML_BLOCK_TYPES) {
      expect(Blockly.Blocks[type], `missing block ${type}`).toBeTruthy();
    }
  });

  it('instantiates every block on a headless workspace', () => {
    const workspace = new Blockly.Workspace();
    for (const type of HTML_BLOCK_TYPES) {
      expect(workspace.newBlock(type).type).toBe(type);
    }
    workspace.dispose();
  });

  it('exposes structure, content, and style toolbox categories', () => {
    const toolboxJson = JSON.stringify(htmlToolbox);
    for (const category of ['structure_category', 'content_category', 'style_category']) {
      expect(toolboxJson).toContain(category);
    }
  });
});

describe('HTML document + style block labels', () => {
  it('document skeleton blocks show their real tags', () => {
    expect(message0('html_document')).toContain('<html>');
    expect(message0('html_document')).toContain('</html>');
    expect(message0('html_head')).toContain('<head>');
    expect(message0('html_body')).toContain('<body>');
    expect(message0('html_title')).toContain('<title>');
  });

  it.each([
    ['html_style_color', 'color:'],
    ['html_style_bg', 'background:'],
    ['html_style_align', 'text-align:'],
    ['html_style_size', 'font-size:'],
    ['html_style_bold', 'font-weight: bold'],
    ['html_style_italic', 'font-style: italic'],
    ['html_style_padding', 'padding:'],
    ['html_style_margin', 'margin:'],
    ['html_style_radius', 'border-radius:'],
    ['html_style_shadow', 'box-shadow:'],
    ['html_style_font', 'font-family:'],
  ])('%s label is CSS-property notation (%s)', (type, needle) => {
    expect(message0(type)).toContain(needle);
  });

  it('style blocks keep their field names', () => {
    const ws = new Blockly.Workspace();
    expect(ws.newBlock('html_style_color').getField('COLOR')).toBeTruthy();
    expect(ws.newBlock('html_style_align').getField('ALIGN')).toBeTruthy();
    expect(ws.newBlock('html_style_size').getField('SIZE')).toBeTruthy();
    ws.dispose();
  });
});

describe('HTML block labels use real tags', () => {
  it('section is a <section> C-block', () => {
    expect(message0('html_section')).toContain('<section>');
    expect(message0('html_section')).toContain('</section>');
  });
  it('paragraph shows <p> … </p>', () => {
    const m = message0('html_paragraph');
    expect(m).toContain('<p>');
    expect(m).toContain('</p>');
  });
  it('list shows <ul> … </ul> and item shows <li> … </li>', () => {
    expect(message0('html_list')).toContain('<ul>');
    expect(message0('html_list_item')).toContain('<li>');
  });
  it('table blocks show <table>, <tr>, and <td>', () => {
    expect(message0('html_table')).toContain('<table>');
    expect(message0('html_table_row')).toContain('<tr>');
    expect(message0('html_table_cell')).toContain('<td>');
  });
  it('table exposes border width/style/color controls defaulting to a visible thin black border', () => {
    const ws = new Blockly.Workspace();
    const table = ws.newBlock('html_table');
    const width = table.getField('BORDER_WIDTH')!;
    const widthOptions = (
      width as unknown as { getOptions: () => [string, string][] }
    ).getOptions();
    expect(widthOptions.map((o) => o[1])).toEqual(['1px', '2px', '4px', '0']);
    expect(width.getValue()).toBe('1px');

    const style = table.getField('BORDER_STYLE')!;
    const styleOptions = (
      style as unknown as { getOptions: () => [string, string][] }
    ).getOptions();
    expect(styleOptions.map((o) => o[1])).toEqual(['solid', 'dashed', 'dotted']);
    expect(style.getValue()).toBe('solid');

    expect(table.getField('BORDER_COLOR')!.getValue()).toBe('#000000');
    ws.dispose();
  });
  it('ordered list shows <ol> … </ol>', () => {
    expect(message0('html_list_ordered')).toContain('<ol>');
    expect(message0('html_list_ordered')).toContain('</ol>');
  });
  it('ordered list exposes a TYPE dropdown and numeric START field, both defaulting to plain numbering', () => {
    const ws = new Blockly.Workspace();
    const block = ws.newBlock('html_list_ordered');
    const type = block.getField('TYPE')!;
    const options = (type as unknown as { getOptions: () => [string, string][] }).getOptions();
    expect(options.map((o) => o[1])).toEqual(['1', 'A', 'a', 'I', 'i']);
    expect(type.getValue()).toBe('1');
    expect(block.getField('START')!.getValue()).toBe(1);
    ws.dispose();
  });
  it('header, main, and footer show their real tags', () => {
    expect(message0('html_header')).toContain('<header>');
    expect(message0('html_main')).toContain('<main>');
    expect(message0('html_footer')).toContain('<footer>');
  });
  it('image blocks expose a numeric WIDTH field defaulting to natural size (0)', () => {
    const ws = new Blockly.Workspace();
    for (const type of ['html_image_asset', 'html_image_url']) {
      const block = ws.newBlock(type);
      const field = block.getField('WIDTH')!;
      expect(field.getValue(), `${type} WIDTH default`).toBe(0);
    }
    ws.dispose();
  });
  it('image shows a "lebar ... piksel" label for the width field', () => {
    const m = message0('html_image_url');
    expect(m).toContain('lebar');
    expect(m).toContain('piksel');
  });
  it('image shows <img src= … alt= … >', () => {
    const m = message0('html_image_url');
    expect(m).toContain('<img');
    expect(m).toContain('src=');
    expect(m).toContain('alt=');
  });
  it('link shows <a href= … > … </a>', () => {
    const m = message0('html_link');
    expect(m).toContain('<a href=');
    expect(m).toContain('</a>');
  });
  it('link exposes a NEW_TAB checkbox defaulting to unchecked', () => {
    const ws = new Blockly.Workspace();
    const field = ws.newBlock('html_link').getField('NEW_TAB')!;
    expect(field.getValue()).toBe('FALSE');
    ws.dispose();
  });
  it('button shows <button> … </button>', () => {
    expect(message0('html_button')).toContain('<button>');
  });
  it('hr shows <hr>', () => {
    expect(message0('html_hr')).toContain('<hr>');
  });
  it('heading level dropdown labels are the h-tags, full h1-h6', () => {
    const ws = new Blockly.Workspace();
    const b = ws.newBlock('html_heading');
    const dropdown = b.getField('LEVEL')!;
    const options = (dropdown as unknown as { getOptions: () => [string, string][] }).getOptions();
    expect(options.map((o) => o[0])).toEqual(['<h1>', '<h2>', '<h3>', '<h4>', '<h5>', '<h6>']);
    expect(options.map((o) => o[1])).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    ws.dispose();
  });
  it('row (flex) shows a <div> and exposes 5 justify options', () => {
    expect(message0('html_row')).toContain('<div>');
    const ws = new Blockly.Workspace();
    const dropdown = ws.newBlock('html_row').getField('JUSTIFY')!;
    const options = (dropdown as unknown as { getOptions: () => [string, string][] }).getOptions();
    expect(options.map((o) => o[1])).toEqual([
      'flex-start',
      'center',
      'flex-end',
      'space-between',
      'space-around',
    ]);
    ws.dispose();
  });
  it('table header cell shows <th> … </th>', () => {
    const m = message0('html_table_header_cell');
    expect(m).toContain('<th>');
    expect(m).toContain('</th>');
  });
  it('caption shows <caption> … </caption>', () => {
    const m = message0('html_caption');
    expect(m).toContain('<caption>');
    expect(m).toContain('</caption>');
  });
  it('nav and blockquote show their real tags', () => {
    expect(message0('html_nav')).toContain('<nav>');
    expect(message0('html_blockquote')).toContain('<blockquote>');
  });
  it('figure and figcaption show their real tags', () => {
    expect(message0('html_figure')).toContain('<figure>');
    const m = message0('html_figcaption');
    expect(m).toContain('<figcaption>');
    expect(m).toContain('</figcaption>');
  });
  it('br shows <br>', () => {
    expect(message0('html_br')).toContain('<br>');
  });
});
