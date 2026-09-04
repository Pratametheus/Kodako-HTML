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

  it('returns an empty result without a page root', () => {
    expect(generateHtml(workspace)).toEqual({ bodyHtml: '', assetIds: [] });
  });

  it('emits escaped paragraph text exactly', () => {
    const page = statement(workspace, 'html_page');
    const paragraph = statement(workspace, 'html_paragraph');
    connectText(paragraph, 'Halo <b>');
    connectStatement(page, 'BODY', paragraph);

    expect(generateHtml(workspace).bodyHtml).toBe('<p>Halo &lt;b&gt;</p>\n');
  });

  it('emits the selected heading level', () => {
    const page = statement(workspace, 'html_page');
    const heading = statement(workspace, 'html_heading');
    heading.setFieldValue('h1', 'LEVEL');
    connectText(heading, 'Judul');
    connectStatement(page, 'BODY', heading);

    expect(generateHtml(workspace).bodyHtml).toBe('<h1>Judul</h1>\n');
  });

  it('indents section children by two spaces', () => {
    const page = statement(workspace, 'html_page');
    const section = statement(workspace, 'html_section');
    const first = statement(workspace, 'html_paragraph');
    const second = statement(workspace, 'html_paragraph');
    connectText(first, 'A');
    connectText(second, 'B');
    append(first, second);
    connectStatement(section, 'BODY', first);
    connectStatement(page, 'BODY', section);

    expect(generateHtml(workspace).bodyHtml).toBe('<div>\n  <p>A</p>\n  <p>B</p>\n</div>\n');
  });

  it('emits an indented unordered list', () => {
    const page = statement(workspace, 'html_page');
    const list = statement(workspace, 'html_list');
    const first = statement(workspace, 'html_list_item');
    const second = statement(workspace, 'html_list_item');
    connectText(first, 'x');
    connectText(second, 'y');
    append(first, second);
    connectStatement(list, 'ITEMS', first);
    connectStatement(page, 'BODY', list);

    expect(generateHtml(workspace).bodyHtml).toBe('<ul>\n  <li>x</li>\n  <li>y</li>\n</ul>\n');
  });

  it('composes nested style wrappers onto the child element', () => {
    const page = statement(workspace, 'html_page');
    const bold = statement(workspace, 'html_style_bold');
    const color = statement(workspace, 'html_style_color');
    const paragraph = statement(workspace, 'html_paragraph');
    color.setFieldValue('#e53935', 'COLOR');
    connectText(paragraph, 'Hai');
    connectStatement(color, 'BODY', paragraph);
    connectStatement(bold, 'BODY', color);
    connectStatement(page, 'BODY', bold);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<p style="font-weight:bold;color:#e53935">Hai</p>\n',
    );
  });

  it('emits nothing for an empty style wrapper', () => {
    const page = statement(workspace, 'html_page');
    connectStatement(page, 'BODY', statement(workspace, 'html_style_bold'));
    expect(generateHtml(workspace).bodyHtml).toBe('');
  });

  it('emits and tracks an asset image while escaping alt text', () => {
    const page = statement(workspace, 'html_page');
    const image = statement(workspace, 'html_image_asset');
    image.setFieldValue('img_1', 'ASSET');
    image.setFieldValue('Kucing <x>', 'ALT');
    connectStatement(page, 'BODY', image);

    expect(generateHtml(workspace)).toEqual({
      bodyHtml: '<img src="asset:img_1" alt="Kucing &lt;x&gt;">\n',
      assetIds: ['img_1'],
    });
  });

  it('emits a link with escaped attributes and label text', () => {
    const page = statement(workspace, 'html_page');
    const link = statement(workspace, 'html_link');
    link.setFieldValue('https://a.b', 'URL');
    link.setFieldValue('klik', 'LABEL');
    connectStatement(page, 'BODY', link);

    expect(generateHtml(workspace).bodyHtml).toBe('<a href="https://a.b">klik</a>\n');
  });

  it.each([
    ['javascript:alert(1)', ''],
    ['data:text/html,x', ''],
    ['https://a.b/c', 'https://a.b/c'],
    ['mailto:a@b.c', 'mailto:a@b.c'],
    ['/page', '/page'],
    ['#top', '#top'],
  ])('allows only safe link URLs: %s', (url, expected) => {
    const page = statement(workspace, 'html_page');
    const link = statement(workspace, 'html_link');
    link.setFieldValue(url, 'URL');
    link.setFieldValue('klik', 'LABEL');
    connectStatement(page, 'BODY', link);

    expect(generateHtml(workspace).bodyHtml).toBe(`<a href="${expected}">klik</a>\n`);
  });

  it.each([
    ['javascript:alert(1)', ''],
    ['data:text/html,x', ''],
    ['https://a.b/c', 'https://a.b/c'],
    ['mailto:a@b.c', 'mailto:a@b.c'],
    ['/page', '/page'],
    ['#top', '#top'],
  ])('allows only safe remote image URLs: %s', (url, expected) => {
    const page = statement(workspace, 'html_page');
    const image = statement(workspace, 'html_image_url');
    image.setFieldValue(url, 'URL');
    image.setFieldValue('gambar', 'ALT');
    connectStatement(page, 'BODY', image);

    expect(generateHtml(workspace).bodyHtml).toBe(`<img src="${expected}" alt="gambar">\n`);
  });

  it('trims leading whitespace and control characters before checking URL schemes', () => {
    const page = statement(workspace, 'html_page');
    const link = statement(workspace, 'html_link');
    link.setFieldValue('\u0000 \tJaVaScRiPt:alert(1)', 'URL');
    link.setFieldValue('klik', 'LABEL');
    connectStatement(page, 'BODY', link);

    expect(generateHtml(workspace).bodyHtml).toBe('<a href="">klik</a>\n');
  });

  it('escapes quotes and angle brackets in link fields', () => {
    const page = statement(workspace, 'html_page');
    const link = statement(workspace, 'html_link');
    link.setFieldValue('https://a.b/?q="<', 'URL');
    link.setFieldValue('"<', 'LABEL');
    connectStatement(page, 'BODY', link);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<a href="https://a.b/?q=&quot;&lt;">&quot;&lt;</a>\n',
    );
  });

  it('escapes quotes and angle brackets in remote image fields', () => {
    const page = statement(workspace, 'html_page');
    const image = statement(workspace, 'html_image_url');
    image.setFieldValue('https://a.b/"<', 'URL');
    image.setFieldValue('" onerror="<', 'ALT');
    connectStatement(page, 'BODY', image);

    expect(generateHtml(workspace).bodyHtml).toBe(
      '<img src="https://a.b/&quot;&lt;" alt="&quot; onerror=&quot;&lt;">\n',
    );
  });

  it('uses only the first page root', () => {
    const firstPage = statement(workspace, 'html_page');
    const firstParagraph = statement(workspace, 'html_paragraph');
    connectText(firstParagraph, 'pertama');
    connectStatement(firstPage, 'BODY', firstParagraph);
    const secondPage = statement(workspace, 'html_page');
    const secondParagraph = statement(workspace, 'html_paragraph');
    connectText(secondParagraph, 'kedua');
    connectStatement(secondPage, 'BODY', secondParagraph);

    expect(generateHtml(workspace).bodyHtml).toBe('<p>pertama</p>\n');
  });

  it('never emits child-entered script text as a live tag', () => {
    const page = statement(workspace, 'html_page');
    const paragraph = statement(workspace, 'html_paragraph');
    connectText(paragraph, '<script>alert(1)</script>');
    connectStatement(page, 'BODY', paragraph);

    const result = generateHtml(workspace).bodyHtml;
    expect(result).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>\n');
    expect(result).not.toContain('<script>');
  });
});
