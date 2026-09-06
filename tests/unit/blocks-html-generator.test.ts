import { beforeEach, describe, expect, it } from 'vitest';
import {
  Blockly,
  generateHtml,
  installHtmlBlockly,
  setHtmlAssetOptionsProvider,
} from '../../src/blocks';

installHtmlBlockly();

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
    expect(generateHtml(workspace)).toEqual({ bodyHtml: '', assetIds: [] });
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

    expect(generateHtml(workspace).bodyHtml).toBe('<div>\n  <p>A</p>\n  <p>B</p>\n</div>\n');
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

  it('applies style wrappers directly to section and list opening tags', () => {
    const bold = statement(workspace, 'html_style_bold');
    const section = statement(workspace, 'html_section');
    const italic = statement(workspace, 'html_style_italic');
    const list = statement(workspace, 'html_list');
    connectStatement(bold, 'BODY', section);
    connectStatement(italic, 'BODY', list);
    append(bold, italic);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<div style="font-weight:bold">\n</div>\n<ul style="font-style:italic">\n</ul>\n',
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
      bodyHtml: '<img src="asset:img_1" alt="Kucing &lt;x&gt;">\n',
      assetIds: ['img_1'],
    });
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

    expect(generateHtml(workspace).bodyHtml).toBe('<div>\n  <p>Isi</p>\n</div>\n');
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
});
