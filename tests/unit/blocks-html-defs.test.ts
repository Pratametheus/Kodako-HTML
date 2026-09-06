import { describe, expect, it } from 'vitest';
import { Blockly, installHtmlBlockly } from '../../src/blocks';
import { HTML_BLOCK_TYPES } from '../../src/blocks/html/blocks';
import { htmlToolbox } from '../../src/blocks/html/toolbox';

installHtmlBlockly();
installHtmlBlockly();

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
  it('button shows <button> … </button>', () => {
    expect(message0('html_button')).toContain('<button>');
  });
  it('hr shows <hr>', () => {
    expect(message0('html_hr')).toContain('<hr>');
  });
  it('heading level dropdown labels are the h-tags', () => {
    const ws = new Blockly.Workspace();
    const b = ws.newBlock('html_heading');
    const dropdown = b.getField('LEVEL')!;
    const options = (dropdown as unknown as { getOptions: () => [string, string][] }).getOptions();
    expect(options.map((o) => o[0])).toEqual(['<h1>', '<h2>', '<h3>']);
    expect(options.map((o) => o[1])).toEqual(['h1', 'h2', 'h3']); // values unchanged
    ws.dispose();
  });
});
