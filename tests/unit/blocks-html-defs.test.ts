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
  it('style blocks keep friendly Indonesian labels', () => {
    expect(message0('html_style_color')).toContain('warna teks');
    expect(message0('html_style_bold')).toContain('tebal');
  });
});
