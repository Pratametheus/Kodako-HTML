import * as Blockly from 'blockly/core';
import './theme.css';

export type CategoryKey = 'structure' | 'text' | 'table' | 'media' | 'form' | 'style';

export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  structure: '#1E88E5',
  text: '#FB8C00',
  table: '#00ACC1',
  media: '#43A047',
  form: '#7C3AED',
  style: '#8E24AA',
};

const shade = (hex: string, amount: number): string => {
  const target = amount > 0 ? 255 : 0;
  const ratio = Math.abs(amount);
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels
    .map((channel) =>
      Math.round(channel + (target - channel) * ratio)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
};

const blockStyle = (name: keyof typeof CATEGORY_COLORS) => ({
  colourPrimary: CATEGORY_COLORS[name],
  colourSecondary: shade(CATEGORY_COLORS[name], 0.12),
  colourTertiary: shade(CATEGORY_COLORS[name], -0.2),
});

export const blocklyTheme = Blockly.Theme.defineTheme('kodako-html', {
  name: 'kodako-html',
  base: Blockly.Themes.Classic,
  blockStyles: {
    structure_blocks: blockStyle('structure'),
    text_blocks: blockStyle('text'),
    table_blocks: blockStyle('table'),
    media_blocks: blockStyle('media'),
    form_blocks: blockStyle('form'),
    style_blocks: blockStyle('style'),
  },
  categoryStyles: {
    structure_category: { colour: CATEGORY_COLORS.structure },
    text_category: { colour: CATEGORY_COLORS.text },
    table_category: { colour: CATEGORY_COLORS.table },
    media_category: { colour: CATEGORY_COLORS.media },
    form_category: { colour: CATEGORY_COLORS.form },
    style_category: { colour: CATEGORY_COLORS.style },
  },
  fontStyle: {
    family: 'system-ui, "Segoe UI", Roboto, sans-serif',
    size: 12,
    weight: '600',
  },
  componentStyles: {
    workspaceBackgroundColour: '#f7f8fb',
    toolboxBackgroundColour: '#ffffff',
    toolboxForegroundColour: '#3b3b48',
    flyoutBackgroundColour: '#eef0f5',
    flyoutForegroundColour: '#3b3b48',
    flyoutOpacity: 1,
    scrollbarColour: '#c8ccd8',
    scrollbarOpacity: 0.6,
    insertionMarkerColour: '#1e88e5',
    insertionMarkerOpacity: 0.4,
    cursorColour: '#1e88e5',
  },
  startHats: true,
});
