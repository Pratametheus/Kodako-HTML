import * as Blockly from 'blockly/core';
import './theme.css';

export const CATEGORY_COLORS: Record<
  | 'events'
  | 'motion'
  | 'looks'
  | 'sound'
  | 'control'
  | 'operators'
  | 'sensing'
  | 'variables'
  | 'structure'
  | 'content'
  | 'style',
  string
> = {
  events: '#FFBF00',
  motion: '#4C97FF',
  looks: '#9966FF',
  sound: '#CF63CF',
  control: '#FFAB19',
  operators: '#59C059',
  sensing: '#5CB1D6',
  variables: '#FF8C1A',
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

const blockStyle = (name: keyof typeof CATEGORY_COLORS, hat?: string) => ({
  colourPrimary: CATEGORY_COLORS[name],
  colourSecondary: shade(CATEGORY_COLORS[name], 0.12),
  colourTertiary: shade(CATEGORY_COLORS[name], -0.2),
  ...(hat ? { hat } : {}),
});

export const spriteTheme = Blockly.Theme.defineTheme('kodako-sprite', {
  name: 'kodako-sprite',
  base: Blockly.Themes.Classic,
  blockStyles: {
    events_blocks: blockStyle('events', 'cap'),
    motion_blocks: blockStyle('motion'),
    looks_blocks: blockStyle('looks'),
    sound_blocks: blockStyle('sound'),
    control_blocks: blockStyle('control'),
    operators_blocks: blockStyle('operators'),
    sensing_blocks: blockStyle('sensing'),
    variables_blocks: blockStyle('variables'),
    structure_blocks: blockStyle('structure'),
    content_blocks: blockStyle('content'),
    style_blocks: blockStyle('style'),
  },
  categoryStyles: {
    events_category: { colour: CATEGORY_COLORS.events },
    motion_category: { colour: CATEGORY_COLORS.motion },
    looks_category: { colour: CATEGORY_COLORS.looks },
    sound_category: { colour: CATEGORY_COLORS.sound },
    control_category: { colour: CATEGORY_COLORS.control },
    operators_category: { colour: CATEGORY_COLORS.operators },
    sensing_category: { colour: CATEGORY_COLORS.sensing },
    variables_category: { colour: CATEGORY_COLORS.variables },
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

export { spriteTheme as blocklyTheme };
