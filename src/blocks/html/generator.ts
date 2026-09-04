import type * as Blockly from 'blockly/core';
import { escapeHtmlAttr, escapeHtmlText } from '../../runtime/html/escape';

export type GeneratedHtml = {
  bodyHtml: string;
  assetIds: string[];
};

const HEADING_LEVELS = new Set(['h1', 'h2', 'h3']);
const COLORS = new Set([
  '#000000',
  '#ffffff',
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#1e88e5',
  '#8e24aa',
  '#ec407a',
  '#9e9e9e',
]);
const ALIGNS = new Set(['left', 'center', 'right']);
const FONT_SIZES = new Set(['0.85rem', '1rem', '1.5rem']);

export function registerHtmlGenerator(): void {
  // Registration is intentionally a no-op: generateHtml is a tree walker.
}

function indent(depth: number): string {
  return '  '.repeat(depth);
}

function field(block: Blockly.Block, name: string): string {
  return String(block.getFieldValue(name) ?? '');
}

function textInput(block: Blockly.Block, inputName: string): string {
  const target = block.getInputTargetBlock(inputName);
  if (!target) return escapeHtmlText(field(block, inputName));
  const value =
    target.type === 'html_text'
      ? field(target, 'VALUE')
      : field(target, 'TEXT') || field(target, 'VALUE');
  return escapeHtmlText(value);
}

function withStyle(html: string, fragment: string): string {
  const openingTag = /^(\s*<[a-z][\w-]*)([^>]*)(>)/i;
  return html.replace(openingTag, (_match, start: string, attributes: string, end: string) => {
    const styleAttribute = /\sstyle="([^"]*)"/;
    if (styleAttribute.test(attributes)) {
      const merged = attributes.replace(styleAttribute, (_style, existing: string) => {
        return ` style="${fragment};${existing}"`;
      });
      return `${start}${merged}${end}`;
    }
    return `${start}${attributes} style="${fragment}"${end}`;
  });
}

function styleFragment(block: Blockly.Block): string {
  switch (block.type) {
    case 'html_style_color': {
      const value = field(block, 'COLOR');
      return `color:${COLORS.has(value) ? value : '#000000'}`;
    }
    case 'html_style_bg': {
      const value = field(block, 'COLOR');
      return `background:${COLORS.has(value) ? value : '#000000'}`;
    }
    case 'html_style_align': {
      const value = field(block, 'ALIGN');
      return `text-align:${ALIGNS.has(value) ? value : 'center'}`;
    }
    case 'html_style_size': {
      const value = field(block, 'SIZE');
      return `font-size:${FONT_SIZES.has(value) ? value : '1rem'}`;
    }
    case 'html_style_bold':
      return 'font-weight:bold';
    case 'html_style_italic':
      return 'font-style:italic';
    default:
      return '';
  }
}

function emitChain(block: Blockly.Block | null, depth: number, assetIds: string[]): string {
  let html = '';
  let current = block;
  while (current) {
    html += emitBlock(current, depth, assetIds);
    current = current.getNextBlock();
  }
  return html;
}

function emitContainer(
  block: Blockly.Block,
  inputName: string,
  tag: 'div' | 'ul',
  depth: number,
  assetIds: string[],
): string {
  const prefix = indent(depth);
  const children = emitChain(block.getInputTargetBlock(inputName), depth + 1, assetIds);
  return `${prefix}<${tag}>\n${children}${prefix}</${tag}>\n`;
}

function emitBlock(block: Blockly.Block, depth: number, assetIds: string[]): string {
  const prefix = indent(depth);
  switch (block.type) {
    case 'html_section':
      return emitContainer(block, 'BODY', 'div', depth, assetIds);
    case 'html_list':
      return emitContainer(block, 'ITEMS', 'ul', depth, assetIds);
    case 'html_heading': {
      const requestedLevel = field(block, 'LEVEL');
      const level = HEADING_LEVELS.has(requestedLevel) ? requestedLevel : 'h1';
      return `${prefix}<${level}>${textInput(block, 'TEXT')}</${level}>\n`;
    }
    case 'html_paragraph':
      return `${prefix}<p>${textInput(block, 'TEXT')}</p>\n`;
    case 'html_list_item':
      return `${prefix}<li>${textInput(block, 'TEXT')}</li>\n`;
    case 'html_text':
      return `${prefix}${escapeHtmlText(field(block, 'VALUE'))}\n`;
    case 'html_image_asset': {
      const assetId = field(block, 'ASSET');
      if (assetId) assetIds.push(assetId);
      return `${prefix}<img src="${escapeHtmlAttr(`asset:${assetId}`)}" alt="${escapeHtmlAttr(field(block, 'ALT'))}">\n`;
    }
    case 'html_image_url':
      return `${prefix}<img src="${escapeHtmlAttr(field(block, 'URL'))}" alt="${escapeHtmlAttr(field(block, 'ALT'))}">\n`;
    case 'html_link':
      return `${prefix}<a href="${escapeHtmlAttr(field(block, 'URL'))}">${escapeHtmlText(field(block, 'LABEL'))}</a>\n`;
    case 'html_button':
      return `${prefix}<button type="button">${textInput(block, 'TEXT')}</button>\n`;
    case 'html_hr':
      return `${prefix}<hr>\n`;
    case 'html_style_color':
    case 'html_style_bg':
    case 'html_style_align':
    case 'html_style_size':
    case 'html_style_bold':
    case 'html_style_italic': {
      const child = block.getInputTargetBlock('BODY');
      if (!child) return '';
      return withStyle(emitChain(child, depth, assetIds), styleFragment(block));
    }
    default:
      return '';
  }
}

export function generateHtml(workspace: Blockly.Workspace): GeneratedHtml {
  const page = workspace.getTopBlocks(false).find((block) => block.type === 'html_page');
  if (!page) return { bodyHtml: '', assetIds: [] };

  const assetIds: string[] = [];
  return {
    bodyHtml: emitChain(page.getInputTargetBlock('BODY'), 0, assetIds),
    assetIds,
  };
}
