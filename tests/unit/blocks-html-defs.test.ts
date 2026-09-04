import { describe, expect, it } from 'vitest';
import { Blockly, installHtmlBlockly } from '../../src/blocks';
import { HTML_BLOCK_TYPES } from '../../src/blocks/html/blocks';
import { htmlToolbox } from '../../src/blocks/html/toolbox';

installHtmlBlockly();
installHtmlBlockly();

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

  it('uses a Bahasa Indonesia caption for headings', () => {
    const workspace = new Blockly.Workspace();
    const heading = workspace.newBlock('html_heading');
    const caption = heading.inputList
      .flatMap((input) => input.fieldRow.map((field) => field.getText()))
      .join(' ');
    expect(caption).toMatch(/judul/i);
    workspace.dispose();
  });

  it('exposes structure, content, and style toolbox categories', () => {
    const toolboxJson = JSON.stringify(htmlToolbox);
    for (const category of ['structure_category', 'content_category', 'style_category']) {
      expect(toolboxJson).toContain(category);
    }
  });
});
