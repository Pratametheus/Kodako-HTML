import * as Blockly from 'blockly/core';
import './theme.css';

export const CATEGORY_COLORS: Record<'structure' | 'content' | 'style', string> = {
  structure: '#1E88E5',
  content: '#43A047',
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
    content_blocks: blockStyle('content'),
    style_blocks: blockStyle('style'),
  },
  categoryStyles: {
    structure_category: { colour: CATEGORY_COLORS.structure },
    content_category: { colour: CATEGORY_COLORS.content },
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
