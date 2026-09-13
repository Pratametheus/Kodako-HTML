import { describe, expect, it } from 'vitest';
import { blocklyTheme, CATEGORY_COLORS } from '../../src/blocks/theme';

const STYLE_NAMES = ['structure', 'content', 'style'] as const;

describe('Blockly polish theme', () => {
  it('exports one registered theme with complete category shades', () => {
    expect(blocklyTheme.name).toBe('kodako-html');

    for (const name of STYLE_NAMES) {
      expect(blocklyTheme.blockStyles[`${name}_blocks`]).toMatchObject({
        colourPrimary: CATEGORY_COLORS[name],
        colourSecondary: expect.stringMatching(/^#[0-9A-F]{6}$/),
        colourTertiary: expect.stringMatching(/^#[0-9A-F]{6}$/),
      });
    }
  });

  it('uses the classroom workspace component and font styles', () => {
    expect(blocklyTheme.componentStyles).toMatchObject({
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
    expect(blocklyTheme.fontStyle).toEqual({
      family: 'system-ui, "Segoe UI", Roboto, sans-serif',
      size: 12,
      weight: '600',
    });
  });
});
