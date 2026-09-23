import { beforeEach, describe, expect, it } from 'vitest';
import {
  Blockly,
  generateHtml,
  installBlockly,
  setHtmlAssetOptionsProvider,
} from '../../src/blocks';

installBlockly();

function statement(workspace: Blockly.Workspace, type: string): Blockly.Block {
  return workspace.newBlock(type);
}

function text(workspace: Blockly.Workspace, value: string): Blockly.Block {
  const block = workspace.newBlock('html_text');
  block.setFieldValue(value, 'VALUE');
  return block;
}

function connectStatement(parent: Blockly.Block, inputName: string, child: Blockly.Block): void {
  parent.getInput(inputName)?.connection?.connect(child.previousConnection!);
}

function connectText(parent: Blockly.Block, value: string): void {
  const child = text(parent.workspace, value);
  parent.getInput('TEXT')?.connection?.connect(child.outputConnection!);
}

function append(block: Blockly.Block, next: Blockly.Block): void {
  block.nextConnection?.connect(next.previousConnection!);
}

describe('HTML block generator', () => {
  let workspace: Blockly.Workspace;

  beforeEach(() => {
    setHtmlAssetOptionsProvider(() => [['gambar uji', 'img_1']]);
    workspace = new Blockly.Workspace();
  });

  it('returns an empty result for an empty workspace', () => {
    expect(generateHtml(workspace)).toEqual({ headHtml: '', bodyHtml: '', assetIds: [] });
  });

  it('emits escaped paragraph text exactly', () => {
    const paragraph = statement(workspace, 'html_paragraph');
    connectText(paragraph, 'Halo <b>');

    expect(generateHtml(workspace).bodyHtml).toBe('<p>Halo &lt;b&gt;</p>\n');
  });

  it('emits the selected heading level', () => {
    const heading = statement(workspace, 'html_heading');
    heading.setFieldValue('h1', 'LEVEL');
    connectText(heading, 'Judul');

    expect(generateHtml(workspace).bodyHtml).toBe('<h1>Judul</h1>\n');
  });

  it('indents section children by two spaces', () => {
    const section = statement(workspace, 'html_section');
    const first = statement(workspace, 'html_paragraph');
    const second = statement(workspace, 'html_paragraph');
    connectText(first, 'A');
    connectText(second, 'B');
    append(first, second);
    connectStatement(section, 'BODY', first);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<section>\n  <p>A</p>\n  <p>B</p>\n</section>\n',
    );
  });

  it('emits an indented unordered list', () => {
    const list = statement(workspace, 'html_list');
    const first = statement(workspace, 'html_list_item');
    const second = statement(workspace, 'html_list_item');
    connectText(first, 'x');
    connectText(second, 'y');
    append(first, second);
    connectStatement(list, 'ITEMS', first);

    expect(generateHtml(workspace).bodyHtml).toBe('<ul>\n  <li>x</li>\n  <li>y</li>\n</ul>\n');
  });

  it('emits a table with the default thin black border, cascading onto every cell', () => {
    const table = statement(workspace, 'html_table');
    const row1 = statement(workspace, 'html_table_row');
    const cellA = statement(workspace, 'html_table_cell');
    const cellB = statement(workspace, 'html_table_cell');
    connectText(cellA, 'Senin');
    connectText(cellB, 'Selasa');
    append(cellA, cellB);
    connectStatement(row1, 'CELLS', cellA);
    connectStatement(table, 'ROWS', row1);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table style="border-collapse:collapse;border:1px solid #000000">\n' +
        '  <tr>\n' +
        '    <td style="border:1px solid #000000">Senin</td>\n' +
        '    <td style="border:1px solid #000000">Selasa</td>\n' +
        '  </tr>\n' +
        '</table>\n',
    );
  });

  it('emits multiple table rows in order', () => {
    const table = statement(workspace, 'html_table');
    const row1 = statement(workspace, 'html_table_row');
    const row2 = statement(workspace, 'html_table_row');
    const cell1 = statement(workspace, 'html_table_cell');
    const cell2 = statement(workspace, 'html_table_cell');
    connectText(cell1, 'A');
    connectText(cell2, 'B');
    connectStatement(row1, 'CELLS', cell1);
    connectStatement(row2, 'CELLS', cell2);
    append(row1, row2);
    connectStatement(table, 'ROWS', row1);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table style="border-collapse:collapse;border:1px solid #000000">\n' +
        '  <tr>\n    <td style="border:1px solid #000000">A</td>\n  </tr>\n' +
        '  <tr>\n    <td style="border:1px solid #000000">B</td>\n  </tr>\n' +
        '</table>\n',
    );
  });

  it('customizes table border width, style, and color, cascading onto every cell', () => {
    const table = statement(workspace, 'html_table');
    table.setFieldValue('2px', 'BORDER_WIDTH');
    table.setFieldValue('dashed', 'BORDER_STYLE');
    table.setFieldValue('#1e88e5', 'BORDER_COLOR');
    const row = statement(workspace, 'html_table_row');
    const cell = statement(workspace, 'html_table_cell');
    connectText(cell, 'A');
    connectStatement(row, 'CELLS', cell);
    connectStatement(table, 'ROWS', row);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table style="border-collapse:collapse;border:2px dashed #1e88e5">\n' +
        '  <tr>\n' +
        '    <td style="border:2px dashed #1e88e5">A</td>\n' +
        '  </tr>\n' +
        '</table>\n',
    );
  });

  it('omits all border styling when width is set to "tidak ada"', () => {
    const table = statement(workspace, 'html_table');
    table.setFieldValue('0', 'BORDER_WIDTH');
    const row = statement(workspace, 'html_table_row');
    const cell = statement(workspace, 'html_table_cell');
    connectText(cell, 'A');
    connectStatement(row, 'CELLS', cell);
    connectStatement(table, 'ROWS', row);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table>\n  <tr>\n    <td>A</td>\n  </tr>\n</table>\n',
    );
  });

  it('applies a style wrapper to the whole table only, not each cell', () => {
    const bold = statement(workspace, 'html_style_bold');
    const table = statement(workspace, 'html_table');
    connectStatement(bold, 'BODY', table);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<table style="font-weight:bold;border-collapse:collapse;border:1px solid #000000">\n</table>\n',
    );
  });

  it('emits an indented ordered list', () => {
    const list = statement(workspace, 'html_list_ordered');
    const first = statement(workspace, 'html_list_item');
    const second = statement(workspace, 'html_list_item');
    connectText(first, 'x');
    connectText(second, 'y');
    append(first, second);
    connectStatement(list, 'ITEMS', first);

    expect(generateHtml(workspace).bodyHtml).toBe('<ol>\n  <li>x</li>\n  <li>y</li>\n</ol>\n');
  });

  it.each(['html_header', 'html_main', 'html_footer'])(
    'wraps children in a real %s tag',
    (type) => {
      const wrapper = statement(workspace, type);
      const paragraph = statement(workspace, 'html_paragraph');
      connectText(paragraph, 'A');
      connectStatement(wrapper, 'BODY', paragraph);
      const tag = type.replace('html_', '');

      expect(generateHtml(workspace).bodyHtml).toBe(`<${tag}>\n  <p>A</p>\n</${tag}>\n`);
    },
  );

  it('composes nested style wrappers onto the child element', () => {
    const bold = statement(workspace, 'html_style_bold');
    const color = statement(workspace, 'html_style_color');
    const paragraph = statement(workspace, 'html_paragraph');
    color.setFieldValue('#e53935', 'COLOR');
    connectText(paragraph, 'Hai');
    connectStatement(color, 'BODY', paragraph);
    connectStatement(bold, 'BODY', color);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<p style="font-weight:bold;color:#e53935">Hai</p>\n',
    );
  });

  it('applies a style wrapper to every direct child element', () => {
    const bold = statement(workspace, 'html_style_bold');
    const first = statement(workspace, 'html_paragraph');
    const second = statement(workspace, 'html_paragraph');
    connectText(first, 'A');
    connectText(second, 'B');
    append(first, second);
    connectStatement(bold, 'BODY', first);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<p style="font-weight:bold">A</p>\n<p style="font-weight:bold">B</p>\n',
    );
  });

  it.each([
    ['html_style_bg', 'COLOR', '#1e88e5', 'background:#1e88e5'],
    ['html_style_align', 'ALIGN', 'center', 'text-align:center'],
    ['html_style_size', 'SIZE', '1.5rem', 'font-size:1.5rem'],
  ])('emits the expected %s style fragment', (type, fieldName, value, fragment) => {
    const wrapper = statement(workspace, type);
    const paragraph = statement(workspace, 'html_paragraph');
    wrapper.setFieldValue(value, fieldName);
    connectText(paragraph, 'A');
    connectStatement(wrapper, 'BODY', paragraph);

    expect(generateHtml(workspace).bodyHtml).toBe(`<p style="${fragment}">A</p>\n`);
  });

  it.each([
    ['html_style_padding', 'SIZE', '16px', 'padding:16px'],
    ['html_style_margin', 'SIZE', '32px', 'margin:32px'],
    ['html_style_radius', 'SIZE', '9999px', 'border-radius:9999px'],
    ['html_style_font', 'FONT', 'Georgia, serif', 'font-family:Georgia, serif'],
  ])('emits the expected %s style fragment', (type, fieldName, value, fragment) => {
    const wrapper = statement(workspace, type);
    const paragraph = statement(workspace, 'html_paragraph');
    wrapper.setFieldValue(value, fieldName);
    connectText(paragraph, 'A');
    connectStatement(wrapper, 'BODY', paragraph);

    expect(generateHtml(workspace).bodyHtml).toBe(`<p style="${fragment}">A</p>\n`);
  });

  it('emits a fixed shadow fragment with no dropdown', () => {
    const shadow = statement(workspace, 'html_style_shadow');
    const paragraph = statement(workspace, 'html_paragraph');
    connectText(paragraph, 'A');
    connectStatement(shadow, 'BODY', paragraph);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<p style="box-shadow:0 4px 10px rgba(30,41,80,.15)">A</p>\n',
    );
  });

  it('applies style wrappers directly to section and list opening tags', () => {
    const bold = statement(workspace, 'html_style_bold');
    const section = statement(workspace, 'html_section');
    const italic = statement(workspace, 'html_style_italic');
    const list = statement(workspace, 'html_list');
    connectStatement(bold, 'BODY', section);
    connectStatement(italic, 'BODY', list);
    append(bold, italic);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<section style="font-weight:bold">\n</section>\n<ul style="font-style:italic">\n</ul>\n',
    );
  });

  it('emits nothing for an empty style wrapper', () => {
    statement(workspace, 'html_style_bold');
    expect(generateHtml(workspace).bodyHtml).toBe('');
  });

  it('emits and tracks an asset image while escaping alt text', () => {
    const image = statement(workspace, 'html_image_asset');
    image.setFieldValue('img_1', 'ASSET');
    image.setFieldValue('Kucing <x>', 'ALT');

    expect(generateHtml(workspace)).toEqual({
      headHtml: '',
      bodyHtml: '<img src="asset:img_1" alt="Kucing &lt;x&gt;">\n',
      assetIds: ['img_1'],
    });
  });

  it('emits an image at a chosen width and omits width at the natural-size default', () => {
    const sized = statement(workspace, 'html_image_url');
    sized.setFieldValue('https://x/y.png', 'URL');
    sized.setFieldValue('240px', 'WIDTH');
    expect(generateHtml(workspace).bodyHtml).toBe(
      '<img src="https://x/y.png" alt="" style="width:240px">\n',
    );

    workspace.clear();
    const natural = statement(workspace, 'html_image_url');
    natural.setFieldValue('https://x/y.png', 'URL');
    expect(generateHtml(workspace).bodyHtml).toBe('<img src="https://x/y.png" alt="">\n');
  });

  it('emits remote images, buttons, and rules exactly', () => {
    const image = statement(workspace, 'html_image_url');
    const button = statement(workspace, 'html_button');
    const rule = statement(workspace, 'html_hr');
    image.setFieldValue('https://a.b/c.png', 'URL');
    image.setFieldValue('Gambar', 'ALT');
    connectText(button, 'Tekan');
    append(image, button);
    append(button, rule);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<img src="https://a.b/c.png" alt="Gambar">\n<button type="button">Tekan</button>\n<hr>\n',
    );
  });

  it('emits an html_text value inside a paragraph in a section', () => {
    const section = statement(workspace, 'html_section');
    const paragraph = statement(workspace, 'html_paragraph');
    connectText(paragraph, 'Isi');
    connectStatement(section, 'BODY', paragraph);

    expect(generateHtml(workspace).bodyHtml).toBe('<section>\n  <p>Isi</p>\n</section>\n');
  });

  it('emits a link with escaped attributes and label text', () => {
    const link = statement(workspace, 'html_link');
    link.setFieldValue('https://a.b', 'URL');
    link.setFieldValue('klik', 'LABEL');

    expect(generateHtml(workspace).bodyHtml).toBe('<a href="https://a.b">klik</a>\n');
  });

  it.each([
    ['javascript:alert(1)', ''],
    ['data:text/html,x', ''],
    ['vbscript:msgbox(1)', ''],
    ['http://a.b/c', 'http://a.b/c'],
    ['https://a.b/c', 'https://a.b/c'],
    ['mailto:a@b.c', 'mailto:a@b.c'],
    ['/page', '/page'],
    ['#top', '#top'],
    ['docs/page.html', 'docs/page.html'],
  ])('allows only safe link URLs: %s', (url, expected) => {
    const link = statement(workspace, 'html_link');
    link.setFieldValue(url, 'URL');
    link.setFieldValue('klik', 'LABEL');

    expect(generateHtml(workspace).bodyHtml).toBe(`<a href="${expected}">klik</a>\n`);
  });

  it.each([
    ['javascript:alert(1)', ''],
    ['data:text/html,x', ''],
    ['vbscript:msgbox(1)', ''],
    ['http://a.b/c.png', 'http://a.b/c.png'],
    ['https://a.b/c', 'https://a.b/c'],
    ['mailto:a@b.c', 'mailto:a@b.c'],
    ['/page', '/page'],
    ['#top', '#top'],
    ['images/photo.png', 'images/photo.png'],
  ])('allows only safe remote image URLs: %s', (url, expected) => {
    const image = statement(workspace, 'html_image_url');
    image.setFieldValue(url, 'URL');
    image.setFieldValue('gambar', 'ALT');

    expect(generateHtml(workspace).bodyHtml).toBe(`<img src="${expected}" alt="gambar">\n`);
  });

  it('trims leading whitespace and control characters before checking URL schemes', () => {
    const link = statement(workspace, 'html_link');
    link.setFieldValue('  \tJaVaScRiPt:alert(1)', 'URL');
    link.setFieldValue('klik', 'LABEL');

    expect(generateHtml(workspace).bodyHtml).toBe('<a href="">klik</a>\n');
  });

  it('escapes quotes and angle brackets in link fields', () => {
    const link = statement(workspace, 'html_link');
    link.setFieldValue('https://a.b/?q="<', 'URL');
    link.setFieldValue('"<', 'LABEL');

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<a href="https://a.b/?q=&quot;&lt;">&quot;&lt;</a>\n',
    );
  });

  it('escapes quotes and angle brackets in remote image fields', () => {
    const image = statement(workspace, 'html_image_url');
    image.setFieldValue('https://a.b/"<', 'URL');
    image.setFieldValue('" onerror="<', 'ALT');

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<img src="https://a.b/&quot;&lt;" alt="&quot; onerror=&quot;&lt;">\n',
    );
  });

  it('concatenates every top-level block into the body', () => {
    const first = statement(workspace, 'html_paragraph');
    connectText(first, 'pertama');
    const second = statement(workspace, 'html_paragraph');
    connectText(second, 'kedua');
    // two separate top-level stacks, first placed above second
    first.moveBy(0, 0);
    second.moveBy(0, 100);
    expect(generateHtml(workspace).bodyHtml).toBe('<p>pertama</p>\n<p>kedua</p>\n');
  });

  it('never emits child-entered script text as a live tag', () => {
    const paragraph = statement(workspace, 'html_paragraph');
    connectText(paragraph, '<script>alert(1)</script>');

    const result = generateHtml(workspace).bodyHtml;
    expect(result).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>\n');
    expect(result).not.toContain('<script>');
  });
  it('renders the full document skeleton via html_document', () => {
    const doc = statement(workspace, 'html_document');
    const head = statement(workspace, 'html_head');
    const title = statement(workspace, 'html_title');
    const body = statement(workspace, 'html_body');
    const p = statement(workspace, 'html_paragraph');
    connectText(title, 'Halaman Saya');
    connectText(p, 'Halo');
    connectStatement(body, 'CONTENT', p);
    connectStatement(head, 'CONTENT', title);
    append(head, body);
    connectStatement(doc, 'CONTENT', head);

    const out = generateHtml(workspace);
    expect(out.headHtml).toBe('<title>Halaman Saya</title>\n');
    expect(out.bodyHtml).toBe('<p>Halo</p>\n');
  });

  it('ignores loose top-level blocks when an html_document is present', () => {
    const doc = statement(workspace, 'html_document');
    const body = statement(workspace, 'html_body');
    const inside = statement(workspace, 'html_paragraph');
    connectText(inside, 'dipakai');
    connectStatement(body, 'CONTENT', inside);
    connectStatement(doc, 'CONTENT', body);

    const loose = statement(workspace, 'html_paragraph');
    connectText(loose, 'diabaikan');
    loose.moveBy(0, 200);

    const out = generateHtml(workspace);
    expect(out.bodyHtml).toBe('<p>dipakai</p>\n');
    expect(out.bodyHtml).not.toContain('diabaikan');
  });

  it('no html_document: headHtml is empty and body matches the flat output', () => {
    const first = statement(workspace, 'html_paragraph');
    connectText(first, 'a');
    const second = statement(workspace, 'html_paragraph');
    connectText(second, 'b');
    second.moveBy(0, 100);
    const out = generateHtml(workspace);
    expect(out.headHtml).toBe('');
    expect(out.bodyHtml).toBe('<p>a</p>\n<p>b</p>\n');
  });

  it('ignores a <body> or <title> placed in the body path', () => {
    const outerBody = statement(workspace, 'html_document');
    const b1 = statement(workspace, 'html_body');
    const nestedBody = statement(workspace, 'html_body');
    const title = statement(workspace, 'html_title');
    const p = statement(workspace, 'html_paragraph');
    connectText(title, 'x');
    connectText(p, 'ok');
    append(p, nestedBody);
    append(nestedBody, title);
    connectStatement(b1, 'CONTENT', p);
    connectStatement(outerBody, 'CONTENT', b1);
    expect(generateHtml(workspace).bodyHtml).toBe('<p>ok</p>\n');
  });

  it('emits a flex row div with the chosen justify-content and always flex-wrap:wrap', () => {
    const row = statement(workspace, 'html_row');
    row.setFieldValue('space-between', 'JUSTIFY');
    const first = statement(workspace, 'html_paragraph');
    const second = statement(workspace, 'html_paragraph');
    connectText(first, 'A');
    connectText(second, 'B');
    append(first, second);
    connectStatement(row, 'BODY', first);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap">\n' +
        '  <p>A</p>\n  <p>B</p>\n' +
        '</div>\n',
    );
  });

  it('defaults an unrecognised JUSTIFY value to flex-start', () => {
    const row = statement(workspace, 'html_row');
    row.setFieldValue('nonsense', 'JUSTIFY');

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<div style="display:flex;justify-content:flex-start;flex-wrap:wrap">\n</div>\n',
    );
  });
});
