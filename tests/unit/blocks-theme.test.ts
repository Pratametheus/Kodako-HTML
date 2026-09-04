import { describe, expect, it } from 'vitest';
import { blocklyTheme, CATEGORY_COLORS, spriteTheme } from '../../src/blocks/theme';

const STYLE_NAMES = [
  'events',
  'motion',
  'looks',
  'sound',
  'control',
  'operators',
  'sensing',
  'variables',
  'structure',
  'content',
  'style',
] as const;

describe('Blockly polish theme', () => {
  it('exports one shared registered theme with complete category shades', () => {
    expect(blocklyTheme).toBe(spriteTheme);
    expect(spriteTheme.name).toBe('kodako-sprite');

    for (const name of STYLE_NAMES) {
      expect(spriteTheme.blockStyles[`${name}_blocks`]).toMatchObject({
        colourPrimary: CATEGORY_COLORS[name],
        colourSecondary: expect.stringMatching(/^#[0-9A-F]{6}$/),
        colourTertiary: expect.stringMatching(/^#[0-9A-F]{6}$/),
      });
    }
    expect(spriteTheme.blockStyles.events_blocks?.hat).toBe('cap');
  });

  it('uses the classroom workspace component and font styles', () => {
    expect(spriteTheme.componentStyles).toMatchObject({
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
    });
    expect(spriteTheme.fontStyle).toEqual({
      family: 'system-ui, "Segoe UI", Roboto, sans-serif',
      size: 12,
      weight: '600',
    });
  });
});
