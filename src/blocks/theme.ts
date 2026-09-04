import * as Blockly from 'blockly/core';

export const CATEGORY_COLORS: Record<
  | 'events'
  | 'motion'
  | 'looks'
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
  control: '#FFAB19',
  operators: '#59C059',
  sensing: '#5CB1D6',
  variables: '#FF8C1A',
  structure: '#1E88E5',
  content: '#43A047',
  style: '#8E24AA',
};

export const spriteTheme = Blockly.Theme.defineTheme('kodako-sprite', {
  name: 'kodako-sprite',
  base: Blockly.Themes.Classic,
  blockStyles: {
    events_blocks: { colourPrimary: CATEGORY_COLORS.events },
    motion_blocks: { colourPrimary: CATEGORY_COLORS.motion },
    looks_blocks: { colourPrimary: CATEGORY_COLORS.looks },
    control_blocks: { colourPrimary: CATEGORY_COLORS.control },
    operators_blocks: { colourPrimary: CATEGORY_COLORS.operators },
    sensing_blocks: { colourPrimary: CATEGORY_COLORS.sensing },
    variables_blocks: { colourPrimary: CATEGORY_COLORS.variables },
    structure_blocks: { colourPrimary: CATEGORY_COLORS.structure },
    content_blocks: { colourPrimary: CATEGORY_COLORS.content },
    style_blocks: { colourPrimary: CATEGORY_COLORS.style },
  },
  categoryStyles: {
    events_category: { colour: CATEGORY_COLORS.events },
    motion_category: { colour: CATEGORY_COLORS.motion },
    looks_category: { colour: CATEGORY_COLORS.looks },
    control_category: { colour: CATEGORY_COLORS.control },
    operators_category: { colour: CATEGORY_COLORS.operators },
    sensing_category: { colour: CATEGORY_COLORS.sensing },
    variables_category: { colour: CATEGORY_COLORS.variables },
    structure_category: { colour: CATEGORY_COLORS.structure },
    content_category: { colour: CATEGORY_COLORS.content },
    style_category: { colour: CATEGORY_COLORS.style },
  },
  fontStyle: { family: 'system-ui, sans-serif', size: 13 },
  componentStyles: {},
});
