import { describe, expect, it, vi } from 'vitest';
import * as Blockly from 'blockly/core';
import { KodakoVerticalFlyout, registerKodakoFlyout } from '../../src/blocks/flyout';

describe('KodakoVerticalFlyout', () => {
  it('reports a fixed 1x flyout scale regardless of the workspace zoom', () => {
    const scale = KodakoVerticalFlyout.prototype.getFlyoutScale.call({
      targetWorkspace: { scale: 2.5 },
    });
    expect(scale).toBe(1);
  });

  it('registers as the default vertical-toolbox flyout, overriding the built-in', () => {
    const spy = vi.spyOn(Blockly.registry, 'register').mockImplementation(() => {});
    registerKodakoFlyout();
    expect(spy).toHaveBeenCalledWith(
      Blockly.registry.Type.FLYOUTS_VERTICAL_TOOLBOX,
      Blockly.registry.DEFAULT,
      KodakoVerticalFlyout,
      true,
    );
    spy.mockRestore();
  });
});
