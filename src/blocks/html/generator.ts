import type * as Blockly from 'blockly/core';
import { escapeHtmlAttr, escapeHtmlText } from '../../runtime/html/escape';

export type GeneratedHtml = {
  headHtml: string;
  bodyHtml: string;
  assetIds: string[];
};

const HEADING_LEVELS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
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
const JUSTIFY_VALUES = new Set([
  'flex-start',
  'center',
  'flex-end',
  'space-between',
  'space-around',
]);
const SPACING_SIZES = new Set(['8px', '16px', '32px']);
const RADIUS_SIZES = new Set(['8px', '16px', '9999px']);
const FONTS = new Set(['inherit', 'Georgia, serif', '"Courier New", monospace']);
const BORDER_WIDTHS = new Set(['1px', '2px', '4px', '0']);
const BORDER_STYLES = new Set(['solid', 'dashed', 'dotted']);
const LIST_TYPES = new Set(['1', 'A', 'a', 'I', 'i']);

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

function safeUrl(raw: string): string {
  let start = 0;
  while (start < raw.length) {
    const character = raw[start] ?? '';
    const code = raw.charCodeAt(start);
    const isControl = code <= 0x20 || (code >= 0x7f && code <= 0x9f);
    if (!isControl && !/\s/u.test(character)) break;
    start += 1;
  }
  const value = raw.slice(start);
  if (/^(?:https?|mailto):/i.test(value)) return value;
  if (value.startsWith('/') || value.startsWith('#')) return value;

  const delimiterIndex = value.search(/[/?#]/);
  const schemeCandidate = delimiterIndex === -1 ? value : value.slice(0, delimiterIndex);
  return schemeCandidate.includes(':') ? '' : value;
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

function withStyles(html: string, fragments: string[]): string {
  return fragments.length > 0 ? withStyle(html, fragments.join(';')) : html;
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
    case 'html_style_padding': {
      const value = field(block, 'SIZE');
      return `padding:${SPACING_SIZES.has(value) ? value : '8px'}`;
    }
    case 'html_style_margin': {
      const value = field(block, 'SIZE');
      return `margin:${SPACING_SIZES.has(value) ? value : '8px'}`;
    }
    case 'html_style_radius': {
      const value = field(block, 'SIZE');
      return `border-radius:${RADIUS_SIZES.has(value) ? value : '8px'}`;
    }
    case 'html_style_shadow':
      return 'box-shadow:0 4px 10px rgba(30,41,80,.15)';
    case 'html_style_font': {
      const value = field(block, 'FONT');
      return `font-family:${FONTS.has(value) ? value : 'inherit'}`;
    }
    default:
      return '';
  }
}

function emitChain(
  block: Blockly.Block | null,
  depth: number,
  assetIds: string[],
  styleFragments: string[] = [],
): string {
  let html = '';
  let current = block;
  while (current) {
    html += emitBlock(current, depth, assetIds, styleFragments);
    current = current.getNextBlock();
  }
  return html;
}

function emitContainer(
  block: Blockly.Block,
  inputName: string,
  tag:
    | 'section'
    | 'ul'
    | 'ol'
    | 'header'
    | 'main'
    | 'footer'
    | 'div'
    | 'tr'
    | 'nav'
    | 'blockquote'
    | 'figure',
  depth: number,
  assetIds: string[],
  styleFragments: string[],
  attrs = '',
): string {
  const prefix = indent(depth);
  const children = emitChain(block.getInputTargetBlock(inputName), depth + 1, assetIds);
  return withStyles(`${prefix}<${tag}${attrs}>\n${children}${prefix}</${tag}>\n`, styleFragments);
}

function tableBorderFragment(block: Blockly.Block): string {
  const width = field(block, 'BORDER_WIDTH');
  const w = BORDER_WIDTHS.has(width) ? width : '1px';
  if (w === '0') return '';
  const style = field(block, 'BORDER_STYLE');
  const s = BORDER_STYLES.has(style) ? style : 'solid';
  const color = field(block, 'BORDER_COLOR');
  const c = COLORS.has(color) ? color : '#000000';
  return `border:${w} ${s} ${c}`;
}

const TABLE_STYLE_BLOCK_TYPES = new Set([
  'html_style_color',
  'html_style_bg',
  'html_style_align',
  'html_style_size',
  'html_style_bold',
  'html_style_italic',
  'html_style_padding',
  'html_style_margin',
  'html_style_radius',
  'html_style_shadow',
  'html_style_font',
]);

const TABLE_CELL_TAGS: Record<string, 'td' | 'th'> = {
  html_table_cell: 'td',
  html_table_header_cell: 'th',
};

function emitTableCellChain(
  block: Blockly.Block | null,
  depth: number,
  assetIds: string[],
  cellBorder: string,
  styleFragments: string[] = [],
): string {
  let html = '';
  let current = block;
  while (current) {
    const cellTag = TABLE_CELL_TAGS[current.type];
    if (cellTag) {
      const fragments = cellBorder ? [...styleFragments, cellBorder] : styleFragments;
      html += withStyles(
        `${indent(depth)}<${cellTag}>${textInput(current, 'TEXT')}</${cellTag}>\n`,
        fragments,
      );
    } else if (TABLE_STYLE_BLOCK_TYPES.has(current.type)) {
      const child = current.getInputTargetBlock('BODY');
      if (child) {
        html += emitTableCellChain(child, depth, assetIds, cellBorder, [
          ...styleFragments,
          styleFragment(current),
        ]);
      }
    } else {
      html += emitBlock(current, depth, assetIds, styleFragments);
    }
    current = current.getNextBlock();
  }
  return html;
}

function emitTableRow(
  block: Blockly.Block,
  depth: number,
  assetIds: string[],
  cellBorder: string,
  styleFragments: string[],
): string {
  const prefix = indent(depth);
  const cells = emitTableCellChain(
    block.getInputTargetBlock('CELLS'),
    depth + 1,
    assetIds,
    cellBorder,
  );
  return withStyles(`${prefix}<tr>\n${cells}${prefix}</tr>\n`, styleFragments);
}

function emitTableRowChain(
  block: Blockly.Block | null,
  depth: number,
  assetIds: string[],
  cellBorder: string,
  styleFragments: string[] = [],
): string {
  let html = '';
  let current = block;
  while (current) {
    if (current.type === 'html_table_row') {
      html += emitTableRow(current, depth, assetIds, cellBorder, styleFragments);
    } else if (TABLE_STYLE_BLOCK_TYPES.has(current.type)) {
      const child = current.getInputTargetBlock('BODY');
      if (child) {
        html += emitTableRowChain(child, depth, assetIds, cellBorder, [
          ...styleFragments,
          styleFragment(current),
        ]);
      }
    } else {
      html += emitBlock(current, depth, assetIds, styleFragments);
    }
    current = current.getNextBlock();
  }
  return html;
}

function emitTable(
  block: Blockly.Block,
  depth: number,
  assetIds: string[],
  styleFragments: string[],
): string {
  const prefix = indent(depth);
  const border = tableBorderFragment(block);
  const tableFragments = border
    ? [...styleFragments, 'border-collapse:collapse', border]
    : styleFragments;
  const rows = emitTableRowChain(block.getInputTargetBlock('ROWS'), depth + 1, assetIds, border);
  return withStyles(`${prefix}<table>\n${rows}${prefix}</table>\n`, tableFragments);
}

function emitBlock(
  block: Blockly.Block,
  depth: number,
  assetIds: string[],
  styleFragments: string[],
): string {
  const prefix = indent(depth);
  switch (block.type) {
    case 'html_document':
    case 'html_head':
    case 'html_body':
    case 'html_title':
      return '';
    case 'html_section':
      return emitContainer(block, 'BODY', 'section', depth, assetIds, styleFragments);
    case 'html_row': {
      const justify = field(block, 'JUSTIFY');
      const value = JUSTIFY_VALUES.has(justify) ? justify : 'flex-start';
      const fragment = `display:flex;justify-content:${value};flex-wrap:wrap`;
      return emitContainer(block, 'BODY', 'div', depth, assetIds, [...styleFragments, fragment]);
    }
    case 'html_list':
      return emitContainer(block, 'ITEMS', 'ul', depth, assetIds, styleFragments);
    case 'html_table':
      return emitTable(block, depth, assetIds, styleFragments);
    case 'html_table_row':
      return emitContainer(block, 'CELLS', 'tr', depth, assetIds, styleFragments);
    case 'html_table_cell':
      return withStyles(`${prefix}<td>${textInput(block, 'TEXT')}</td>\n`, styleFragments);
    case 'html_table_header_cell':
      return withStyles(`${prefix}<th>${textInput(block, 'TEXT')}</th>\n`, styleFragments);
    case 'html_caption':
      return withStyles(
        `${prefix}<caption>${textInput(block, 'TEXT')}</caption>\n`,
        styleFragments,
      );
    case 'html_list_ordered': {
      const type = field(block, 'TYPE');
      const typeAttr = LIST_TYPES.has(type) && type !== '1' ? ` type="${type}"` : '';
      const start = Number(field(block, 'START'));
      const startAttr = Number.isFinite(start) && start !== 1 ? ` start="${start}"` : '';
      return emitContainer(
        block,
        'ITEMS',
        'ol',
        depth,
        assetIds,
        styleFragments,
        `${typeAttr}${startAttr}`,
      );
    }
    case 'html_header':
      return emitContainer(block, 'BODY', 'header', depth, assetIds, styleFragments);
    case 'html_main':
      return emitContainer(block, 'BODY', 'main', depth, assetIds, styleFragments);
    case 'html_footer':
      return emitContainer(block, 'BODY', 'footer', depth, assetIds, styleFragments);
    case 'html_nav':
      return emitContainer(block, 'BODY', 'nav', depth, assetIds, styleFragments);
    case 'html_blockquote':
      return emitContainer(block, 'BODY', 'blockquote', depth, assetIds, styleFragments);
    case 'html_figure':
      return emitContainer(block, 'BODY', 'figure', depth, assetIds, styleFragments);
    case 'html_figcaption':
      return withStyles(
        `${prefix}<figcaption>${textInput(block, 'TEXT')}</figcaption>\n`,
        styleFragments,
      );
    case 'html_heading': {
      const requestedLevel = field(block, 'LEVEL');
      const level = HEADING_LEVELS.has(requestedLevel) ? requestedLevel : 'h1';
      return withStyles(
        `${prefix}<${level}>${textInput(block, 'TEXT')}</${level}>\n`,
        styleFragments,
      );
    }
    case 'html_paragraph':
      return withStyles(`${prefix}<p>${textInput(block, 'TEXT')}</p>\n`, styleFragments);
    case 'html_list_item':
      return withStyles(`${prefix}<li>${textInput(block, 'TEXT')}</li>\n`, styleFragments);
    case 'html_text':
      return `${prefix}${escapeHtmlText(field(block, 'VALUE'))}\n`;
    case 'html_image_asset': {
      const assetId = field(block, 'ASSET');
      if (assetId) assetIds.push(assetId);
      const width = Number(field(block, 'WIDTH'));
      const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${width}"` : '';
      return withStyles(
        `${prefix}<img src="${escapeHtmlAttr(`asset:${assetId}`)}" alt="${escapeHtmlAttr(field(block, 'ALT'))}"${widthAttr}>\n`,
        styleFragments,
      );
    }
    case 'html_image_url': {
      const width = Number(field(block, 'WIDTH'));
      const widthAttr = Number.isFinite(width) && width > 0 ? ` width="${width}"` : '';
      return withStyles(
        `${prefix}<img src="${escapeHtmlAttr(safeUrl(field(block, 'URL')))}" alt="${escapeHtmlAttr(field(block, 'ALT'))}"${widthAttr}>\n`,
        styleFragments,
      );
    }
    case 'html_link': {
      const newTab = field(block, 'NEW_TAB') === 'TRUE';
      const targetAttr = newTab ? ' target="_blank"' : '';
      return withStyles(
        `${prefix}<a href="${escapeHtmlAttr(safeUrl(field(block, 'URL')))}"${targetAttr}>${escapeHtmlText(field(block, 'LABEL'))}</a>\n`,
        styleFragments,
      );
    }
    case 'html_button':
      return withStyles(
        `${prefix}<button type="button">${textInput(block, 'TEXT')}</button>\n`,
        styleFragments,
      );
    case 'html_hr':
      return withStyles(`${prefix}<hr>\n`, styleFragments);
    case 'html_br':
      return withStyles(`${prefix}<br>\n`, styleFragments);
    case 'html_style_color':
    case 'html_style_bg':
    case 'html_style_align':
    case 'html_style_size':
    case 'html_style_bold':
    case 'html_style_italic':
    case 'html_style_padding':
    case 'html_style_margin':
    case 'html_style_radius':
    case 'html_style_shadow':
    case 'html_style_font': {
      const child = block.getInputTargetBlock('BODY');
      if (!child) return '';
      return emitChain(child, depth, assetIds, [...styleFragments, styleFragment(block)]);
    }
    default:
      return '';
  }
}

function firstChildOfType(
  block: Blockly.Block,
  inputName: string,
  type: string,
): Blockly.Block | null {
  let current = block.getInputTargetBlock(inputName);
  while (current) {
    if (current.type === type) return current;
    current = current.getNextBlock();
  }
  return null;
}

function emitHead(headBlock: Blockly.Block): string {
  const title = firstChildOfType(headBlock, 'CONTENT', 'html_title');
  if (!title) return '';
  return `<title>${escapeHtmlText(textInput(title, 'TEXT'))}</title>\n`;
}

export function generateHtml(workspace: Blockly.Workspace): GeneratedHtml {
  const assetIds: string[] = [];
  const top = workspace.getTopBlocks(true);
  const doc = top.find((b) => b.type === 'html_document') ?? null;

  if (doc) {
    const head = firstChildOfType(doc, 'CONTENT', 'html_head');
    const body = firstChildOfType(doc, 'CONTENT', 'html_body');
    const headHtml = head ? emitHead(head) : '';
    const bodyHtml = body ? emitChain(body.getInputTargetBlock('CONTENT'), 0, assetIds) : '';
    return { headHtml, bodyHtml, assetIds };
  }

  let bodyHtml = '';
  for (const block of top) {
    bodyHtml += emitChain(block, 0, assetIds);
  }
  return { headHtml: '', bodyHtml, assetIds };
}
