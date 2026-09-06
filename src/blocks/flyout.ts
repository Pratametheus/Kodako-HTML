import * as Blockly from 'blockly/core';

/**
 * A vertical toolbox flyout whose block previews always render at 1x, no matter
 * how the main workspace is zoomed. Blockly's stock flyout returns
 * `this.targetWorkspace.scale` from `getFlyoutScale()`, so zooming the canvas
 * blew up the flyout too — see
 * docs/superpowers/specs/2026-09-06-phase-b1-editor-chrome-design.md §4.
 */
export class KodakoVerticalFlyout extends Blockly.VerticalFlyout {
  override getFlyoutScale(): number {
    return 1;
  }
}

/**
 * Make KodakoVerticalFlyout the default vertical-toolbox flyout. Idempotent:
 * registered with `allowOverrides = true`, so calling it once per Blockly
 * install is harmless.
 */
export function registerKodakoFlyout(): void {
  Blockly.registry.register(
    Blockly.registry.Type.FLYOUTS_VERTICAL_TOOLBOX,
    Blockly.registry.DEFAULT,
    KodakoVerticalFlyout,
    true,
  );
}
